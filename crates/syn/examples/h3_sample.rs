//! Runs the H3 bootstrap sample on the Statuz project itself and prints the
//! measured one number plus the hard-coded verdict.
//!
//! Run: `cargo run -p syn --example h3_sample`

use syn::direction::h3_eval::{statuz_bootstrap_sample, summarize};

fn main() {
    let sample = statuz_bootstrap_sample();
    println!();
    println!("=== H3 bootstrap sample (Statuz test bed) ===");
    for p in &sample {
        println!(
            "  [{:44}] trail={}  baseline={:.2}  enriched={:.2}  delta={:+.2}",
            p.task,
            p.trail.join(","),
            p.baseline_rate,
            p.enriched_rate,
            p.delta
        );
    }
    let (avg, verdict) = summarize(&sample);
    println!();
    println!("mean delta = {:.3}", avg);
    println!("verdict    = {:?}", verdict);
    println!("thresholds : supported>=0.7 | falsified<0.4 | else inconclusive");
}