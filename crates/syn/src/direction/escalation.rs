//! Escalation valve — the minimal "uncertain → hand back to user" gate.
//!
//! The system does not decide whether a direction is "wrong". Instead, when
//! its own uncertainty crosses a configurable threshold, it escalates the
//! proposal back to the user (co-creation happens on the carrier). Below the
//! threshold it self-decides without disturbing the user (minimum-interruption
//! first).

use super::carrier::DirectionCarrier;
use super::syn_proposal::DirectionStatus;

/// Default escalation threshold. Only an uncertainty at/above this value
/// disturbs the user — this is the minimum-interruption landing point.
pub const DEFAULT_ESCALATION_THRESHOLD: f64 = 0.7;

/// Outcome of running a proposal through the escalation valve.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Escalation {
    /// Uncertainty is low enough — the system proceeds on its own.
    SystemSelfDecide,
    /// Uncertainty is high — hand the proposal back for a human review.
    EscalateToUser(DirectionStatus),
}

/// Run the valve. `uncertainty` is expected in 0..=1; the threshold is the
/// caller's (defaults available via [`DEFAULT_ESCALATION_THRESHOLD`]).
pub fn decide(
    _carrier: &DirectionCarrier,
    uncertainty: f64,
    threshold: f64,
) -> Escalation {
    if uncertainty >= threshold {
        Escalation::EscalateToUser(DirectionStatus::UnderReview)
    } else {
        Escalation::SystemSelfDecide
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn carrier() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "方向".into(),
            trail: vec!["n_core".into()],
            tension: vec!["?".to_string()],
        }
    }

    #[test]
    fn high_uncertainty_escalates_to_user() {
        assert_eq!(
            decide(&carrier(), 0.9, DEFAULT_ESCALATION_THRESHOLD),
            Escalation::EscalateToUser(DirectionStatus::UnderReview)
        );
    }

    #[test]
    fn low_uncertainty_self_decides_without_disturbance() {
        assert_eq!(
            decide(&carrier(), 0.2, DEFAULT_ESCALATION_THRESHOLD),
            Escalation::SystemSelfDecide
        );
    }

    #[test]
    fn boundary_is_configurable() {
        // Tune threshold; same uncertainty flips the gate.
        assert_eq!(decide(&carrier(), 0.5, 0.5), Escalation::EscalateToUser(DirectionStatus::UnderReview));
        assert_eq!(decide(&carrier(), 0.5, 0.51), Escalation::SystemSelfDecide);
    }

    #[test]
    fn default_threshold_favors_quiet() {
        assert!(DEFAULT_ESCALATION_THRESHOLD >= 0.5);
    }
}