//! DirectionCarrier — a shared, graph-addressable representation of direction.
//!
//! "Direction" is not a score to align to (known/unknown boolean), but an
//! object that both human and agent can place, observe, infer, and rewrite.
//! It never answers "is this right"; it answers "can this be deepened".
//!
//! This is a Representation-layer primitive, owned by `syn`, not the kernel.

use serde::{Deserialize, Serialize};

/// A jointly-authored direction. Always three parts:
/// - `intent`   — "which way we want to go", human-readable, rewritable
/// - `trail`    — the graph paths supporting it (evidence we can point to)
/// - `tension`  — what is unresolved / challengeable (where co-creation opens)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectionCarrier {
    pub id: String,
    pub intent: String,
    /// Graph node ids that support this direction's trail.
    pub trail: Vec<String>,
    /// Unresolved or challengeable points.
    pub tension: Vec<String>,
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
    fn carrier_carries_all_three_parts() {
        let c = sample();
        assert_eq!(c.id, "dc_1");
        assert_eq!(c.intent, "想往 X 走");
        assert_eq!(c.trail.len(), 2);
        assert_eq!(c.tension.len(), 1);
    }

    #[test]
    fn carrier_roundtrips_msgpack() {
        let c = sample();
        let bytes = rmp_serde::to_vec(&c).expect("serialize DirectionCarrier");
        let back: DirectionCarrier = rmp_serde::from_slice(&bytes).expect("deserialize DirectionCarrier");
        assert_eq!(c.id, back.id);
        assert_eq!(c.intent, back.intent);
        assert_eq!(c, back);
    }
}