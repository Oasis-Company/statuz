//! Co-edit operations — the human side of co-creation.
//!
//! A direction is not confirmed or rejected; it is deepened. The human can
//! rewrite the intent, add an unresolved tension, or reset the evidence trail.
//! All ops are immutable: they return a NEW carrier and never mutate the input.

use super::carrier::DirectionCarrier;

/// Rewrite the intent of a carrier, returning a new carrier.
pub fn rewrite_intent(c: &DirectionCarrier, new_intent: &str) -> DirectionCarrier {
    DirectionCarrier {
        intent: new_intent.into(),
        ..c.clone()
    }
}

/// Append an unresolved point to a carrier's tension, returning a new carrier.
pub fn add_tension(c: &DirectionCarrier, t: &str) -> DirectionCarrier {
    let mut tension = c.tension.clone();
    tension.push(t.into());
    DirectionCarrier { tension, ..c.clone() }
}

/// Replace the evidence trail of a carrier, returning a new carrier.
pub fn reset_trail(c: &DirectionCarrier, new_trail: Vec<String>) -> DirectionCarrier {
    DirectionCarrier {
        trail: new_trail,
        ..c.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "想往 X 走".into(),
            trail: vec!["n_arch".into(), "n_flow".into()],
            tension: vec!["还未决定 A/B".into()],
        }
    }

    #[test]
    fn rewrite_intent_returns_new_carrier() {
        let c = sample();
        let c2 = rewrite_intent(&c, "其实我想往 Y 走");
        assert_eq!(c2.intent, "其实我想往 Y 走");
        assert_eq!(c2.id, c.id); // 浅拷贝：id/trail/tension 保留
        assert_ne!(c.intent, c2.intent); // 不可变：返回新实体，不改原载子
        assert_eq!(c.intent, "想往 X 走"); // 原载子不动
    }

    #[test]
    fn add_tension_appends_unresolved_point() {
        let c = sample();
        let c2 = add_tension(&c, "你漏了约束 Z");
        assert!(c2.tension.contains(&"你漏了约束 Z".into()));
        assert_eq!(c2.tension.len(), 2);
        assert_eq!(c.tension.len(), 1); // 原载子不动
    }

    #[test]
    fn reset_trail_replaces_evidence() {
        let c = sample();
        let c2 = reset_trail(&c, vec!["n_new".into()]);
        assert_eq!(c2.trail, vec!["n_new"]);
        assert_eq!(c.trail.len(), 2); // 原载子不动
    }
}