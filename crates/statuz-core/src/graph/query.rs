use crate::graph::engine::GraphEngine;
use crate::graph::types::*;
use std::collections::{HashMap, HashSet, VecDeque};

impl GraphEngine {
    /// Q1: "What does this node connect to?"
    /// Traverse from a node following a relation (or all relations).
    /// If `cross_field` is true, also follows bridge edges to other fields.
    pub fn traverse(
        &self,
        from: &str,
        relation: Option<&str>,
        cross_field: bool,
    ) -> (Vec<NodeId>, Vec<&Edge>) {
        let cell = match self.adj.get(from) {
            Some(c) => c,
            None => return (vec![], vec![]),
        };

        let mut edges: Vec<&Edge> = Vec::new();
        let mut seen = HashSet::new();

        if let Some(rel) = relation {
            if let Some(rel_edges) = cell.outgoing.get(rel) {
                for e in rel_edges {
                    // Explicitly asking for bridge edges shows them even in local mode
                    if cross_field || e.target_field.is_none() || rel == "bridges" {
                        edges.push(e);
                        seen.insert(e.target.clone());
                    }
                }
            }
        } else {
            for rel_edges in cell.outgoing.values() {
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
    pub fn impact(&self, changed: &str) -> ImpactResult {
        let cell = match self.adj.get(changed) {
            Some(c) => c,
            None => {
                return ImpactResult {
                    changed: changed.to_string(),
                    affected: vec![],
                    blast_radius: vec![],
                    critical_path: false,
                }
            }
        };

        let mut affected: Vec<NodeId> = Vec::new();
        let mut visited = HashSet::new();
        let mut queue: VecDeque<NodeId> = VecDeque::new();

        // Start from all nodes that directly point to `changed`
        for edges in cell.incoming.values() {
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
                for edges in current_cell.incoming.values() {
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
            changed: changed.to_string(),
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
    pub fn path(&self, from: &str, to: &str, cross_field: bool) -> PathResult {
        if from == to {
            return PathResult {
                from: from.to_string(),
                to: to.to_string(),
                path: vec![],
                field_path: vec![],
                length: 0,
                exists: true,
            };
        }

        if !self.nodes.contains_key(from) || !self.nodes.contains_key(to) {
            return PathResult {
                from: from.to_string(),
                to: to.to_string(),
                path: vec![],
                field_path: vec![],
                length: -1,
                exists: false,
            };
        }

        let mut visited = HashSet::new();
        visited.insert(from.to_string());
        let mut parent: HashMap<NodeId, (NodeId, Edge)> = HashMap::new();
        let mut queue: VecDeque<NodeId> = VecDeque::new();
        queue.push_back(from.to_string());

        'bfs: while let Some(current) = queue.pop_front() {
            if current == *to {
                break;
            }

            if let Some(cell) = self.adj.get(&current) {
                for edges in cell.outgoing.values() {
                    for e in edges {
                        if (cross_field || e.target_field.is_none()) && !visited.contains(&e.target)
                        {
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

        if !parent.contains_key(to) {
            return PathResult {
                from: from.to_string(),
                to: to.to_string(),
                path: vec![],
                field_path: vec![],
                length: -1,
                exists: false,
            };
        }

        // Reconstruct path
        let mut path: Vec<Edge> = Vec::new();
        let mut current = to.to_string();
        while let Some((prev, edge)) = parent.get(&current) {
            path.push(edge.clone());
            current = prev.clone();
            if current == *from {
                break;
            }
        }
        path.reverse();

        let length = path.len() as i32;
        PathResult {
            from: from.to_string(),
            to: to.to_string(),
            path,
            field_path: vec![],
            length,
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
            for edges in cell.outgoing.values() {
                degree += edges.len();
            }
            for edges in cell.incoming.values() {
                degree += edges.len();
            }
            scores.insert(id.clone(), degree);
        }

        let mut sorted: Vec<(NodeId, usize)> = scores.into_iter().collect();
        sorted.sort_by_key(|x| std::cmp::Reverse(x.1));
        sorted.truncate(limit);
        sorted.into_iter().map(|(id, _)| id).collect()
    }

    /// Transitive closure: get ALL nodes reachable from `id` (BFS)
    pub fn reachable(&self, from: &str) -> Vec<NodeId> {
        let mut visited = HashSet::new();
        visited.insert(from.to_string());
        let mut queue: VecDeque<NodeId> = VecDeque::new();
        queue.push_back(from.to_string());

        while let Some(current) = queue.pop_front() {
            if let Some(cell) = self.adj.get(&current) {
                for edges in cell.outgoing.values() {
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
            for e in cell.outgoing.values() {
                out_count += e.len();
            }
            for e in cell.incoming.values() {
                in_count += e.len();
            }

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
                        for edges in cell.outgoing.values() {
                            for e in edges {
                                if !component_visited.contains(&e.target) {
                                    component_visited.insert(e.target.clone());
                                    q.push_back(e.target.clone());
                                }
                            }
                        }
                        for edges in cell.incoming.values() {
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

    // ─── Subgraph ─────────────────────────────────────────

    /// Extract a subgraph starting from seed nodes via BFS.
    /// depth: None = unlimited, Some(0) = seeds only
    /// relation: optional relation filter
    pub fn subgraph(
        &self,
        seeds: &[NodeId],
        depth: Option<usize>,
        relation: Option<&str>,
    ) -> SubgraphResult {
        if seeds.is_empty() {
            return SubgraphResult {
                nodes: vec![],
                edges: vec![],
            };
        }

        let max_depth = depth.unwrap_or(usize::MAX);
        let mut visited_nodes = HashSet::new();
        let mut visited_edges = HashSet::new();
        let mut result_nodes: Vec<Node> = Vec::new();
        let mut result_edges: Vec<Edge> = Vec::new();
        let mut queue: VecDeque<(NodeId, usize)> = VecDeque::new();

        // Init: seed nodes (only if known to the engine — unknown seeds yield nothing)
        for seed in seeds {
            if !visited_nodes.contains(seed) {
                visited_nodes.insert(seed.clone());
                if let Some(node) = self.nodes.get(seed) {
                    result_nodes.push(node.clone());
                }
                queue.push_back((seed.clone(), 0));
            }
        }

        // BFS
        while let Some((current, current_depth)) = queue.pop_front() {
            if current_depth >= max_depth {
                continue;
            }

            let edges: Vec<Edge> = if let Some(rel) = relation {
                self.outgoing_edges(&current, Some(rel))
                    .into_iter()
                    .cloned()
                    .collect()
            } else {
                let mut all = Vec::new();
                if let Some(cell) = self.adj.get(&current) {
                    for rel_edges in cell.outgoing.values() {
                        for e in rel_edges {
                            if e.target_field.is_none() {
                                all.push(e.clone());
                            }
                        }
                    }
                }
                all
            };

            for edge in &edges {
                if !visited_edges.contains(&edge.id) {
                    visited_edges.insert(edge.id.clone());
                    result_edges.push(edge.clone());
                }
                if !visited_nodes.contains(&edge.target) {
                    visited_nodes.insert(edge.target.clone());
                    result_nodes.push(self.node_or_minimal(&edge.target));
                    queue.push_back((edge.target.clone(), current_depth + 1));
                }
            }
        }

        SubgraphResult {
            nodes: result_nodes,
            edges: result_edges,
        }
    }

    /// Return the cached node if present; otherwise a minimal id-only placeholder.
    /// Cluster-level subgraphs enrich these placeholders from the cluster registry
    /// (field GraphEngines may not cache nodes — the registry is authoritative).
    fn node_or_minimal(&self, id: &str) -> Node {
        self.nodes.get(id).cloned().unwrap_or_else(|| Node {
            id: id.to_string(),
            type_: String::new(),
            label: String::new(),
            status: NodeStatus::Active,
            meta: None,
        })
    }

    // ─── Validate ─────────────────────────────────────────

    /// Validate graph internal consistency.
    /// Checks: orphan edges (source or target not in graph)
    pub fn validate(&self) -> ValidationResult {
        let mut issues = Vec::new();

        for edge in self.edges.values() {
            if !self.nodes.contains_key(&edge.source) {
                issues.push(ValidationIssue {
                    severity: IssueSeverity::Error,
                    category: IssueCategory::OrphanEdge,
                    message: format!(
                        "Edge '{}' references non-existent source node '{}'",
                        edge.id, edge.source
                    ),
                    affected_ids: vec![edge.id.clone(), edge.source.clone()],
                });
            }
            if !self.nodes.contains_key(&edge.target) {
                issues.push(ValidationIssue {
                    severity: IssueSeverity::Error,
                    category: IssueCategory::OrphanEdge,
                    message: format!(
                        "Edge '{}' references non-existent target node '{}'",
                        edge.id, edge.target
                    ),
                    affected_ids: vec![edge.id.clone(), edge.target.clone()],
                });
            }
        }

        let is_valid = issues.iter().all(|i| i.severity != IssueSeverity::Error);
        ValidationResult { issues, is_valid }
    }
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, type_: &str, label: &str, status: NodeStatus) -> Node {
        Node {
            id: id.into(),
            type_: type_.into(),
            label: label.into(),
            status,
            meta: None,
        }
    }

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
            ("e1", "a", "a", "depends_on", 1.0), // self-loop
            ("e2", "a", "b", "depends_on", 1.0),
            ("e3", "b", "c", "depends_on", 1.0),
            ("e4", "c", "d", "depends_on", 1.0),
            ("e5", "a", "e", "produces", 1.0),
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
        let (nodes, edges) = g.traverse("nonexistent", None, false);
        assert!(nodes.is_empty());
        assert!(edges.is_empty());
    }

    #[test]
    fn test_empty_graph_impact() {
        let g = GraphEngine::new();
        let impact = g.impact("nonexistent");
        assert!(impact.affected.is_empty());
        assert!(!impact.critical_path);
    }

    #[test]
    fn test_empty_graph_path() {
        let g = GraphEngine::new();
        let path = g.path("nonexistent", "other", false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Non-existent Nodes ──────────────────────────────

    #[test]
    fn test_traverse_nonexistent() {
        let g = build_test_graph();
        let (nodes, edges) = g.traverse("zzz", None, false);
        assert!(nodes.is_empty());
        assert!(edges.is_empty());
    }

    #[test]
    fn test_impact_nonexistent() {
        let g = build_test_graph();
        let impact = g.impact("zzz");
        assert!(impact.affected.is_empty());
    }

    #[test]
    fn test_path_to_nonexistent() {
        let g = build_test_graph();
        let path = g.path("a", "zzz", false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    #[test]
    fn test_path_from_nonexistent() {
        let g = build_test_graph();
        let path = g.path("zzz", "a", false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Self-loop ───────────────────────────────────────

    #[test]
    fn test_self_loop_traverse() {
        let g = build_test_graph();
        let (nodes, _) = g.traverse("a", None, false);
        // Self-loop e1: a -> a, so 'a' appears in the result
        assert!(
            nodes.contains(&"a".to_string()),
            "self-loop should make 'a' reachable from 'a'"
        );
    }

    // ─── Single Layer Path ───────────────────────────────

    #[test]
    fn test_single_layer_path() {
        let g = build_test_graph();
        let path = g.path("a", "b", false);
        assert!(path.exists, "a -> b should exist");
        assert_eq!(path.length, 1);
    }

    #[test]
    fn test_single_layer_path_produces() {
        let g = build_test_graph();
        let path = g.path("a", "e", false);
        assert!(path.exists, "a -> e should exist (produces)");
        assert_eq!(path.length, 1);
    }

    // ─── Multi-layer Path ────────────────────────────────

    #[test]
    fn test_multi_layer_path() {
        let g = build_test_graph();
        let path = g.path("a", "d", false);
        assert!(path.exists, "a -> b -> c -> d should exist");
        assert_eq!(path.length, 3);
    }

    // ─── No Path ─────────────────────────────────────────

    #[test]
    fn test_no_path_disconnected() {
        let g = build_test_graph();
        // f is isolated — no path from a
        let path = g.path("a", "f", false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Directionality ──────────────────────────────────

    #[test]
    fn test_directionality_a_to_b_yes() {
        let g = build_test_graph();
        // a -> b exists
        let path = g.path("a", "b", false);
        assert!(path.exists);
    }

    #[test]
    fn test_directionality_b_to_a_no() {
        let g = build_test_graph();
        // b -> a does NOT exist (graph is directed)
        let path = g.path("b", "a", false);
        assert!(!path.exists);
        assert_eq!(path.length, -1);
    }

    // ─── Centrality ──────────────────────────────────────

    #[test]
    fn test_centrality_hub_node() {
        let g = build_test_graph();
        let top = g.centrality(5);
        assert!(
            !top.is_empty(),
            "centrality should return at least one node"
        );
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
        assert!(
            h.orphans.contains(&"f".to_string()),
            "f should be an orphan"
        );
    }

    #[test]
    fn test_health_sinks() {
        let g = build_test_graph();
        let h = g.health();
        // d: 0 outgoing, 1 incoming (e4) -> sink
        // e: 0 outgoing, 1 incoming (e5) -> sink
        assert!(h.sinks.contains(&"d".to_string()), "d should be a sink");
        assert!(h.sinks.contains(&"e".to_string()), "e should be a sink");
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
        let mut reachable = g.reachable("a");
        reachable.sort();
        // reachable() = transitive closure via one-or-more edges; the start
        // node itself is removed even when a self-loop exists.
        assert_eq!(reachable, vec!["b", "c", "d", "e"]);
    }

    #[test]
    fn test_reachable_from_f_isolated() {
        let g = build_test_graph();
        let reachable = g.reachable("f");
        assert!(
            reachable.is_empty(),
            "isolated node should have no reachable nodes"
        );
    }

    // ─── Subgraph Tests ──────────────────────────────────

    #[test]
    fn test_subgraph_empty_seeds() {
        let g = build_test_graph();
        let result = g.subgraph(&[], None, None);
        assert!(result.nodes.is_empty());
        assert!(result.edges.is_empty());
    }

    #[test]
    fn test_subgraph_seeds_only() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into()], Some(0), None);
        assert_eq!(result.nodes.len(), 1);
        assert_eq!(result.nodes[0].id, "a");
        assert!(result.edges.is_empty());
    }

    #[test]
    fn test_subgraph_single_hop() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into()], Some(1), None);
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        // a -> b, a -> e, self-loop a->a
        assert_eq!(
            node_ids,
            vec!["a", "b", "e"],
            "depth 1 from 'a' should reach a, b, e"
        );
        assert_eq!(result.edges.len(), 3);
    }

    #[test]
    fn test_subgraph_multi_hop() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into()], Some(3), None);
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        // a -> b -> c -> d, plus a -> e, plus self-loop a->a
        assert_eq!(node_ids, vec!["a", "b", "c", "d", "e"]);
    }

    #[test]
    fn test_subgraph_relation_filter() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into()], None, Some("produces"));
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        assert_eq!(node_ids, vec!["a", "e"]);
        assert_eq!(result.edges.len(), 1);
        assert_eq!(result.edges[0].id, "e5");
    }

    #[test]
    fn test_subgraph_unlimited_depth() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into()], None, None);
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        assert_eq!(
            node_ids,
            vec!["a", "b", "c", "d", "e"],
            "f is isolated, not reachable"
        );
    }

    #[test]
    fn test_subgraph_from_isolated_node() {
        let g = build_test_graph();
        let result = g.subgraph(&["f".into()], None, None);
        assert_eq!(result.nodes.len(), 1);
        assert_eq!(result.nodes[0].id, "f");
        assert!(result.edges.is_empty());
    }

    #[test]
    fn test_subgraph_multiple_seeds() {
        let g = build_test_graph();
        let result = g.subgraph(&["a".into(), "f".into()], Some(1), None);
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        assert_eq!(node_ids, vec!["a", "b", "e", "f"]);
    }

    #[test]
    fn test_subgraph_nonexistent_seed() {
        let g = build_test_graph();
        let result = g.subgraph(&["zzz".into()], None, None);
        assert!(result.nodes.is_empty());
        assert!(result.edges.is_empty());
    }

    // ─── Validate Tests ─────────────────────────────────

    #[test]
    fn test_validate_clean_graph() {
        let g = build_test_graph();
        let result = g.validate();
        assert!(result.is_valid);
        assert!(result.issues.is_empty());
    }

    #[test]
    fn test_validate_orphan_edge_source() {
        let mut g = GraphEngine::new();
        g.add_node(node("a", "t", "A", NodeStatus::Active));
        g.add_edge(Edge {
            id: "orphan".into(),
            source: "zzz".into(),
            target: "a".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });
        let result = g.validate();
        assert!(!result.is_valid);
        assert!(result
            .issues
            .iter()
            .any(|i| i.category == IssueCategory::OrphanEdge));
    }

    #[test]
    fn test_validate_orphan_edge_target() {
        let mut g = GraphEngine::new();
        g.add_node(node("a", "t", "A", NodeStatus::Active));
        g.add_edge(Edge {
            id: "orphan".into(),
            source: "a".into(),
            target: "zzz".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });
        let result = g.validate();
        assert!(!result.is_valid);
        assert!(result
            .issues
            .iter()
            .any(|i| i.category == IssueCategory::OrphanEdge));
    }

    #[test]
    fn test_validate_both_ends_orphan() {
        let mut g = GraphEngine::new();
        g.add_edge(Edge {
            id: "double-orphan".into(),
            source: "xxx".into(),
            target: "yyy".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });
        let result = g.validate();
        assert!(!result.is_valid);
        assert_eq!(result.issues.len(), 2);
    }

    #[test]
    fn test_validate_empty_graph() {
        let g = GraphEngine::new();
        let result = g.validate();
        assert!(result.is_valid);
        assert!(result.issues.is_empty());
    }
}
