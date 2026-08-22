//! Uncertainty from evidence thickness — how sure is the system about a direction?
//!
//! Decision (O2, minimal landing): the system computes its own 0..=1 uncertainty
//! from the carrier's support structure, instead of being handed a number from
//! outside. Heuristic and deterministic — this is a starting point, not real
//! semantics. If a deeper signal is needed later, revisit O2 and swap it out.

use std::collections::HashSet;

use super::carrier::DirectionCarrier;

/// Weight of the "unresolved tension" factor in the combined value.
const TENSION_WEIGHT: f64 = 0.1;

/// Deterministic 0..=1 estimate of how uncertain the system is.
///
/// Signals folded in:
/// - `trail` sparsity: fewer distinct supporting nodes → more uncertain
/// - `trail` contradiction: duplicated/self-conflicting evidence raises it
/// - unresolved `tension`: any open challenge raises it a little
pub fn uncertainty_from(c: &DirectionCarrier) -> f64 {
    let total = c.trail.len();
    if total == 0 {
        return 1.0; // nothing to stand on → maximally uncertain
    }
    let distinct = c.trail.iter().collect::<HashSet<&String>>().len();
    let sparsity = 1.0 / (1.0 + distinct as f64);
    let contradiction = (total - distinct) as f64 / total as f64;
    let tension_term = TENSION_WEIGHT * c.tension.len().min(1) as f64;

    (0.6 * sparsity + 0.3 * contradiction + tension_term).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn carrier(trail: Vec<&str>, tension: Vec<&str>) -> DirectionCarrier {
        DirectionCarrier {
            id: "dc".into(),
            intent: "方向".into(),
            trail: trail.into_iter().map(String::from).collect(),
            tension: tension.into_iter().map(String::from).collect(),
        }
    }

    #[test]
    fn empty_trail_is_highly_uncertain() {
        let u = uncertainty_from(&carrier(vec![], vec![]));
        assert!((u - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn thick_consistent_trail_is_still_uncertain_but_low() {
        let thick = uncertainty_from(&carrier(vec!["a", "b", "c", "d", "e"], vec![]));
        let empty = uncertainty_from(&carrier(vec![], vec![]));
        assert!(thick < empty);
        assert!(thick < 0.3, "expected a low value, got {thick}");
    }

    #[test]
    fn self_contradictory_trail_raises_uncertainty_above_consistent() {
        // same 5 slots, but all duplicates → messy, self-conflicting evidence
        let messy = uncertainty_from(&carrier(vec!["a", "a", "a", "a", "a"], vec![]));
        let consistent = uncertainty_from(&carrier(vec!["a", "b", "c", "d", "e"], vec![]));
        assert!(messy > consistent);
    }

    #[test]
    fn unresolved_tension_raises_uncertainty() {
        let with_tension = uncertainty_from(&carrier(vec!["a", "b"], vec!["悬而未决"]));
        let without = uncertainty_from(&carrier(vec!["a", "b"], vec![]));
        assert!(with_tension > without);
    }

    #[test]
    fn output_is_deterministic_and_in_range() {
        let probes = [
            carrier(vec![], vec![]),
            carrier(vec!["a"], vec![]),
            carrier(vec!["a", "b", "c"], vec![]),
            carrier(vec!["a", "a", "a"], vec![]),
            carrier(vec!["a", "b"], vec!["x", "y", "z"]),
        ];
        for p in probes {
            let u1 = uncertainty_from(&p);
            let u2 = uncertainty_from(&p);
            assert_eq!(u1, u2, "determinism violated");
            assert!((0.0..=1.0).contains(&u1), "out of range: {u1}");
        }
    }
}