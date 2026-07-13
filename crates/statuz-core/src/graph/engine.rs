use std::collections::HashMap;
use crate::graph::types::*;

// ─── Adjacency Cell ──────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct AdjacencyCell {
    pub node_id: NodeId,
    /// relation → edges going out from this node
    pub outgoing: HashMap<String, Vec<Edge>>,
    /// relation → edges coming into this node
    pub incoming: HashMap<String, Vec<Edge>>,
}

// ─── GraphEngine ─────────────────────────────────────────────

/// In-memory directed graph with adjacency list.
/// The runtime heart of Statuz. Everything else reads from this.
#[derive(Debug, Clone)]
pub struct GraphEngine {
    nodes: HashMap<NodeId, Node>,
    edges: HashMap<EdgeId, Edge>,
    adj: HashMap<NodeId, AdjacencyCell>,
}

impl GraphEngine {
    pub fn new() -> Self {
        GraphEngine {
            nodes: HashMap::new(),
            edges: HashMap::new(),
            adj: HashMap::new(),
        }
    }

    // ─── Mutations ───────────────────────────────────────

    pub fn add_node(&mut self, node: Node) {
        self.nodes.insert(node.id.clone(), node);
        self.adj.entry(node.id.clone()).or_insert_with(|| AdjacencyCell {
            node_id: node.id,
            outgoing: HashMap::new(),
            incoming: HashMap::new(),
        });
    }

    /// Add an edge to the graph. Clones the edge data into both
    /// the outgoing adjacency (of source) and incoming adjacency (of target).
    pub fn add_edge(&mut self, edge: Edge) {
        let rel = edge.relation.as_str().to_string();
        let source = edge.source.clone();
        let target = edge.target.clone();
        let id = edge.id.clone();

        self.edges.insert(id.clone(), edge);

        let cell = self.adj.entry(source).or_insert_with(|| AdjacencyCell {
            node_id: String::new(),
            outgoing: HashMap::new(),
            incoming: HashMap::new(),
        });
        cell.outgoing.entry(rel.clone()).or_insert_with(Vec::new).push(
            self.edges.get(&id).unwrap().clone()
        );

        let cell = self.adj.entry(target).or_insert_with(|| AdjacencyCell {
            node_id: String::new(),
            outgoing: HashMap::new(),
            incoming: HashMap::new(),
        });
        cell.incoming.entry(rel).or_insert_with(Vec::new).push(
            self.edges.get(&id).unwrap().clone()
        );
    }

    pub fn remove_node(&mut self, id: &NodeId) {
        if let Some(cell) = self.adj.get(id) {
            for (_, edges) in &cell.outgoing {
                for e in edges {
                    self.edges.remove(&e.id);
                }
            }
            for (_, edges) in &cell.incoming {
                for e in edges {
                    self.edges.remove(&e.id);
                }
            }
        }
        self.nodes.remove(id);
        self.adj.remove(id);
    }

    /// Remove a single edge from the graph by its ID.
    /// Removes from edge registry, source's outgoing adjacency, and target's incoming adjacency.
    pub fn remove_edge(&mut self, id: &EdgeId) {
        if let Some(edge) = self.edges.remove(id) {
            let rel = edge.relation.as_str().to_string();
            // Remove from source's outgoing
            if let Some(cell) = self.adj.get_mut(&edge.source) {
                if let Some(edges) = cell.outgoing.get_mut(&rel) {
                    edges.retain(|e| e.id != *id);
                    if edges.is_empty() {
                        cell.outgoing.remove(&rel);
                    }
                }
            }
            // Remove from target's incoming
            if let Some(cell) = self.adj.get_mut(&edge.target) {
                if let Some(edges) = cell.incoming.get_mut(&rel) {
                    edges.retain(|e| e.id != *id);
                    if edges.is_empty() {
                        cell.incoming.remove(&rel);
                    }
                }
            }
        }
    }

    // ─── Accessors ────────────────────────────────────────

    pub fn get_node(&self, id: &NodeId) -> Option<&Node> {
        self.nodes.get(id)
    }

    pub fn get_edge(&self, id: &EdgeId) -> Option<&Edge> {
        self.edges.get(id)
    }

    pub fn all_nodes(&self) -> Vec<&Node> {
        self.nodes.values().collect()
    }

    pub fn all_edges(&self) -> Vec<&Edge> {
        self.edges.values().collect()
    }

