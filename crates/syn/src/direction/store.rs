//! Carrier persistence — a DirectionCarrier as a real node in the graph.
//!
//! Minimal real closed loop for H3: enrich a carrier -> attach it as a graph
//! node -> load it back in the "next session". What survives the roundtrip is
//! what an agent can actually use as a clearer direction context. This replaces
//! the textual reference-rate proxy with an object-level fidelity check.

use std::collections::HashMap;

use statuz_core::graph::engine::GraphEngine;
use statuz_core::graph::types::Node;
use statuz_core::NodeStatus;

use super::carrier::DirectionCarrier;

/// Node type tag for carriers living inside the graph.
pub const CARRIER_NODE_TYPE: &str = "syn:carrier";

/// Metadata keys under which the carrier parts are stored on the node.
const META_INTENT: &str = "intent";
const META_TRAIL: &str = "trail";
const META_TENSION: &str = "tension";

/// Attach a carrier as a real graph node. Returns the node id.
pub fn attach_carrier(g: &mut GraphEngine, c: &DirectionCarrier) -> String {
    let mut meta = HashMap::new();
    meta.insert(META_INTENT.to_string(), c.intent.clone());
    meta.insert(META_TRAIL.to_string(), c.trail.join(","));
    meta.insert(META_TENSION.to_string(), c.tension.join(","));
    g.add_node(Node {
        id: c.id.clone(),
        type_: CARRIER_NODE_TYPE.into(),
        label: c.intent.clone(),
        status: NodeStatus::Active,
        meta: Some(meta),
    });
    c.id.clone()
}

/// Load a carrier back from the graph, if the node is a carrier.
pub fn load_carrier(g: &GraphEngine, id: &str) -> Option<DirectionCarrier> {
    let n = g.get_node(id)?;
    n.meta.as_ref().map(|meta| DirectionCarrier {
        id: n.id.clone(),
        intent: meta.get(META_INTENT).cloned().unwrap_or_default(),
        trail: split_list(meta.get(META_TRAIL).map(String::as_str).unwrap_or("")),
        tension: split_list(meta.get(META_TENSION).map(String::as_str).unwrap_or("")),
    })
}

fn split_list(s: &str) -> Vec<String> {
    if s.is_empty() {
        Vec::new()
    } else {
        s.split(',').map(|x| x.to_string()).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::direction::coedit::{add_tension, rewrite_intent};
    use crate::direction::seed::seed_candidates;
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

    fn sample() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "想往 X 走".into(),
            trail: vec!["n_arch".into(), "n_flow".into()],
            tension: vec!["还未决定 A/B".into()],
        }
    }

    #[test]
    fn carrier_roundtrips_through_graph_without_loss() {
        let mut g = GraphEngine::new();
        attach_carrier(&mut g, &sample());

        let back = load_carrier(&g, "dc_1").expect("carrier should be readable");
        assert_eq!(back.id, "dc_1");
        assert_eq!(back.intent, sample().intent);
        assert_eq!(back.trail, sample().trail);
        assert_eq!(back.tension, sample().tension);
    }

    #[test]
    fn attach_marks_node_as_carrier_and_reads_graph_as_target() {
        let mut g = GraphEngine::new();
        attach_carrier(&mut g, &sample());
        let n = g.get_node("dc_1").expect("node exists");
        assert_eq!(n.type_, "syn:carrier");
        // the carrier's trail is what an agent would follow: nodes must exist
        assert!(load_carrier(&g, "dc_1").is_some());
    }

    #[test]
    fn load_returns_none_for_non_carrier_node() {
        let mut g = GraphEngine::new();
        g.add_node(node("n_plain"));
        assert!(load_carrier(&g, "n_plain").is_none());
        assert!(load_carrier(&g, "n_missing").is_none());
    }

    #[test]
    fn real_syn_loop_enriched_carrier_survives_session_boundary() {
        // A small Statuz-flavoured graph where n_core is the hotspot.
        let mut g = GraphEngine::new();
        for id in ["n_cluster", "n_syn", "n_core", "n_storage", "n_seed", "n_coedit"] {
            g.add_node(node(id));
        }
        // many references converge on n_core (in-degree hotspot)
        g.add_edge(edge("e1", "n_cluster", "n_core"));
        g.add_edge(edge("e2", "n_syn", "n_core"));
        g.add_edge(edge("e3", "n_storage", "n_core"));

        // 1) seed a candidate at the hotspot
        let mut carriers = seed_candidates(&g, 1);
        assert_eq!(carriers.len(), 1);
        let candidate = carriers.remove(0);
        assert_eq!(candidate.trail, vec!["n_core".to_string()]);

        // 2) co-edit (enrich) it — this is the "shared deliberation" step
        let enriched = add_tension(
            &rewrite_intent(&candidate, "把核心目录当成方向，先收敛"),
            "h3 还没严格验证",
        );

        // 3) attach, then load in the "next session"
        attach_carrier(&mut g, &enriched);
        let back = load_carrier(&g, &enriched.id).expect("read back");

        // 4) the session-boundary read-back is still the enriched version.
        assert_eq!(back.intent, "把核心目录当成方向，先收敛");
        assert!(back.tension.contains(&"h3 还没严格验证".into()));
        assert_eq!(back.trail, vec!["n_core".to_string()]);
    }

    #[test]
    fn adjudication_loop_writes_the_shared_decision_back_to_graph() {
        use crate::direction::adjudicate::{apply_prompt, should_hand_to_user};
        use crate::direction::confidence::uncertainty_from;
        use crate::direction::escalation::DEFAULT_ESCALATION_THRESHOLD;

        // A small Statuz-flavoured graph; n_core is the in-degree hotspot.
        let mut g = GraphEngine::new();
        for id in ["n_cluster", "n_syn", "n_core", "n_storage"] {
            g.add_node(node(id));
        }
        g.add_edge(edge("e1", "n_cluster", "n_core"));
        g.add_edge(edge("e2", "n_syn", "n_core"));
        g.add_edge(edge("e3", "n_storage", "n_core"));

        // 1) the system grows a candidate at the hotspot
        let mut carriers = seed_candidates(&g, 1);
        let candidate = carriers.remove(0);

        // 2) the system computes its OWN uncertainty (evidence thickness)
        let u = uncertainty_from(&candidate);
        assert!((0.0..=1.0).contains(&u));

        // 3) at the default, quiet threshold the thin seed self-decides (no interruption)
        assert!(!should_hand_to_user(u, DEFAULT_ESCALATION_THRESHOLD));

        // 4) but a stricter threshold puts the same direction in your hands
        assert!(should_hand_to_user(u, 0.3));

        // 5) the user co-creates on the carrier: rewrite the intent
        let decided = apply_prompt(&candidate, "改 把核心目录当方向，先收敛").expect("valid rewrite");

        // 6) the shared decision is written back into the graph
        attach_carrier(&mut g, &decided);

        // 7) the "next session" reads the decided direction back intact
        let back = load_carrier(&g, &decided.id).expect("decided carrier readable");
        assert_eq!(back.intent, "把核心目录当方向，先收敛");
        assert_eq!(back.trail, candidate.trail); // evidence preserved
    }
}