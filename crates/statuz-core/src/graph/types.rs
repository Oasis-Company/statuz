use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── ID Types ────────────────────────────────────────────────

pub type NodeId = String;
pub type EdgeId = String;
pub type FieldId = String;
pub type ClusterId = String;

// ─── Relation ────────────────────────────────────────────────

/// Relations define the semantic meaning of a connection.
/// Extensible — any string is allowed.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Relation {
    #[serde(rename = "depends_on")]
    DependsOn,
    #[serde(rename = "produces")]
    Produces,
    #[serde(rename = "consumes")]
    Consumes,
    #[serde(rename = "validates")]
    Validates,
    #[serde(rename = "informs")]
    Informs,
    #[serde(rename = "contains")]
    Contains,
    #[serde(rename = "delegates_to")]
    DelegatesTo,
    /// Bridge relation — connects nodes across different fields
    #[serde(rename = "bridges")]
    Bridges,
    /// Custom extensible relation
    #[serde(untagged)]
    Custom(String),
}

impl Relation {
    pub fn as_str(&self) -> &str {
        match self {
            Relation::DependsOn => "depends_on",
            Relation::Produces => "produces",
            Relation::Consumes => "consumes",
            Relation::Validates => "validates",
            Relation::Informs => "informs",
            Relation::Contains => "contains",
            Relation::DelegatesTo => "delegates_to",
            Relation::Bridges => "bridges",
            Relation::Custom(s) => s.as_str(),
        }
    }
}

impl From<&str> for Relation {
    fn from(s: &str) -> Self {
        match s {
            "depends_on" => Relation::DependsOn,
            "produces" => Relation::Produces,
            "consumes" => Relation::Consumes,
            "validates" => Relation::Validates,
            "informs" => Relation::Informs,
            "contains" => Relation::Contains,
            "delegates_to" => Relation::DelegatesTo,
            "bridges" => Relation::Bridges,
            other => Relation::Custom(other.to_string()),
        }
    }
}

// ─── Node Status ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NodeStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "dormant")]
    Dormant,
    #[serde(rename = "blocked")]
    Blocked,
    #[serde(rename = "done")]
    Done,
    #[serde(rename = "planned")]
    Planned,
}

// ─── Node ────────────────────────────────────────────────────

/// A node in the graph — anything that exists in the project ecosystem.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: NodeId,
    pub type_: String,
    pub label: String,
    pub status: NodeStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, String>>,
}

// ─── Edge ────────────────────────────────────────────────────

/// A directed edge — the reason two nodes are connected.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: EdgeId,
    pub source: NodeId,
    pub target: NodeId,
    pub relation: Relation,
    /// How strong the connection is (0.0 .. 1.0)
    pub weight: f64,
    /// Why this edge exists
    pub description: String,
    /// Optional: if this edge crosses fields, which field is the target in?
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_field: Option<FieldId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, String>>,
}

// ─── Query Results ───────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImpactResult {
    pub changed: NodeId,
    pub affected: Vec<NodeId>,
    pub blast_radius: Vec<NodeId>,
    pub critical_path: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathResult {
    pub from: NodeId,
    pub to: NodeId,
    pub path: Vec<Edge>,
    /// Field-level path — each entry corresponds to the field of the edge at the same index.
    /// Empty for single-field paths.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub field_path: Vec<FieldId>,
    pub length: i32,
    pub exists: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthReport {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub orphans: Vec<NodeId>,
    pub sinks: Vec<NodeId>,
    pub sources: Vec<NodeId>,
    pub high_centrality: Vec<NodeId>,
    pub disconnected_components: usize,
}