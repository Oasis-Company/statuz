use crate::graph::engine::GraphEngine;
use crate::graph::types::*;
use serde::{Deserialize, Serialize};

/// A Field is a named sub-graph within a Cluster.
/// Each field has its own GraphEngine instance, but nodes are
/// shared across fields via the Cluster's node registry.
///
/// Fields are the key abstraction: different fields represent different
/// "views" or "layers" of the same ecosystem (e.g., "architecture",
/// "data flow", "responsibilities").
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Field {
    pub id: FieldId,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub graph: GraphEngine,
    pub created_at: u64,
    pub updated_at: u64,
}

impl Field {
    pub fn new(id: FieldId, name: String, description: Option<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Field {
            id,
            name,
            description,
            graph: GraphEngine::new(),
            created_at: now,
            updated_at: now,
        }
    }

    /// Add a bridge edge: connects a node in THIS field to a node in ANOTHER field.
    /// Bridge edges are stored in this field's graph, with `target_field` set.
    /// They enable cross-field traversal without mixing edge data.
    pub fn add_bridge(&mut self, edge: Edge) {
        let mut bridge = edge;
        bridge.relation = Relation::Bridges;
        self.graph.add_edge(bridge);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// Traverse within this field, optionally crossing bridges to other fields.
    pub fn traverse(
        &self,
        from: &str,
        relation: Option<&str>,
        cross_field: bool,
    ) -> (Vec<NodeId>, Vec<Edge>) {
        let (ids, edges) = if cross_field {
            self.graph.traverse(from, relation, true)
        } else {
            self.graph.traverse(from, relation, false)
        };
        (ids, edges.into_iter().cloned().collect())
    }
}
