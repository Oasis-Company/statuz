//! Candidate seeding — a rule-based approximation of "where does the graph
//! point next". Honest placeholder for the O2 signal (energy imbalance).
//!
//! Real in-degree is used as a proxy: nodes referenced most are treated as
//! the hottest growth point. This is intentionally a crude signal — the point
//! of the experiment is to see whether even a small signal can grow a usable
//! direction. If H3 fails, that tells us a deeper signal is needed.

use statuz_core::graph::engine::GraphEngine;

use super::carrier::DirectionCarrier;

/// Seed up to `limit` candidate carriers from the hot spots of `graph`.
/// "Hot" here = highest in-degree (most-referenced nodes).
pub fn seed_candidates(g: &GraphEngine, limit: usize) -> Vec<DirectionCarrier> {
    if limit == 0 {
        return Vec::new();
    }
    let mut nodes: Vec<(&str, usize)> = g
        .all_nodes()
        .into_iter()
        .map(|n| {
            let in_deg = g.incoming_edges(&n.id, None).len();
            (n.id.as_str(), in_deg)
        })
        .collect();
    nodes.sort_by(|a, b| b.1.cmp(&a.1)); // most-referenced first
    nodes
        .into_iter()
        .take(limit)
        .enumerate()
        .map(|(i, (id, _deg))| DirectionCarrier {
            id: format!("dc_seed_{}", i),
            intent: format!("探索从 {} 引出的长势", id),
            trail: vec![id.to_string()],
            tension: vec!["（规则信号近似，未验证）".into()],
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use statuz_core::graph::engine::GraphEngine;
    use statuz_core::graph::types::{Edge, Node};
    use statuz_core::Relation;

    fn node(id: &str) -> Node {
        Node {
            id: id.to_string(),
            type_: "test".into(),
            label: id.to_string(),
            status: statuz_core::NodeStatus::Active,
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

    #[test]
    fn seed_picks_most_referenced_nodes_first() {
        // n_hot is referenced by 3 others (in-degree 3); n_cold referenced by 0.
        let mut g = GraphEngine::new();
        for id in ["n_root", "n_hot", "n_cold", "a", "b", "c"] {
            g.add_node(node(id));
        }
        g.add_edge(edge("e1", "a", "n_hot"));
        g.add_edge(edge("e2", "b", "n_hot"));
        g.add_edge(edge("e3", "c", "n_hot"));
        g.add_edge(edge("e4", "n_root", "n_hot"));
        g.add_edge(edge("e5", "n_root", "n_cold"));

        let carriers = seed_candidates(&g, 1);
        assert_eq!(carriers.len(), 1);
        // hottest node is n_hot; its trail must point at it
        assert_eq!(carriers[0].trail, vec!["n_hot".to_string()]);
    }

    #[test]
    fn seed_respects_limit() {
        let mut g = GraphEngine::new();
        for id in ["a", "b", "c"] {
            g.add_node(node(id));
        }
        assert_eq!(seed_candidates(&g, 2).len(), 2);
        assert_eq!(seed_candidates(&g, 0).len(), 0);
    }
}