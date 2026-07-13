use std::collections::{HashMap, VecDeque, HashSet};
use crate::graph::types::*;
use crate::graph::engine::GraphEngine;

impl GraphEngine {
    /// Q1: "What does this node connect to?"
    /// Traverse from a node following a relation (or all relations).
    /// If `cross_field` is true, also follows bridge edges to other fields.
    pub fn traverse(&self, from: &NodeId, relation: Option<&str>, cross_field: bool) -> (Vec<NodeId>, Vec<&Edge>) {
        let cell = match self.adj.get(from) {
            Some(c) => c,
            None => return (vec![], vec![]),
        };

        let mut edges: Vec<&Edge> = Vec::new();
        let mut seen = HashSet::new();

        if let Some(rel) = relation {
            if let Some(rel_edges) = cell.outgoing.get(rel) {
                for e in rel_edges {
                    if cross_field || e.target_field.is_none() {
                        edges.push(e);
                        seen.insert(e.target.clone());
                    }
                }
            }
        } else {
            for (_, rel_edges) in &cell.outgoing {
                for e in rel_edges {
                    if cross_field || e.target_field.is_none() {
                        edges.push(e);
                        seen.insert(e.target.clone());
                    }
                }
            }
        }

        let nodes: Vec<NodeId> = seen.into_iter().collect();
        (nodes, edges)
    }

    /// Q2: "If this node changes, who is affected?"
    /// Reverse BFS — find all nodes that depend on the changed node (transitively).
    pub fn impact(&self, changed: &NodeId) -> ImpactResult {
        let cell = match self.adj.get(changed) {
            Some(c) => c,
            None => return ImpactResult {
                changed: changed.clone(),
                affected: vec![],
                blast_radius: vec![],
                critical_path: false,
            },
        };

        let mut affected: Vec<NodeId> = Vec::new();
        let mut visited = HashSet::new();
        let mut queue: VecDeque<NodeId> = VecDeque::new();

        // Start from all nodes that directly point to `changed`
        for (_, edges) in &cell.incoming {
            for e in edges {
                if !visited.contains(&e.source) {
                    visited.insert(e.source.clone());
                    queue.push_back(e.source.clone());
                }
            }
        }
        affected.extend(queue.iter().cloned());

        // BFS: who depends on those who depend on `changed`?
        while let Some(current) = queue.pop_front() {
            if let Some(current_cell) = self.adj.get(&current) {
                for (_, edges) in &current_cell.incoming {
                    for e in edges {
                        if !visited.contains(&e.source) {
                            visited.insert(e.source.clone());
                            queue.push_back(e.source.clone());
                            affected.push(e.source.clone());
                        }
                    }
                }
            }
        }

        // Critical path check: node on a high-centrality path?
        let centrality = self.centrality(5);
        let critical_path = centrality.iter().any(|id| id == changed);

        ImpactResult {
            changed: changed.clone(),
            affected: {
                affected.sort();
                affected.dedup();
                affected.retain(|id| id != changed);
                affected
            },
            blast_radius: vec![],
            critical_path,
        }
    }

    /// Q3: "How do I get from A to B?"
    /// BFS shortest path through the graph.
    /// If `cross_field` is true, follows bridge edges across fields.
    pub fn path(&self, from: &NodeId, to: &NodeId, cross_field: bool) -> PathResult {
        if from == to {
            return PathResult {
                from: from.clone(),
                to: to.clone(),
                path: vec![],
                field_path: vec![],
                length: 0,
                exists: true,
            };
        }

        if !self.nodes.contains_key(from) || !self.nodes.contains_key(to) {
            return PathResult {
                from: from.clone(),
                to: to.clone(),
                path: vec![],
                field_path: vec![],
                length: -1,
                exists: false,
            };
        }

        let mut visited = HashSet::new();
        visited.insert(from.clone());
        let mut parent: HashMap<NodeId, (NodeId, Edge)> = HashMap::new();
        let mut queue: VecDeque<NodeId> = VecDeque::new();
        queue.push_back(from.clone());

        'bfs: while let Some(current) = queue.pop_front() {
            if current == *to {
                break;
            }

            if let Some(cell) = self.adj.get(&current) {
                for (_, edges) in &cell.outgoing {
                    for e in edges {
                        if cross_field || e.target_field.is_none() {
                            if !visited.contains(&e.target) {
                                visited.insert(e.target.clone());
                                parent.insert(e.target.clone(), (current.clone(), e.clone()));
                                queue.push_back(e.target.clone());
                                if e.target == *to {
                                    break 'bfs;
                                }
                            }
                        }
                    }
                }
            }
        }

