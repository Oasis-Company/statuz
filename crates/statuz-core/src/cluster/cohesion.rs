//! Field cohesion — Axiom C.
//!
//! Exposes a minimal, falsifiable measure of how much a field's members hold
//! together as one block, WITHOUT prescribing *how* they should cohere (that
//! would be a type ontology). We pick the simplest signal that is easy to
//! falsify: **connected-component coverage** (CCR).
//!
//!   CCR(field) = (#members in the largest connected component)
//!                 / (total #members)
//!
//! - A genuinely connected field (members form one block) → CCR ≈ 1.0.
//! - A field stitched together from unrelated clumps → CCR clearly < 1.0.
//!
//! Higher fraccions mean "this is really one thing". This is soft evidence —
//! measured for *distinguishing power*, not asserted as ground truth.
//!
//! Scope note: cohesion is computed on the *members* a field presents
//! (`Cluster::field_members`), using only internal edges. Bridge edges to other
//! fields are excluded — they speak to boundaries, not internal coherence.

use crate::cluster::Cluster;
use std::collections::HashSet;

/// Connected-component coverage of a field's members as a value in `0..=1`.
/// `None` when the field has no members (nothing to call "one block").
pub fn cohesion(c: &Cluster, field_id: &str) -> Option<f64> {
    let members = c.field_members(field_id);
    if members.is_empty() {
        return None;
    }
    let field = c.fields.get(field_id)?;

    // Build an undirected adjacency over members from the field's internal edges.
    let member_set: HashSet<&str> = members.iter().map(|s| s.as_str()).collect();
    let mut adj: std::collections::HashMap<&str, Vec<&str>> = std::collections::HashMap::new();
    for e in field.graph.all_edges() {
        if e.target_field.is_some() {
            continue; // bridge — external, exclude
        }
        if member_set.contains(e.source.as_str()) && member_set.contains(e.target.as_str()) {
            adj.entry(e.source.as_str())
                .or_default()
                .push(e.target.as_str());
            adj.entry(e.target.as_str())
                .or_default()
                .push(e.source.as_str());
        }
    }

    // Largest connected component via DFS over members.
    let mut visited: HashSet<&str> = HashSet::new();
    let mut largest = 0usize;
    for m in members.iter() {
        let m = m.as_str();
        if visited.contains(m) {
            continue;
        }
        // This member may be isolated (no edges) — still its own component.
        let size = dfs_component(m, &adj, &mut visited);
        if size > largest {
            largest = size;
        }
    }

    Some(largest as f64 / members.len() as f64)
}

fn dfs_component<'a>(
    start: &'a str,
    adj: &std::collections::HashMap<&'a str, Vec<&'a str>>,
    visited: &mut HashSet<&'a str>,
) -> usize {
    let mut stack = vec![start];
    let mut count = 0usize;
    while let Some(n) = stack.pop() {
        if !visited.insert(n) {
            continue;
        }
        count += 1;
        if let Some(neighbors) = adj.get(n) {
            for nb in neighbors {
                if !visited.contains(nb) {
                    stack.push(nb);
                }
            }
        }
    }
    count
}

// ─── Axiom D · Evolution signal ─────────────────────────────

/// Axiom D · Evolution — "when is this field no longer itself".
///
/// A field has drifted / evolved past its working shape when its members no
/// longer hold together as a single block. We emit a single, falsifiable
/// re-divide signal: **cohesion dropped below a threshold**.
///
/// `true` means "this field is worth re-scoping (re-divide)"; it deliberately
/// does NOT perform the re-divide itself (that is a later phase, per design
/// decision C/D). The signal is the trigger for field-lifecycle §3-④.
///
/// `None` when the field has no members or does not exist (nothing to stale).
pub fn needs_redivide(
    c: &Cluster,
    field_id: &str,
    cohesion_threshold: f64,
) -> Option<bool> {
    let score = cohesion(c, field_id)?;
    Some(score < cohesion_threshold)
}

