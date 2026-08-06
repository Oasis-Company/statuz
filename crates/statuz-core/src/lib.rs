pub mod cluster;
pub mod graph;
pub mod storage;

// Re-export public API
pub use cluster::cluster::Visibility;
pub use cluster::CloneOptions;
pub use cluster::Cluster;
pub use cluster::Field;
pub use cluster::MergeResult;
pub use cluster::MergeStrategy;
pub use graph::engine::GraphEngine;
pub use graph::types::*;
pub use storage::StorageError;
pub use storage::*;

// New type exports (explicit — already covered by `pub use graph::types::*` but kept for clarity)
pub use graph::types::AuditEntry;
pub use graph::types::DiffResult;
pub use graph::types::IssueCategory;
pub use graph::types::IssueSeverity;
pub use graph::types::SubgraphResult;
pub use graph::types::SynOption;
pub use graph::types::SynProposal;
pub use graph::types::SynStatus;
pub use graph::types::ValidationIssue;
pub use graph::types::ValidationResult;
