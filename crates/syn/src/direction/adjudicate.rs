//! Adjudication — the minimal "hand a direction to the user and hear back" channel.
//!
//! This is the first human-in-the-loop step (O3, minimal landing): a carrier is
//! placed in front of the user, they reply with one of four verbs, and the reply
//! is turned into a NEW carrier without mutating the original.
//!
//! Verbs (English + Chinese aliases):
//! - rewrite / 改   → new intent
//! - add    / 加   → append an unresolved tension
//! - reset  / 重置 → replace the evidence trail
//! - adopt  / 采纳 → accept the (enriched) carrier as-is, so it can be written back
//!
//! The escalation valve stays upstream: only a high-uncertainty proposal is ever
//! shown to the user (minimum interruption still holds). `should_hand_to_user`
//! is the concrete gate tying that claim to code.

use super::carrier::DirectionCarrier;
use super::coedit::{add_tension, reset_trail, rewrite_intent};
use super::escalation::{decide, Escalation};

/// Why a prompt could not be turned into a carrier.
#[derive(Debug, Clone, PartialEq)]
pub enum AdjudicationError {
    /// The leading verb was not one of rewrite/add/reset/adopt (or a Chinese alias).
    UnknownCommand(String),
    /// The verb needs a payload but none was given.
    MissingArgument(String),
}

impl core::fmt::Display for AdjudicationError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            AdjudicationError::UnknownCommand(w) => write!(f, "未知裁决词：{w}"),
            AdjudicationError::MissingArgument(v) => write!(f, "裁决词「{v}」缺少内容"),
        }
    }
}

/// Turn the user's reply into a new carrier. Immutable: `carrier` is never changed.
///
/// Grammar: the first whitespace token is the verb, the rest is the payload.
/// For `reset`, the payload is a comma-or-space separated list of trail node ids.
pub fn apply_prompt(carrier: &DirectionCarrier, prompt: &str) -> Result<DirectionCarrier, AdjudicationError> {
    let trimmed = prompt.trim();
    let (verb, payload) = match trimmed.split_once(char::is_whitespace) {
        Some((v, rest)) => (v.trim(), rest.trim()),
        None => (trimmed, ""),
    };

    match verb {
        "rewrite" | "改" => {
            if payload.is_empty() {
                return Err(AdjudicationError::MissingArgument(verb.into()));
            }
            Ok(rewrite_intent(carrier, payload))
        }
        "add" | "加" => {
            if payload.is_empty() {
                return Err(AdjudicationError::MissingArgument(verb.into()));
            }
            Ok(add_tension(carrier, payload))
        }
        "reset" | "重置" => {
            if payload.is_empty() {
                return Err(AdjudicationError::MissingArgument(verb.into()));
            }
            let nodes = payload
                .split(|c: char| c == ',' || c.is_whitespace())
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect();
            Ok(reset_trail(carrier, nodes))
        }
        "adopt" | "采纳" => Ok(carrier.clone()),
        other => Err(AdjudicationError::UnknownCommand(other.into())),
    }
}

/// Concrete gate for the escalation valve: should this proposal be handed to the
/// user at all? True only when uncertainty crosses the threshold (quiet otherwise).
pub fn should_hand_to_user(uncertainty: f64, threshold: f64) -> bool {
    matches!(
        decide(&DirectionCarrier {
            id: String::new(),
            intent: String::new(),
            trail: Vec::new(),
            tension: Vec::new(),
        }, uncertainty, threshold),
        Escalation::EscalateToUser(_)
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn carrier() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "想往 X 走".into(),
            trail: vec!["n_arch".into(), "n_flow".into()],
            tension: vec!["还未决定 A/B".into()],
        }
    }

    #[test]
    fn rewrite_command_returns_new_intent_and_keeps_original() {
        let c = carrier();
        let c2 = apply_prompt(&c, "改 其实我想往 Y 走").expect("valid rewrite");
        assert_eq!(c2.intent, "其实我想往 Y 走");
        assert_eq!(c2.id, c.id);
        assert_eq!(c.intent, "想往 X 走", "original must not change");
    }

    #[test]
    fn english_rewrite_alias_works() {
        let c = carrier();
        let c2 = apply_prompt(&c, "rewrite head to Y").expect("valid rewrite");
        assert_eq!(c2.intent, "head to Y");
    }

    #[test]
    fn add_command_appends_tension() {
        let c = carrier();
        let c2 = apply_prompt(&c, "加 你漏了约束 Z").expect("valid add");
        assert!(c2.tension.contains(&"你漏了约束 Z".into()));
        assert_eq!(c2.tension.len(), 2);
        assert_eq!(c.tension.len(), 1);
    }

    #[test]
    fn reset_command_replaces_trail_from_list() {
        let c = carrier();
        let c2 = apply_prompt(&c, "重置 n_a, n_b n_c").expect("valid reset");
        assert_eq!(c2.trail, vec!["n_a", "n_b", "n_c"]);
        assert_eq!(c.trail.len(), 2);
    }

    #[test]
    fn adopt_returns_the_enriched_carrier_unchanged() {
        let c = carrier();
        let c2 = apply_prompt(&c, "采纳").expect("valid adopt");
        assert_eq!(c2, c);
    }

    #[test]
    fn unknown_verb_is_an_explicit_error_not_silent() {
        let err = apply_prompt(&carrier(), "保存").unwrap_err();
        assert_eq!(err, AdjudicationError::UnknownCommand("保存".into()));
    }

    #[test]
    fn missing_payload_is_an_explicit_error() {
        assert_eq!(
            apply_prompt(&carrier(), "改").unwrap_err(),
            AdjudicationError::MissingArgument("改".into())
        );
        assert_eq!(
            apply_prompt(&carrier(), "重置").unwrap_err(),
            AdjudicationError::MissingArgument("重置".into())
        );
    }

    #[test]
    fn escalation_gate_only_hands_to_user_past_threshold() {
        assert!(should_hand_to_user(0.9, 0.7));
        assert!(!should_hand_to_user(0.2, 0.7));
    }
}