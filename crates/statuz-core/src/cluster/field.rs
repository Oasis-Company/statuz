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
    /// Optional semantic kind + adjudication anchor (design decision C).
    /// `None` for backward-compatible untyped fields.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub type_: Option<FieldType>,
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
            type_: None,
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

    /// Assign a semantic type to this field, recording who decided and when.
    /// Returns the previous type if one was set (callers may log/handle it).
    pub fn set_type(&mut self, type_: FieldType) -> Option<FieldType> {
        let prev = self.type_.take();
        self.type_ = Some(type_);
        prev
    }
}

/// A FieldType tags a Field with its semantic kind (e.g. "architecture",
/// "strategy", "supabase") plus the "adjudication anchor": who decided this
/// field is that kind, and when.
///
/// Backward compatible — older fields simply have `type_ == None`. This is a
/// declared-structure extension (the "assignment" leg of design decision C);
/// nothing here triggers field generation or confidence evaluation.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldType {
    /// The semantic kind. Bare string — the ontology (which kinds exist) is
    /// an open problem and intentionally not hardcoded here.
    pub kind: String,
    /// Who decided this kind: "user", "agent:niche", "syn:auto", etc.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decided_by: Option<String>,
    /// Unix timestamp of the adjudication.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub decided_at: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cluster::cluster::Visibility;

    #[test]
    fn new_field_has_no_type() {
        let f = Field::new("f1".into(), "Architecture".into(), None);
        assert!(f.type_.is_none());
    }

    #[test]
    fn set_type_records_kind_and_anchor() {
        let mut f = Field::new("f1".into(), "Architecture".into(), None);
        let t = FieldType {
            kind: "architecture".into(),
            decided_by: Some("syn:auto".into()),
            decided_at: Some(1700000000),
        };
        assert!(f.set_type(t).is_none());
        let got = f.type_.as_ref().expect("type_ should be set");
        assert_eq!(got.kind, "architecture");
        assert_eq!(got.decided_by.as_deref(), Some("syn:auto"));
        assert_eq!(got.decided_at, Some(1700000000));
    }

    #[test]
    fn set_type_overwrites_and_returns_previous() {
        let mut f = Field::new("f1".into(), "Architecture".into(), None);
        f.set_type(FieldType {
            kind: "architecture".into(),
            decided_by: None,
            decided_at: None,
        });
        let prev = f.set_type(FieldType {
            kind: "data-flow".into(),
            decided_by: None,
            decided_at: None,
        });
        assert_eq!(prev.unwrap().kind, "architecture");
        assert_eq!(f.type_.as_ref().unwrap().kind, "data-flow");
    }

    #[test]
    fn field_type_roundtrips_through_msgpack() {
        let mut f = Field::new("f1".into(), "Architecture".into(), None);
        f.set_type(FieldType {
            kind: "supabase".into(),
            decided_by: Some("user".into()),
            decided_at: Some(1700000000),
        });
        let bytes = crate::storage::serialize_cluster(&cluster_with_field(f)).unwrap();
        let back = crate::storage::deserialize_cluster(&bytes).unwrap();
        let f2 = back.fields.get("f1").unwrap();
        let t = f2.type_.as_ref().expect("type_ should survive roundtrip");
        assert_eq!(t.kind, "supabase");
        assert_eq!(t.decided_by.as_deref(), Some("user"));
        assert_eq!(t.decided_at, Some(1700000000));
    }

    #[test]
    fn untyped_field_stays_none_after_roundtrip() {
        let f = Field::new("f1".into(), "Architecture".into(), None);
        let bytes = crate::storage::serialize_cluster(&cluster_with_field(f)).unwrap();
        let back = crate::storage::deserialize_cluster(&bytes).unwrap();
        assert!(back.fields.get("f1").unwrap().type_.is_none());
    }

    fn cluster_with_field(f: Field) -> crate::Cluster {
        let mut c = crate::Cluster::new("c1".into(), "Test".into(), Visibility::Private);
        c.fields.insert(f.id.clone(), f);
        c
    }
}
