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
        let critical_path = centrality.iter().any(|(id, _)| id == changed);

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
                length: 0,
                exists: true,
            };
        }

        if !self.nodes.contains_key(from) || !self.nodes.contains_key(to) {
            return PathResult {
                from: from.clone(),
                to: to.clone(),
                path: vec![],
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
            length: path.len() as i32,
            exists: true,
            path,
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