/// Default re-divide threshold (Axiom D). Chosen so that a field whose largest
/// block covers less than two-thirds of its members is *clearly* no longer one
/// thing — e.g. two roughly-equal clumps (0.5) trip it, one dominant block (0.75)
/// does not. Adjustable downstream; the default is only a documented starting point.
pub const DEFAULT_REDIVIDE_THRESHOLD: f64 = 0.67;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cluster::cluster::{Cluster as Cl, Visibility};
    use crate::cluster::field::Field as Fld;
    use crate::graph::types::{Edge, Node, NodeStatus, Relation};
    type Cluster = Cl;

    /// A field whose 3 members form one connected chain a→b→c.
    fn cluster_connected() -> Cluster {
        let mut c = Cluster::new("c".into(), "C".into(), Visibility::Private);
        // register nodes in the central registry
        for id in ["a", "b", "c"] {
            c.nodes.insert(
                id.into(),
                Node {
                    id: id.into(),
                    type_: "domain".into(),
                    label: id.into(),
                    status: NodeStatus::Active,
                    meta: None,
                },
            );
        }
        c.fields.insert("f1".into(), Fld::new("f1".into(), "F".into(), None));
        let field = c.fields.get_mut("f1").unwrap();
        for (s, t, eid) in [("a", "b", "e1"), ("b", "c", "e2")] {
            field.graph.add_edge(Edge {
                id: eid.into(),
                source: s.into(),
                target: t.into(),
                relation: Relation::DependsOn,
                weight: 1.0,
                description: "".into(),
                target_field: None,
                meta: None,
            });
        }
        c
    }

    /// A field whose 4 members split into two disconnected clumps:
    /// a↔b and c↔d, with no edge between the clumps.
    fn cluster_disconnected() -> Cluster {
        let mut c = Cluster::new("c".into(), "C".into(), Visibility::Private);
        for id in ["a", "b", "c", "d"] {
            c.nodes.insert(
                id.into(),
                Node {
                    id: id.into(),
                    type_: "domain".into(),
                    label: id.into(),
                    status: NodeStatus::Active,
                    meta: None,
                },
            );
        }
        c.fields.insert("f1".into(), Fld::new("f1".into(), "F".into(), None));
        let field = c.fields.get_mut("f1").unwrap();
        for (s, t, eid) in [("a", "b", "e1"), ("c", "d", "e2")] {
            field.graph.add_edge(Edge {
                id: eid.into(),
                source: s.into(),
                target: t.into(),
                relation: Relation::DependsOn,
                weight: 1.0,
                description: "".into(),
                target_field: None,
                meta: None,
            });
        }
        c
    }

    #[test]
    fn connected_field_has_full_cohesion() {
        let c = cluster_connected();
        let score = cohesion(&c, "f1").unwrap();
        assert_eq!(score, 1.0, "single connected block => CCR 1.0");
    }

    #[test]
    fn disconnected_field_scores_lower() {
        let c = cluster_disconnected();
        let score = cohesion(&c, "f1").unwrap();
        // largest component = {a,b} size 2 of 4 members => 0.5
        assert!((score - 0.5).abs() < 1e-9, "expected 0.5, got {}", score);
    }

    #[test]
    fn empty_field_has_no_cohesion() {
        let c = Cluster::new("c".into(), "C".into(), Visibility::Private);
        assert!(cohesion(&c, "f1").is_none());
    }

    #[test]
    fn unknown_field_has_no_cohesion() {
        let c = cluster_connected();
        assert!(cohesion(&c, "ghost").is_none());
    }

    // ─── Axiom D · evolution signal tests ───────────────────

    #[test]
    fn healthy_field_does_not_need_redivide() {
        let c = cluster_connected(); // CCR = 1.0
        assert_eq!(
            needs_redivide(&c, "f1", DEFAULT_REDIVIDE_THRESHOLD),
            Some(false),
            "a single connected block is not stale"
        );
    }

    #[test]
    fn disconnected_field_needs_redivide() {
        let c = cluster_disconnected(); // CCR = 0.5
        assert_eq!(
            needs_redivide(&c, "f1", DEFAULT_REDIVIDE_THRESHOLD),
            Some(true),
            "a field split into two clumps should trip the re-divide signal"
        );
    }

    #[test]
    fn evolution_is_a_movable_observation_not_a_frozen_label() {
        // The SAME field object crosses from healthy to stale as edges change —
        // the evolution signal is emitted against the current topology, proving
        // it responds to the field actually drifting, not to a stored opinion.
        // Scaffold: a 5-node chain a→b→c→d→e as the main block.
        let mut c = Cluster::new("c".into(), "C".into(), Visibility::Private);
        for id in ["a", "b", "c", "d", "e"] {
            c.nodes.insert(
                id.into(),
                Node {
                    id: id.into(),
                    type_: "domain".into(),
                    label: id.into(),
                    status: NodeStatus::Active,
                    meta: None,
                },
            );
        }
        c.fields.insert("f1".into(), Fld::new("f1".into(), "F".into(), None));
        let field = c.fields.get_mut("f1").unwrap();
        let chain = [("a", "b", "e1"), ("b", "c", "e2"), ("c", "d", "e3"), ("d", "e", "e4")];
        for (s, t, eid) in chain {
            field.graph.add_edge(Edge {
                id: eid.into(),
                source: s.into(),
                target: t.into(),
                relation: Relation::DependsOn,
                weight: 1.0,
                description: "".into(),
                target_field: None,
                meta: None,
            });
        }
        assert_eq!(
            needs_redivide(&c, "f1", DEFAULT_REDIVIDE_THRESHOLD),
            Some(false),
            "a single 5-node block is healthy"
        );

        // Attach ONE unrelated clump f↔g → 5/7 = 0.71, still dominant → healthy.
        for id in ["f", "g"] {
            c.nodes.insert(
                id.into(),
                Node {
                    id: id.into(),
                    type_: "domain".into(),
                    label: id.into(),
                    status: NodeStatus::Active,
                    meta: None,
                },
            );
        }
        let field = c.fields.get_mut("f1").unwrap();
        field.graph.add_edge(Edge {
            id: "e5".into(),
            source: "f".into(),
            target: "g".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: "".into(),
            target_field: None,
            meta: None,
        });
        assert_eq!(
            needs_redivide(&c, "f1", DEFAULT_REDIVIDE_THRESHOLD),
            Some(false),
            "5/7 = 0.71 block is still the dominant thing, not stale"
        );

        // Attach a SECOND clump h↔i → 5/9 = 0.56: the original block is no
        // longer "the field"; it has genuinely drifted into several clumps.
        for id in ["h", "i"] {
            c.nodes.insert(
                id.into(),
                Node {
                    id: id.into(),
                    type_: "domain".into(),
                    label: id.into(),
                    status: NodeStatus::Active,
                    meta: None,
                },
            );
        }
        let field = c.fields.get_mut("f1").unwrap();
        field.graph.add_edge(Edge {
            id: "e6".into(),
            source: "h".into(),
            target: "i".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: "".into(),
            target_field: None,
            meta: None,
        });
        assert_eq!(
            needs_redivide(&c, "f1", DEFAULT_REDIVIDE_THRESHOLD),
            Some(true),
            "once the main block covers 5/9, the field has genuinely drifted"
        );
    }

    #[test]
    fn empty_or_unknown_field_has_no_evolution_signal() {
        let c = Cluster::new("c".into(), "C".into(), Visibility::Private);
        assert_eq!(needs_redivide(&c, "f1", 0.67), None);
        let c2 = cluster_connected();
        assert_eq!(needs_redivide(&c2, "ghost", 0.67), None);
    }
}