    pub fn node_count(&self) -> usize {
        self.nodes.len()
    }

    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }

    /// Get all outgoing edges from a node, optionally filtered by relation
    pub fn outgoing_edges(&self, node_id: &NodeId, relation: Option<&str>) -> Vec<&Edge> {
        let cell = match self.adj.get(node_id) {
            Some(c) => c,
            None => return vec![],
        };

        if let Some(rel) = relation {
            cell.outgoing.get(rel).map(|v| v.iter().collect()).unwrap_or_default()
        } else {
            cell.outgoing.values().flat_map(|v| v.iter()).collect()
        }
    }

    /// Get all incoming edges to a node, optionally filtered by relation
    pub fn incoming_edges(&self, node_id: &NodeId, relation: Option<&str>) -> Vec<&Edge> {
        let cell = match self.adj.get(node_id) {
            Some(c) => c,
            None => return vec![],
        };

        if let Some(rel) = relation {
            cell.incoming.get(rel).map(|v| v.iter().collect()).unwrap_or_default()
        } else {
            cell.incoming.values().flat_map(|v| v.iter()).collect()
        }
    }

    // ─── Serialization ───────────────────────────────────

    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "nodes": self.nodes.values().collect::<Vec<_>>(),
            "edges": self.edges.values().collect::<Vec<_>>(),
        })
    }

    pub fn from_json(data: &serde_json::Value) -> Result<Self, serde_json::Error> {
        #[derive(serde::Deserialize)]
        struct GraphData {
            nodes: Vec<Node>,
            edges: Vec<Edge>,
        }
        let gd: GraphData = serde_json::from_value(data.clone())?;
        let mut g = GraphEngine::new();
        for n in gd.nodes {
            g.add_node(n);
        }
        for e in gd.edges {
            g.add_edge(e);
        }
        Ok(g)
    }
}

impl Default for GraphEngine {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_graph() {
        let g = GraphEngine::new();
        assert_eq!(g.node_count(), 0);
        assert_eq!(g.edge_count(), 0);
        assert!(g.all_nodes().is_empty());
        assert!(g.all_edges().is_empty());
    }

    #[test]
    fn test_single_node() {
        let mut g = GraphEngine::new();
        let node = Node {
            id: "test-node".into(),
            type_: "test".into(),
            label: "Test Node".into(),
            status: NodeStatus::Active,
            meta: None,
        };
        g.add_node(node);
        assert_eq!(g.node_count(), 1);
        assert!(g.get_node("test-node").is_some());
        let (nodes, _) = g.traverse(&"test-node".into(), None, false);
        assert!(nodes.is_empty());
    }

    #[test]
    fn test_duplicate_edge() {
        let mut g = GraphEngine::new();
        let n1 = Node { id: "a".into(), type_: "t".into(), label: "A".into(), status: NodeStatus::Active, meta: None };
        let n2 = Node { id: "b".into(), type_: "t".into(), label: "B".into(), status: NodeStatus::Active, meta: None };
        g.add_node(n1);
        g.add_node(n2);

        let e1 = Edge {
            id: "e1".into(), source: "a".into(), target: "b".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "first".into(),
            target_field: None, meta: None,
        };
        let e2 = Edge {
            id: "e2".into(), source: "a".into(), target: "b".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "duplicate".into(),
            target_field: None, meta: None,
        };
        g.add_edge(e1);
        g.add_edge(e2);

        // Both edges should be stored (different IDs)
        assert_eq!(g.edge_count(), 2);
        // Both should appear in outgoing
        let outgoing = g.outgoing_edges(&"a".into(), Some("depends_on"));
        assert_eq!(outgoing.len(), 2);
    }

    #[test]
    fn test_remove_nonexistent_node() {
        let mut g = GraphEngine::new();
        // Should not panic
        g.remove_node(&"nonexistent".into());
        assert_eq!(g.node_count(), 0);
    }

    #[test]
    fn test_remove_node_cascade() {
        let mut g = GraphEngine::new();
        let n1 = Node { id: "a".into(), type_: "t".into(), label: "A".into(), status: NodeStatus::Active, meta: None };
        let n2 = Node { id: "b".into(), type_: "t".into(), label: "B".into(), status: NodeStatus::Active, meta: None };
        let n3 = Node { id: "c".into(), type_: "t".into(), label: "C".into(), status: NodeStatus::Active, meta: None };
        g.add_node(n1);
        g.add_node(n2);
        g.add_node(n3);

        g.add_edge(Edge {
            id: "e1".into(), source: "a".into(), target: "b".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "".into(),
            target_field: None, meta: None,
        });
        g.add_edge(Edge {
            id: "e2".into(), source: "b".into(), target: "c".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "".into(),
            target_field: None, meta: None,
        });

        assert_eq!(g.edge_count(), 2);
        g.remove_node(&"b".into());
        assert_eq!(g.node_count(), 2); // a and c remain
        assert_eq!(g.edge_count(), 0); // all edges referencing b are removed
        assert!(g.get_node("a").is_some());
        assert!(g.get_node("c").is_some());
    }

