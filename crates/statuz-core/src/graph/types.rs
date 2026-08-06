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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
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

// ─── Subgraph Result ─────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SubgraphResult {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

// ─── Diff Result ─────────────────────────────────────────────

/// 比较两个 Cluster 的差异结果。
/// 使用拥有值（Vec<Node> 而非 Vec<&Node>）以避免生命周期标注。
/// 比较基于 id 字段匹配，而非内容匹配。
/// meta 字段不参与比较（None 和 Some({}) 视为相同）。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiffResult {
    pub added_nodes: Vec<Node>,
    pub removed_nodes: Vec<Node>,
    /// (old_node, new_node) — 相同 id 但 type_/label/status 不同
    pub changed_nodes: Vec<(Node, Node)>,
    pub added_edges: Vec<Edge>,
    pub removed_edges: Vec<Edge>,
    /// (old_edge, new_edge) — 相同 id 但关系/描述/权重不同
    pub changed_edges: Vec<(Edge, Edge)>,
    pub added_fields: Vec<FieldId>,
    pub removed_fields: Vec<FieldId>,
    pub added_bridges: Vec<Edge>,
    pub removed_bridges: Vec<Edge>,
}

// ─── Validation Result ───────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IssueSeverity {
    Error,
    Warning,
}

impl std::fmt::Display for IssueSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IssueSeverity::Error => write!(f, "error"),
            IssueSeverity::Warning => write!(f, "warning"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IssueCategory {
    OrphanEdge,
    MissingField,
    BrokenBridge,
    ForeignNode,
    DuplicateBridge,
    CyclicBridge,
    TimestampInconsistency,
    OrphanNode,
}

impl std::fmt::Display for IssueCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IssueCategory::OrphanEdge => write!(f, "orphan_edge"),
            IssueCategory::MissingField => write!(f, "missing_field"),
            IssueCategory::BrokenBridge => write!(f, "broken_bridge"),
            IssueCategory::ForeignNode => write!(f, "foreign_node"),
            IssueCategory::DuplicateBridge => write!(f, "duplicate_bridge"),
            IssueCategory::CyclicBridge => write!(f, "cyclic_bridge"),
            IssueCategory::TimestampInconsistency => write!(f, "timestamp_inconsistency"),
            IssueCategory::OrphanNode => write!(f, "orphan_node"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ValidationIssue {
    pub severity: IssueSeverity,
    pub category: IssueCategory,
    pub message: String,
    pub affected_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ValidationResult {
    pub issues: Vec<ValidationIssue>,
    pub is_valid: bool,
}

// ─── SYN Types ────────────────────────────────────────────────
// 这些类型定义在 core 中以避免 niche 和 syn crate 之间的循环依赖。
// niche::Engine::drift_to_syn() 返回 SynProposal。
// syn::SynEngine::approve/reject() 操作 SynProposal。

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SynStatus {
    Draft,
    UnderReview,
    Approved,
    Rejected,
    Implemented,
}

impl std::fmt::Display for SynStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SynStatus::Draft => write!(f, "draft"),
            SynStatus::UnderReview => write!(f, "under_review"),
            SynStatus::Approved => write!(f, "approved"),
            SynStatus::Rejected => write!(f, "rejected"),
            SynStatus::Implemented => write!(f, "implemented"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SynOption {
    pub label: String,
    pub description: String,
    /// Merge strategy as string: "skip", "overwrite", "rename", "merge_meta"
    /// String type avoids circular dependency (MergeStrategy is defined in cluster module)
    pub merge_strategy: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AuditEntry {
    pub timestamp: u64,
    pub actor: String,
    pub action: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SynProposal {
    pub id: String,
    pub summary: String,
    pub description: String,
    pub options: Vec<SynOption>,
    pub diff: DiffResult,
    pub audit_trail: Vec<AuditEntry>,
    pub status: SynStatus,
    pub created_at: u64,
}
