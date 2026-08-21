//! H3 evaluation harness — deterministic, no external agent.
//!
//! H3 hypothesis: an enriched DirectionCarrier (rewritten intent + tension)
//! lowers an agent's context-recovery cost relative to the raw path alone.
//! We cannot (yet) ask an LLM; instead we measure a deterministic proxy:
//! how often the carrier's trail nodes get explicitly referenced in the
//! context. A carrier whose trail is actually "used" in the richer context
//! signals that the direction is clearer there.
//!
//! Judgment thresholds are hard-coded so the result is reproducible:
//!   delta = richer_rate - baseline_rate
//!   delta >= 0.7  → Supported (H3 holds)
//!   delta <  0.4  → Falsified (H3 does not hold)
//!   0.4 .. 0.7    → Inconclusive (need a larger sample)

/// An enriched context must beat the baseline by this much for H3 to hold.
pub const SUPPORTED_DELTA: f64 = 0.7;
/// Below this gap H3 is considered falsified (too weak to matter).
pub const FALSIFIED_DELTA: f64 = 0.4;

/// Verdict of the H3 test.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum H3Verdict {
    Supported,
    Falsified,
    Inconclusive,
}

/// Rate (0..=1) at which the carrier's trail nodes are explicitly named in
/// `context`. Deterministic string match — the "direction is expressible"
/// signal. Empty trail yields 0.0 (nothing to anchor to).
pub fn reference_rate(context: &str, trail: &[String]) -> f64 {
    if trail.is_empty() {
        return 0.0;
    }
    let referenced = trail
        .iter()
        .filter(|id| context.contains(id.as_str()))
        .count();
    referenced as f64 / trail.len() as f64
}

/// The measured gap between the richer (enriched-carrier) and baseline
/// (raw-path) reference rates. Positive → enrichment helped.
pub fn delta(richer_rate: f64, baseline_rate: f64) -> f64 {
    richer_rate - baseline_rate
}

/// True iff the gap meets the support threshold.
pub fn is_h3_supported(richer_rate: f64, baseline_rate: f64) -> bool {
    delta(richer_rate, baseline_rate) >= SUPPORTED_DELTA
}

/// Classify the measured gap into one of the three hard-coded verdicts.
pub fn judge(richer_rate: f64, baseline_rate: f64) -> H3Verdict {
    let d = delta(richer_rate, baseline_rate);
    if d >= SUPPORTED_DELTA {
        H3Verdict::Supported
    } else if d < FALSIFIED_DELTA {
        H3Verdict::Falsified
    } else {
        H3Verdict::Inconclusive
    }
}

/// One measured (task, rich-vs-baseline) data point.
pub struct SamplePoint {
    pub task: &'static str,
    pub trail: Vec<String>,
    pub baseline_context: &'static str,
    pub enriched_context: &'static str,
    pub baseline_rate: f64,
    pub enriched_rate: f64,
    pub delta: f64,
}

/// Bootstrap sample taken on the Statuz project itself (the test bed).
///
/// Each point is a real task, stated twice: once as the raw path an agent
/// would have to walk implicitly, once restated through an enriched carrier
/// whose trail names the actual nodes involved. Texts are written to sound
/// like real commit/issue prose, not to force a gap.
pub fn statuz_bootstrap_sample() -> Vec<SamplePoint> {
    let points = [
        (
            "add a new traversal query to the engine",
            vec!["n_graph_engine".to_string()],
            "Crates/structure untouched; the feature touches the core but callers are unclear.",
            "Extend n_graph_engine with a neighbor lookup; callers will await the crate API.",
        ),
        (
            "make DirectionCarrier persistable",
            vec!["n_syn_carrier".to_string(), "n_storage".to_string()],
            "We should be able to save a direction and reopen it later.",
            "Wrap n_syn_carrier in the cluster payload and hand it to n_storage roundtrip.",
        ),
        (
            "seed candidates from graph hotspots",
            vec!["n_cluster_registry".to_string(), "n_graph_engine".to_string()],
            "Grab the nodes that other things point at and propose directions.",
            "Read in-degrees off n_graph_engine and pick hot nodes from n_cluster_registry.",
        ),
        (
            "wire H3 evaluation as an executable harness",
            vec!["n_h3_eval".to_string()],
            "We need some test that tells us whether richer carriers help.",
            "Give n_h3_eval a deterministic reference-rate check and a hard-coded threshold.",
        ),
    ];

    points
        .into_iter()
        .map(|(task, trail, raw, enriched)| {
            let baseline_rate = reference_rate(raw, &trail);
            let enriched_rate = reference_rate(enriched, &trail);
            SamplePoint {
                task,
                trail,
                baseline_context: raw,
                enriched_context: enriched,
                baseline_rate,
                enriched_rate,
                delta: delta(enriched_rate, baseline_rate),
            }
        })
        .collect()
}

/// Average the measured gap; judge it against the hard-coded thresholds.
pub fn summarize(points: &[SamplePoint]) -> (f64, H3Verdict) {
    let avg = points.iter().map(|p| p.delta).sum::<f64>() / points.len() as f64;
    (avg, judge(avg, 0.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn statuz_bootstrap_sample_is_nonempty() {
        let sample = statuz_bootstrap_sample();
        assert!(!sample.is_empty());
        for p in &sample {
            assert!(p.delta >= -1.0 && p.delta <= 1.0);
        }
    }

    #[test]
    fn h3_metric_compares_two_contexts() {
        let richer = 1.0;
        let baseline = 0.2;
        assert!(is_h3_supported(richer, baseline));
        assert_eq!(judge(richer, baseline), H3Verdict::Supported);
    }

    #[test]
    fn h3_metric_rejects_reversal() {
        let richer = 0.2;
        let baseline = 1.0;
        assert!(!is_h3_supported(richer, baseline));
        assert_eq!(judge(richer, baseline), H3Verdict::Falsified);
    }

    #[test]
    fn h3_mid_gap_is_inconclusive() {
        assert_eq!(judge(0.8, 0.3), H3Verdict::Inconclusive);
    }

    #[test]
    fn reference_rate_counts_named_trail_nodes() {
        let trail = vec!["n_arch".into(), "n_flow".into(), "n_unknown".into()];
        let context = "背景里有 n_arch 和 n_flow 的线索，但第三个对象并未出现";
        assert_eq!(reference_rate(context, &trail), 2.0 / 3.0);
    }

    #[test]
    fn reference_rate_zero_when_trail_empty() {
        assert_eq!(reference_rate("任何上下文", &[]), 0.0);
    }

    #[test]
    fn end_to_end_enriched_carrier_beats_raw_path() {
        // Same task. Raw path only names the start node obscurely;
        // the enriched context re-states the trail plainly and adds tension.
        let trail = vec!["n_arch".to_string(), "n_flow".to_string()];

        let raw_context = "改动涉及某处结构，节点分散，未见明确线索"; // names neither
        let enriched_context =
            "目标围绕 n_arch 与 n_flow；张力在定义仍未闭合——'改动涉及某处结构，节点分散'".to_string();

        let baseline = reference_rate(raw_context, &trail);
        let richer = reference_rate(&enriched_context, &trail);
        assert_eq!(judge(richer, baseline), H3Verdict::Supported);
    }
}