        if !parent.contains_key(to) {
            return PathResult {
                from: from.clone(),
                to: to.clone(),
                path: vec![],
                field_path: vec![],
                length: -1,
                exists: false,
            };
        }

        // Reconstruct path
        let mut path: Vec<Edge> = Vec::new();
        let mut current = to.clone();
        while let Some((prev, edge)) = parent.get(&current) {
            path.push(edge.clone());
            current = prev.clone();
            if current == *from {
                break;
            }
        }
        path.reverse();

        PathResult {
            from: from.clone(),
            to: to.clone(),
            path,
            field_path: vec![],
            length: path.len() as i32,
            exists: true,
        }
    }

    // ─── Graph Algorithms ────────────────────────────────

    /// Degree centrality — simplest measure of importance.
    /// Returns nodes sorted by total degree (in + out), descending.
    pub fn centrality(&self, limit: usize) -> Vec<NodeId> {
        let mut scores: HashMap<NodeId, usize> = HashMap::new();

        for (id, cell) in &self.adj {
            let mut degree = 0;
            for (_, edges) in &cell.outgoing {
                degree += edges.len();
            }
            for (_, edges) in &cell.incoming {
                degree += edges.len();
            }
            scores.insert(id.clone(), degree);
        }

        let mut sorted: Vec<(NodeId, usize)> = scores.into_iter().collect();
        sorted.sort_by(|a, b| b.1.cmp(&a.1));
        sorted.truncate(limit);
        sorted.into_iter().map(|(id, _)| id).collect()
    }

    /// Transitive closure: get ALL nodes reachable from `id` (BFS)
    pub fn reachable(&self, from: &NodeId) -> Vec<NodeId> {
        let mut visited = HashSet::new();
        visited.insert(from.clone());
        let mut queue: VecDeque<NodeId> = VecDeque::new();
        queue.push_back(from.clone());

        while let Some(current) = queue.pop_front() {
            if let Some(cell) = self.adj.get(&current) {
                for (_, edges) in &cell.outgoing {
                    for e in edges {
                        if !visited.contains(&e.target) {
                            visited.insert(e.target.clone());
                            queue.push_back(e.target.clone());
                        }
                    }
                }
            }
        }

        visited.remove(from);
        visited.into_iter().collect()
    }

    // ─── Health ───────────────────────────────────────────

    pub fn health(&self) -> HealthReport {
        let mut orphans = Vec::new();
        let mut sinks = Vec::new();
        let mut sources = Vec::new();

        for (id, cell) in &self.adj {
            let mut out_count = 0;
            let mut in_count = 0;
            for (_, e) in &cell.outgoing { out_count += e.len(); }
            for (_, e) in &cell.incoming { in_count += e.len(); }

            if out_count == 0 && in_count == 0 {
                orphans.push(id.clone());
            } else if out_count > 0 && in_count == 0 {
                sources.push(id.clone());
            } else if out_count == 0 && in_count > 0 {
                sinks.push(id.clone());
            }
        }

        let top = self.centrality(5);

        // Count disconnected components via BFS
        let all_nodes: Vec<NodeId> = self.nodes.keys().cloned().collect();
        let mut component_visited = HashSet::new();
        let mut components = 0;

        for id in &all_nodes {
            if !component_visited.contains(id) {
                components += 1;
                let mut q = VecDeque::new();
                q.push_back(id.clone());
                component_visited.insert(id.clone());
                while let Some(cur) = q.pop_front() {
                    if let Some(cell) = self.adj.get(&cur) {
                        for (_, edges) in &cell.outgoing {
                            for e in edges {
                                if !component_visited.contains(&e.target) {
                                    component_visited.insert(e.target.clone());
                                    q.push_back(e.target.clone());
                                }
                            }
                        }
                        for (_, edges) in &cell.incoming {
                            for e in edges {
                                if !component_visited.contains(&e.source) {
                                    component_visited.insert(e.source.clone());
                                    q.push_back(e.source.clone());
                                }
                            }
                        }
                    }
                }
            }
        }

        HealthReport {
            total_nodes: self.nodes.len(),
            total_edges: self.edges.len(),
            orphans,
            sinks,
            sources,
            high_centrality: top,
            disconnected_components: components,
        }
    }
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Build a test graph:
    ///   a ──self──> a   (self-loop, "depends_on")
    ///   a ──e2────> b   ("depends_on")
    ///   b ──e3────> c   ("depends_on")
    ///   c ──e4────> d   ("depends_on")
    ///   a ──e5────> e   ("produces")
    ///   f            (isolated)
    fn build_test_graph() -> GraphEngine {
        let mut g = GraphEngine::new();
        for id in &["a", "b", "c", "d", "e", "f"] {
            g.add_node(Node {
                id: id.to_string(),
                type_: "test".into(),
                label: id.to_string(),
                status: NodeStatus::Active,
                meta: None,
            });
        }
        let edges: [(&str, &str, &str, &str, f64); 5] = [
            ("e1", "a", "a", "depends_on", 1.0),  // self-loop
            ("e2", "a", "b", "depends_on", 1.0),
            ("e3", "b", "c", "depends_on", 1.0),
            ("e4", "c", "d", "depends_on", 1.0),
            ("e5", "a", "e", "produces",   1.0),
        ];
        for (id, src, tgt, rel, w) in &edges {
            g.add_edge(Edge {
                id: id.to_string(),
                source: src.to_string(),
                target: tgt.to_string(),
                relation: Relation::from(*rel),
                weight: *w,
                description: String::new(),
                target_field: None,
                meta: None,
            });
        }
        g
    }

    // ─── Empty Graph ─────────────────────────────────────

    #[test]
    fn test_empty_graph_traverse() {
        let g = GraphEngine::new();
        let (nodes, edges) = g.traverse(&"nonexistent".into(), None, false);
        assert!(nodes.is_empty());
        assert!(edges.is_empty());
    }

    #[test]
    fn test_empty_graph_impact() {
        let g = GraphEngine::new();
        let impact = g.impact(&"nonexistent".into());
        assert!(impact.affected.is_empty());
        assert!(!impact.critical_path);
    }

    #[test]
    fn test_empty_graph_path() {
        let g = GraphEngine::new();
        let path = g.path(&"nonexistent".into(), &"other".into(), false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Non-existent Nodes ──────────────────────────────

    #[test]
    fn test_traverse_nonexistent() {
        let g = build_test_graph();
        let (nodes, edges) = g.traverse(&"zzz".into(), None, false);
        assert!(nodes.is_empty());
        assert!(edges.is_empty());
    }

    #[test]
    fn test_impact_nonexistent() {
        let g = build_test_graph();
        let impact = g.impact(&"zzz".into());
        assert!(impact.affected.is_empty());
    }

    #[test]
    fn test_path_to_nonexistent() {
        let g = build_test_graph();
        let path = g.path(&"a".into(), &"zzz".into(), false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    #[test]
    fn test_path_from_nonexistent() {
        let g = build_test_graph();
        let path = g.path(&"zzz".into(), &"a".into(), false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Self-loop ───────────────────────────────────────

    #[test]
    fn test_self_loop_traverse() {
        let g = build_test_graph();
        let (nodes, _) = g.traverse(&"a".into(), None, false);
        // Self-loop e1: a -> a, so 'a' appears in the result
        assert!(nodes.contains(&"a".into()), "self-loop should make 'a' reachable from 'a'");
    }

    // ─── Single Layer Path ───────────────────────────────

    #[test]
    fn test_single_layer_path() {
        let g = build_test_graph();
        let path = g.path(&"a".into(), &"b".into(), false);
        assert!(path.exists, "a -> b should exist");
        assert_eq!(path.length, 1);
    }

    #[test]
    fn test_single_layer_path_produces() {
        let g = build_test_graph();
        let path = g.path(&"a".into(), &"e".into(), false);
        assert!(path.exists, "a -> e should exist (produces)");
        assert_eq!(path.length, 1);
    }

    // ─── Multi-layer Path ────────────────────────────────

    #[test]
    fn test_multi_layer_path() {
        let g = build_test_graph();
        let path = g.path(&"a".into(), &"d".into(), false);
        assert!(path.exists, "a -> b -> c -> d should exist");
        assert_eq!(path.length, 3);
    }

    // ─── No Path ─────────────────────────────────────────

    #[test]
    fn test_no_path_disconnected() {
        let g = build_test_graph();
        // f is isolated — no path from a
        let path = g.path(&"a".into(), &"f".into(), false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Directionality ──────────────────────────────────

    #[test]
    fn test_directionality_a_to_b_yes() {
        let g = build_test_graph();
        // a -> b exists
        let path = g.path(&"a".into(), &"b".into(), false);
        assert!(path.exists);
    }

    #[test]
    fn test_directionality_b_to_a_no() {
        let g = build_test_graph();
        // b -> a does NOT exist (graph is directed)
        let path = g.path(&"b".into(), &"a".into(), false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Centrality ──────────────────────────────────────

    #[test]
    fn test_centrality_hub_node() {
        let g = build_test_graph();
        let top = g.centrality(5);
        assert!(!top.is_empty(), "centrality should return at least one node");
        // 'a' has highest degree:
        //   outgoing: e1(self), e2, e5 = 3
        //   incoming: e1(self)        = 1
        //   total: 4
        assert_eq!(top[0], "a", "node 'a' should have highest centrality");
    }

    // ─── Health ──────────────────────────────────────────

    #[test]
    fn test_health_orphans() {
        let g = build_test_graph();
        let h = g.health();
        // f is isolated: 0 outgoing, 0 incoming
        assert!(h.orphans.contains(&"f".into()), "f should be an orphan");
    }

    #[test]
    fn test_health_sinks() {
        let g = build_test_graph();
        let h = g.health();
        // d: 0 outgoing, 1 incoming (e4) -> sink
        // e: 0 outgoing, 1 incoming (e5) -> sink
        assert!(h.sinks.contains(&"d".into()), "d should be a sink");
        assert!(h.sinks.contains(&"e".into()), "e should be a sink");
    }

    #[test]
    fn test_health_sources() {
        let g = build_test_graph();
        let h = g.health();
        // a has outgoing > 0, but also has incoming (self-loop e1), so not a source.
        // No node has truly zero incoming with non-zero outgoing.
        // This is correct — the self-loop on 'a' counts as both.
        // Just verify the report is well-formed.
        assert_eq!(h.total_nodes, 6);
        assert_eq!(h.total_edges, 5);
    }

    #[test]
    fn test_health_disconnected_components() {
        let g = build_test_graph();
        let h = g.health();
        // {a, b, c, d, e} — connected via a->b, a->e, b->c, c->d
        // {f}             — isolated
        assert_eq!(h.disconnected_components, 2);
    }

    // ─── Reachable ───────────────────────────────────────

    #[test]
    fn test_reachable_from_a() {
        let g = build_test_graph();
        let mut reachable = g.reachable(&"a".into());
        reachable.sort();
        // a can reach: a (self-loop), b, c, d, e
        // reachable() removes the start node, so: a, b, c, d, e
        assert_eq!(reachable, vec!["a", "b", "c", "d", "e"]);
    }

    #[test]
    fn test_reachable_from_f_isolated() {
        let g = build_test_graph();
        let reachable = g.reachable(&"f".into());
        assert!(reachable.is_empty(), "isolated node should have no reachable nodes");
    }
}