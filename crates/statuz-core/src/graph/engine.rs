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

    pub fn add_edge(&mut self, edge: Edge) {
        let rel = edge.relation.as_str().to_string();
        self.edges.insert(edge.id.clone(), edge);

        // Outgoing from source
        {
            let cell = self.adj.entry(edge.source.clone()).or_insert_with(|| AdjacencyCell {
                node_id: edge.source.clone(),
                outgoing: HashMap::new(),
                incoming: HashMap::new(),
            });
            cell.outgoing.entry(rel.clone()).or_insert_with(Vec::new);
            // We need to push the edge, but we already moved it. Let's fix this.
        }
        // Incoming to target
        {
            let cell = self.adj.entry(edge.target.clone()).or_insert_with(|| AdjacencyCell {
                node_id: edge.target.clone(),
                outgoing: HashMap::new(),
                incoming: HashMap::new(),
            });
            cell.incoming.entry(rel).or_insert_with(Vec::new);
        }
    }

    /// Better add_edge — push after inserts
    pub fn add_edge_v2(&mut self, edge: Edge) {
        let rel = edge.relation.as_str().to_string();
        let source = edge.source.clone();
        let target = edge.target.clone();
        let id = edge.id.clone();

        // Store edge
        self.edges.insert(id.clone(), edge);

        // Outgoing from source
        let cell = self.adj.entry(source).or_insert_with(|| AdjacencyCell {
            node_id: String::new(),
            outgoing: HashMap::new(),
            incoming: HashMap::new(),
        });
        cell.outgoing.entry(rel.clone()).or_insert_with(Vec::new).push(
            self.edges.get(&id).unwrap().clone()
        );

        // Incoming to target
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
        // Remove all edges connected to this node
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
            g.add_edge_v2(e);
        }
        Ok(g)
    }
}

impl Default for GraphEngine {
    fn default() -> Self {
        Self::new()
    }
}