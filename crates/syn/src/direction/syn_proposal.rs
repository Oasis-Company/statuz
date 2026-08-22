//! DirectionProposal — a direction-level proposal that carries a shared
//! DirectionCarrier plus the system's own uncertainty.
//!
//! This is the Representation-layer answer to the kernel's action-level
//! `merge_strategy` (whose ownership is open as O4). A proposal says WHICH
//! direction, HOW unsure the system is, and its review status — NOT "how to
//! merge" (that is a downstream execution concern, deliberately absent here).

use serde::{Deserialize, Serialize};

use super::carrier::DirectionCarrier;

/// Review status of a direction proposal.
///
/// Deliberately a local enum, NOT the kernel's `SynStatus`: the ownership of
/// the kernel Syn types is unruled (O4). We do not couple to them until O4 is
/// decided. Semantics mirror the sunk `Draft→UnderReview→Approved` ordering.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum DirectionStatus {
    Proposed,
    UnderReview,
    Accepted,
}

/// A direction-level proposal: a carrier + how unsure we are + status.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectionProposal {
    pub carrier: DirectionCarrier,
    /// 0..=1 — how uncertain the system is about this direction.
    /// This is the explicit "we are not sure" channel that feeds escalation.
    pub uncertainty: f64,
    pub status: DirectionStatus,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn enriched() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "把核心目录当成方向，先收敛".into(),
            trail: vec!["n_core".into()],
            tension: vec!["h3 还没严格验证".into()],
        }
    }

    #[test]
    fn proposal_carries_carrier_and_uncertainty() {
        let p = DirectionProposal {
            carrier: enriched(),
            uncertainty: 0.8,
            status: DirectionStatus::Proposed,
        };
        assert_eq!(p.carrier.intent, "把核心目录当成方向，先收敛");
        assert_eq!(p.uncertainty, 0.8);
        assert_eq!(p.status, DirectionStatus::Proposed);
    }

    #[test]
    fn proposal_roundtrips_msgpack() {
        let p = DirectionProposal {
            carrier: enriched(),
            uncertainty: 0.6,
            status: DirectionStatus::UnderReview,
        };
        let bytes = rmp_serde::to_vec(&p).expect("serialize DirectionProposal");
        let back: DirectionProposal =
            rmp_serde::from_slice(&bytes).expect("deserialize DirectionProposal");
        assert_eq!(p, back);
    }

    #[test]
    fn proposal_carries_h3_enriched_carrier() {
        // The H3 object-level loop's enriched carrier is reusable as-is here.
        let p = DirectionProposal {
            carrier: enriched(), // rewritten intent + added tension survives
            uncertainty: 0.3,
            status: DirectionStatus::Proposed,
        };
        assert!(p.carrier.tension.contains(&"h3 还没严格验证".to_string()));
        assert!(!p.carrier.trail.is_empty());
    }
}