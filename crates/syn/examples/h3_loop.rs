//! Minimal real closed loop for H3, run on a Statuz-shaped graph.
//!
//! For a set of real tasks we: seed a candidate at the graph hotspot -> enrich
//! it via co-edit -> attach it as a graph node -> load it back in the "next
//! session" and check the enriched state survived intact (object-level
//! fidelity). This is the stronger H3 metric the textual reference-rate proxy
//! could not provide: it measures whether a shared, enriched direction is
//! actually recoverable across a session boundary.
//!
//! Run: `cargo run -p syn --example h3_loop`

use syn::direction::carrier::DirectionCarrier;
use syn::direction::coedit::{add_tension, rewrite_intent};
use syn::direction::h3_eval::reference_rate;
use syn::direction::seed::seed_candidates;
use syn::direction::store;

use statuz_core::graph::engine::GraphEngine;
use statuz_core::graph::types::{Edge, Node};
use statuz_core::{NodeStatus, Relation};

fn node(id: &str) -> Node {
    Node {
        id: id.to_string(),
        type_: "test".into(),
        label: id.to_string(),
        status: NodeStatus::Active,
        meta: None,
    }
}

fn edge(id: &str, src: &str, dst: &str) -> Edge {
    Edge {
        id: id.to_string(),
        source: src.to_string(),
        target: dst.to_string(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: String::new(),
        target_field: None,
        meta: None,
    }
}

fn main() {
    // Statuz-shaped module graph; n_graph_engine ends up the hotspot.
    let mut g = GraphEngine::new();
    for id in [
        "n_core_types", "n_graph_engine", "n_cluster", "n_syn_carrier",
        "n_h3_eval", "n_seed", "n_store", "n_storage", "n_coedit",
    ] {
        g.add_node(node(id));
    }
    let deps = [
        ("n_cluster", "n_graph_engine"),
        ("n_syn_carrier", "n_graph_engine"),
        ("n_seed", "n_graph_engine"),
        ("n_store", "n_graph_engine"),
        ("n_h3_eval", "n_syn_carrier"),
    ];
    for (i, (a, b)) in deps.iter().enumerate() {
        g.add_edge(edge(&format!("e{i}"), a, b));
    }

    // Real tasks: each enriches its seeded candidate into an intentional one.
    let intents = [
        "让引擎支持跨集群的方向回读", "把载子做成可触碰的图节点", "从热点长出一个可用方向",
    ];
    let pushes = ["h3 证据不够，先按对象级保真", "O2 仍用 in-degree 占位", "少打扰为先"];

    println!("=== H3 minimal real closed loop (Statuz-shaped graph) ===");
    println!("hotspot node: n_graph_engine (in-degree 4)\n");
    println!("{:46} | trail   | enrich survived", "");
    let mut checked = 0usize;
    let mut survived = 0usize;
    for (task_id, (intent, push)) in intents.iter().zip(pushes.iter()).enumerate() {
        let mut candidates = seed_candidates(&g, 1);
        let base = candidates.remove(0);
        let enriched = add_tension(&rewrite_intent(&base, intent), push);
        let id = store::attach_carrier(&mut g, &enriched);
        let back: DirectionCarrier = store::load_carrier(&g, &id).unwrap();
        let ok = back.intent == *intent
            && back.trail == enriched.trail
            && back.tension.contains(&push.to_string());
        checked += 1;
        survived += usize::from(ok);
        // cross-check: the read-back carrier is resolvable in a fresh context
        let fresh = format!("{}（{}）", back.intent, back.trail.join(","));
        let resolvable = reference_rate(&fresh, &back.trail);
        println!(
            "  task-{task_id}: {intent:44} | {:12} | {} (resolvable {:.0}%)",
            back.trail.join(","), if ok { "FULL " } else { "LOST " }, resolvable * 100.0
        );
    }
    let fidelity = survived as f64 / checked as f64;
    println!();
    println!("enriched-state fidelity = {:.3} ({survived}/{checked})", fidelity);
    println!("verdict    : {}", if fidelity >= 0.7 { "Supported (object-level)" } else { "weak" });
    println!("note       : object-level roundtrip, not an LLM agent yet");
}