    #[test]
    fn test_batch_operations() {
        let mut g = GraphEngine::new();
        // Add 100 nodes
        for i in 0..100 {
            g.add_node(Node {
                id: format!("node-{}", i),
                type_: "test".into(),
                label: format!("Node {}", i),
                status: NodeStatus::Active,
                meta: None,
            });
        }
        assert_eq!(g.node_count(), 100);

        // Add 100 edges forming a chain
        for i in 0..99 {
            g.add_edge(Edge {
                id: format!("edge-{}", i),
                source: format!("node-{}", i),
                target: format!("node-{}", i + 1),
                relation: Relation::DependsOn,
                weight: 1.0,
                description: "chain".into(),
                target_field: None,
                meta: None,
            });
        }
        assert_eq!(g.edge_count(), 99);

        // Verify chain by traversing from node-0
        let (nodes, _) = g.traverse(&"node-0".into(), None, false);
        assert_eq!(nodes.len(), 1);
        assert_eq!(nodes[0], "node-1");
    }

    #[test]
    fn test_outgoing_incoming_edges() {
        let mut g = GraphEngine::new();
        let a = Node { id: "a".into(), type_: "t".into(), label: "A".into(), status: NodeStatus::Active, meta: None };
        let b = Node { id: "b".into(), type_: "t".into(), label: "B".into(), status: NodeStatus::Active, meta: None };
        g.add_node(a);
        g.add_node(b);

        g.add_edge(Edge {
            id: "e1".into(), source: "a".into(), target: "b".into(),
            relation: Relation::Produces, weight: 1.0, description: "".into(),
            target_field: None, meta: None,
        });

        let outgoing = g.outgoing_edges(&"a".into(), None);
        assert_eq!(outgoing.len(), 1);
        let incoming = g.incoming_edges(&"b".into(), None);
        assert_eq!(incoming.len(), 1);

        // Filter by relation
        let filtered = g.outgoing_edges(&"a".into(), Some("produces"));
        assert_eq!(filtered.len(), 1);
        let no_match = g.outgoing_edges(&"a".into(), Some("consumes"));
        assert_eq!(no_match.len(), 0);
    }

    #[test]
    fn test_remove_edge() {
        let mut g = GraphEngine::new();
        let n1 = Node { id: "a".into(), type_: "t".into(), label: "A".into(), status: NodeStatus::Active, meta: None };
        let n2 = Node { id: "b".into(), type_: "t".into(), label: "B".into(), status: NodeStatus::Active, meta: None };
        g.add_node(n1);
        g.add_node(n2);
        g.add_edge(Edge {
            id: "e1".into(), source: "a".into(), target: "b".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "".into(),
            target_field: None, meta: None,
        });
        assert_eq!(g.edge_count(), 1);

        g.remove_edge(&"e1".into());
        assert_eq!(g.edge_count(), 0);
        // Source's outgoing should be empty
        let outgoing = g.outgoing_edges(&"a".into(), None);
        assert!(outgoing.is_empty(), "outgoing edges should be empty after removing the only edge");
        // Target's incoming should be empty
        let incoming = g.incoming_edges(&"b".into(), None);
        assert!(incoming.is_empty(), "incoming edges should be empty after removing the only edge");
    }

    #[test]
    fn test_remove_nonexistent_edge() {
        let mut g = GraphEngine::new();
        g.remove_edge(&"nonexistent".into());
        // Should not panic and edge count stays 0
        assert_eq!(g.edge_count(), 0);
    }

    #[test]
    fn test_to_json_and_from_json() {
        let mut g = GraphEngine::new();
        g.add_node(Node {
            id: "n1".into(), type_: "t".into(), label: "N1".into(),
            status: NodeStatus::Active, meta: None,
        });
        g.add_node(Node {
            id: "n2".into(), type_: "t".into(), label: "N2".into(),
            status: NodeStatus::Active, meta: None,
        });
        g.add_edge(Edge {
            id: "e1".into(), source: "n1".into(), target: "n2".into(),
            relation: Relation::DependsOn, weight: 1.0, description: "".into(),
            target_field: None, meta: None,
        });

        let json = g.to_json();
        let restored = GraphEngine::from_json(&json).expect("from_json should succeed");
        assert_eq!(restored.node_count(), 2);
        assert_eq!(restored.edge_count(), 1);
        assert!(restored.get_node("n1").is_some());
        assert!(restored.get_node("n2").is_some());
    }
}