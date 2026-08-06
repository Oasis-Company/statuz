use crate::cluster::cluster::Visibility;
use crate::cluster::Cluster;
use crate::graph::types::{Edge, FieldId};
use crate::storage::{generate_cluster_id, hash_password, verify_password};
use std::collections::HashMap;

// ─── Clone Options ───────────────────────────────────────────

/// Options controlling how a cluster is cloned.
#[derive(Debug, Clone)]
pub struct CloneOptions {
    /// Whether to reset the password (clear password_hash)
    pub reset_password: bool,
    /// Optional new password (if reset_password is false and this is Some, replaces password)
    pub new_password: Option<String>,
    /// Optional new name for the cloned cluster
    pub new_name: Option<String>,
    /// Whether to reset timestamps (created_at, updated_at) to current time
    pub reset_timestamps: bool,
}

impl Default for CloneOptions {
    fn default() -> Self {
        Self {
            reset_password: true,
            new_password: None,
            new_name: None,
            reset_timestamps: true,
        }
    }
}

// ─── Merge Strategy ─────────────────────────────────────────

/// Strategy for handling ID conflicts during merge.
#[derive(Debug, Clone, PartialEq)]
pub enum MergeStrategy {
    /// Skip conflicting items — keep existing, ignore incoming
    Skip,
    /// Overwrite conflicting items — replace with incoming
    Overwrite,
    /// Rename conflicting items — add suffix to incoming IDs
    Rename { suffix: String },
    /// Merge metadata — merge meta fields for nodes
    MergeMeta,
}

impl Default for MergeStrategy {
    fn default() -> Self {
        Self::Skip
    }
}

// ─── Merge Result ────────────────────────────────────────────

/// Detailed report of a merge operation.
#[derive(Debug, Clone)]
pub struct MergeResult {
    pub nodes_added: usize,
    pub nodes_skipped: usize,
    pub nodes_overwritten: usize,
    pub fields_added: usize,
    pub fields_skipped: usize,
    pub fields_overwritten: usize,
    pub edges_added: usize,
    pub edges_skipped: usize,
    pub bridges_added: usize,
    pub warnings: Vec<String>,
}

impl MergeResult {
    pub fn new() -> Self {
        Self {
            nodes_added: 0,
            nodes_skipped: 0,
            nodes_overwritten: 0,
            fields_added: 0,
            fields_skipped: 0,
            fields_overwritten: 0,
            edges_added: 0,
            edges_skipped: 0,
            bridges_added: 0,
            warnings: Vec::new(),
        }
    }
}

// ─── Clone Implementation ────────────────────────────────────

impl Cluster {
    /// Deep clone the cluster with options, generating a new content-addressable ID.
    ///
    /// Unlike `Clone::clone()`, this produces a semantically independent cluster
    /// with a new ID derived from the (possibly modified) content.
    pub fn clone_with_options(&self, options: &CloneOptions) -> Result<Self, String> {
        let mut new_cluster = self.clone();

        // Apply clone options
        if options.reset_password {
            new_cluster.password_hash = None;
        } else if let Some(ref pwd) = options.new_password {
            let hash = hash_password(pwd)?;
            new_cluster.password_hash = Some(hash);
        }

        if let Some(ref name) = options.new_name {
            new_cluster.name = name.clone();
        }

        if options.reset_timestamps {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            new_cluster.created_at = now;
            new_cluster.updated_at = now;
        }

        // Generate new content-addressable ID
        new_cluster.id = generate_cluster_id(&new_cluster);

        Ok(new_cluster)
    }

    /// Convenience: clone with a fresh name and optional password.
    /// Password is reset by default; provide `new_password` to set one.
    pub fn clone_fresh(
        &self,
        new_name: Option<String>,
        new_password: Option<String>,
    ) -> Result<Self, String> {
        self.clone_with_options(&CloneOptions {
            reset_password: new_password.is_none(),
            new_password,
            new_name,
            reset_timestamps: true,
        })
    }
}

// ─── Merge Implementation ────────────────────────────────────

impl Cluster {
    /// Merge nodes, fields, edges, and bridges from a source cluster into this cluster.
    ///
    /// `strategy` controls how ID conflicts are resolved.
    /// Returns a MergeResult with detailed statistics.
    pub fn merge_from(&mut self, source: &Cluster, strategy: &MergeStrategy) -> MergeResult {
        let mut result = MergeResult::new();

        // ─── Merge Nodes ─────────────────────────────────
        for (node_id, node) in &source.nodes {
            if self.nodes.contains_key(node_id) {
                match strategy {
                    MergeStrategy::Skip => {
                        result.nodes_skipped += 1;
                    }
                    MergeStrategy::Overwrite => {
                        self.nodes.insert(node_id.clone(), node.clone());
                        result.nodes_overwritten += 1;
                    }
                    MergeStrategy::Rename { suffix } => {
                        let new_id = format!("{}{}", node_id, suffix);
                        let mut new_node = node.clone();
                        new_node.id = new_id;
                        self.nodes.insert(new_node.id.clone(), new_node);
                        result.nodes_added += 1;
                    }
                    MergeStrategy::MergeMeta => {
                        if let Some(existing) = self.nodes.get_mut(node_id) {
                            // Merge meta: keep existing keys, add missing source keys
                            let mut merged_meta = existing.meta.clone().unwrap_or_default();
                            if let Some(source_meta) = &node.meta {
                                for (k, v) in source_meta {
                                    merged_meta.entry(k.clone()).or_insert_with(|| v.clone());
                                }
                            }
                            existing.meta = if merged_meta.is_empty() {
                                None
                            } else {
                                Some(merged_meta)
                            };
                            result.nodes_overwritten += 1;
                        }
                    }
                }
            } else {
                self.nodes.insert(node_id.clone(), node.clone());
                result.nodes_added += 1;
            }
        }

        // ─── Merge Fields ────────────────────────────────
        for (field_id, field) in &source.fields {
            if self.fields.contains_key(field_id) {
                match strategy {
                    MergeStrategy::Skip => {
                        result.fields_skipped += 1;
                    }
                    MergeStrategy::Overwrite => {
                        self.fields.insert(field_id.clone(), field.clone());
                        result.fields_overwritten += 1;
                    }
                    MergeStrategy::Rename { suffix } => {
                        let new_id = format!("{}{}", field_id, suffix);
                        let mut new_field = field.clone();
                        new_field.id = new_id;
                        self.fields.insert(new_field.id.clone(), new_field);
                        result.fields_added += 1;
                    }
                    MergeStrategy::MergeMeta => {
                        // MergeMeta for fields: same as Overwrite — replace field graph
                        self.fields.insert(field_id.clone(), field.clone());
                        result.fields_overwritten += 1;
                    }
                }
            } else {
                self.fields.insert(field_id.clone(), field.clone());
                result.fields_added += 1;
            }
        }

        // ─── Merge Edges (within each field) ─────────────
        for (field_id, field) in &source.fields {
            let target_field = match self.fields.get_mut(field_id) {
                Some(f) => f,
                None => {
                    result.warnings.push(format!(
                        "Field '{}' has edges but field was not merged (skipped)",
                        field_id
                    ));
                    continue;
                }
            };

            for edge in field.graph.all_edges() {
                // Check if the edge's source and target nodes exist in self
                if !self.nodes.contains_key(&edge.source) {
                    result.warnings.push(format!(
                        "Skipping edge '{}': source node '{}' not found in target cluster",
                        edge.id, edge.source
                    ));
                    result.edges_skipped += 1;
                    continue;
                }
                if !self.nodes.contains_key(&edge.target) {
                    result.warnings.push(format!(
                        "Skipping edge '{}': target node '{}' not found in target cluster",
                        edge.id, edge.target
                    ));
                    result.edges_skipped += 1;
                    continue;
                }

                if target_field.graph.get_edge(&edge.id).is_some() {
                    // Edge already exists — skip (don't overwrite edges)
                    result.edges_skipped += 1;
                } else {
                    target_field.graph.add_edge(edge.clone());
                    result.edges_added += 1;
                }
            }
        }

        // ─── Merge Bridges ───────────────────────────────
        if let Some(source_bridges) = &source.bridges {
            // Phase 1: validate and collect pending bridges (no mutation — avoids
            // holding a borrow of `self.bridges` while calling `self.add_bridge`)
            let mut pending: Vec<(FieldId, Edge)> = Vec::new();
            {
                let bridges = self.bridges.get_or_insert_with(HashMap::new);
                for (bridge_id, bridge) in source_bridges {
                    if bridges.contains_key(bridge_id) {
                        // Bridge already exists — skip
                        continue;
                    }

                    // Validate bridge references
                    let mut valid = true;
                    if !self.nodes.contains_key(&bridge.source) {
                        result.warnings.push(format!(
                            "Skipping bridge '{}': source node '{}' not found in target cluster",
                            bridge_id, bridge.source
                        ));
                        valid = false;
                    }
                    if !self.nodes.contains_key(&bridge.target) {
                        result.warnings.push(format!(
                            "Skipping bridge '{}': target node '{}' not found in target cluster",
                            bridge_id, bridge.target
                        ));
                        valid = false;
                    }
                    if let Some(ref tf) = bridge.target_field {
                        if !self.fields.contains_key(tf) {
                            result.warnings.push(format!(
                                "Skipping bridge '{}': target field '{}' not found in target cluster",
                                bridge_id, tf
                            ));
                            valid = false;
                        }
                    }

                    if valid && bridge.target_field.is_some() {
                        // Find which field in source has this bridge edge
                        for (src_fid, src_field) in &source.fields {
                            if src_field.graph.get_edge(&bridge.id).is_some() {
                                pending.push((src_fid.clone(), bridge.clone()));
                                break;
                            }
                        }
                    }
                }
            }

            // Phase 2: apply bridges through the proper method (ensures bidirectionality)
            for (src_fid, bridge) in pending {
                if let Some(ref tf) = bridge.target_field {
                    let _ = self.add_bridge(
                        &src_fid,
                        tf,
                        &bridge.source,
                        &bridge.target,
                        bridge.description.clone(),
                        bridge.weight,
                    );
                    result.bridges_added += 1;
                }
            }
        }

        // Update timestamp
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // Regenerate ID (content changed)
        self.id = generate_cluster_id(self);

        result
    }
}

// ─── Password Management ─────────────────────────────────────

impl Cluster {
    /// Set a password on this cluster using argon2 hashing.
    pub fn set_password(&mut self, password: &str) -> Result<(), String> {
        let hash = hash_password(password)?;
        self.password_hash = Some(hash);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Ok(())
    }

    /// Change the password: verify the old password first, then set the new one.
    pub fn change_password(
        &mut self,
        old_password: &str,
        new_password: &str,
    ) -> Result<(), String> {
        if !self.unlock(old_password) {
            return Err("Old password is incorrect".to_string());
        }
        self.set_password(new_password)
    }

    /// Clear the password, making the cluster accessible without authentication.
    pub fn clear_password(&mut self) {
        self.password_hash = None;
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// Check if a password is correct for this cluster.
    /// If no password is set, always returns true.
    pub fn unlock(&self, password: &str) -> bool {
        verify_password(self, password)
    }
}

// ─── Visibility Management ──────────────────────────────────

impl Cluster {
    /// Change the visibility of this cluster.
    pub fn set_visibility(&mut self, visibility: Visibility) {
        self.visibility = visibility;
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::types::{Node, NodeStatus};

    /// Create a minimal cluster with a couple of nodes and one field.
    fn make_test_cluster() -> Cluster {
        let mut c = Cluster::new("test-id".into(), "Test".into(), Visibility::Private);
        c.register_node(Node {
            id: "n1".into(),
            type_: "t".into(),
            label: "N1".into(),
            status: NodeStatus::Active,
            meta: None,
        });
        c.register_node(Node {
            id: "n2".into(),
            type_: "t".into(),
            label: "N2".into(),
            status: NodeStatus::Active,
            meta: None,
        });
        c.create_field("f1".into(), "Field 1".into(), None);
        c
    }

    // ─── Clone: Empty Cluster ────────────────────────────

    #[test]
    fn test_clone_empty_cluster() {
        let c = Cluster::new("id".into(), "empty".into(), Visibility::Public);
        let cloned = c.clone_with_options(&CloneOptions::default()).unwrap();
        assert_eq!(cloned.name, "empty");
        assert_eq!(cloned.fields.len(), 0);
        assert_eq!(cloned.nodes.len(), 0);
        assert!(cloned.password_hash.is_none());
        // Content-addressable ID should differ from original
        assert_ne!(cloned.id, c.id, "cloned cluster should have a new ID");
    }

    // ─── Clone: With Password ────────────────────────────

    #[test]
    fn test_clone_with_password() {
        let mut c = make_test_cluster();
        c.set_password("secret123").unwrap();
        let cloned = c
            .clone_with_options(&CloneOptions {
                reset_password: false,
                new_password: None,
                ..CloneOptions::default()
            })
            .unwrap();
        assert!(
            cloned.password_hash.is_some(),
            "password should be preserved"
        );
        assert!(
            cloned.unlock("secret123"),
            "should unlock with original password"
        );
        assert!(!cloned.unlock("wrong"), "wrong password should fail");
    }

    // ─── Clone: Custom Name ──────────────────────────────

    #[test]
    fn test_clone_custom_name() {
        let c = make_test_cluster();
        let cloned = c
            .clone_with_options(&CloneOptions {
                new_name: Some("Renamed Cluster".into()),
                ..CloneOptions::default()
            })
            .unwrap();
        assert_eq!(cloned.name, "Renamed Cluster");
        // Original unchanged
        assert_eq!(c.name, "Test");
    }

    // ─── Merge: Both Empty ───────────────────────────────

    #[test]
    fn test_merge_empty_clusters() {
        let mut target = Cluster::new("t".into(), "Target".into(), Visibility::Private);
        let source = Cluster::new("s".into(), "Source".into(), Visibility::Private);
        let result = target.merge_from(&source, &MergeStrategy::Skip);
        assert_eq!(result.nodes_added, 0);
        assert_eq!(result.fields_added, 0);
        assert_eq!(result.edges_added, 0);
    }

    // ─── Merge: Skip Strategy ────────────────────────────

    #[test]
    fn test_merge_conflict_skip() {
        let mut target = make_test_cluster();
        let source = make_test_cluster();
        let result = target.merge_from(&source, &MergeStrategy::Skip);
        assert_eq!(result.nodes_skipped, 2, "n1, n2 should be skipped");
        assert_eq!(result.fields_skipped, 1, "f1 should be skipped");
        assert_eq!(result.nodes_added, 0);
    }

    // ─── Merge: Overwrite Strategy ───────────────────────

    #[test]
    fn test_merge_conflict_overwrite() {
        let mut target = make_test_cluster();
        let source = make_test_cluster();
        let result = target.merge_from(&source, &MergeStrategy::Overwrite);
        assert_eq!(result.nodes_overwritten, 2, "n1, n2 should be overwritten");
        assert_eq!(result.fields_overwritten, 1, "f1 should be overwritten");
    }

    // ─── Merge: Rename Strategy ──────────────────────────

    #[test]
    fn test_merge_conflict_rename() {
        let mut target = make_test_cluster();
        let source = make_test_cluster();
        let result = target.merge_from(
            &source,
            &MergeStrategy::Rename {
                suffix: "_v2".into(),
            },
        );
        assert_eq!(result.nodes_added, 2, "n1_v2, n2_v2 should be added");
        assert!(
            target.nodes.contains_key("n1_v2"),
            "renamed node n1_v2 should exist"
        );
        assert!(
            target.nodes.contains_key("n2_v2"),
            "renamed node n2_v2 should exist"
        );
        assert!(
            target.fields.contains_key("f1_v2"),
            "renamed field f1_v2 should exist"
        );
        // Originals still present
        assert!(target.nodes.contains_key("n1"));
        assert!(target.fields.contains_key("f1"));
    }

    // ─── Password: Empty ─────────────────────────────────

    #[test]
    fn test_password_empty_string() {
        let mut c = make_test_cluster();
        assert!(
            c.set_password("").is_ok(),
            "empty password should be accepted"
        );
        assert!(c.unlock(""), "should unlock with empty password");
    }

    // ─── Password: Special Characters ────────────────────

    #[test]
    fn test_password_special_chars() {
        let mut c = make_test_cluster();
        let special = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
        assert!(
            c.set_password(special).is_ok(),
            "special char password should be accepted"
        );
        assert!(
            c.unlock(special),
            "should unlock with special char password"
        );
    }

    // ─── Password: Long ──────────────────────────────────

    #[test]
    fn test_password_long() {
        let mut c = make_test_cluster();
        let long = "a".repeat(1000);
        assert!(
            c.set_password(&long).is_ok(),
            "long password should be accepted"
        );
        assert!(c.unlock(&long), "should unlock with long password");
    }

    // ─── Password: Lifecycle ─────────────────────────────

    #[test]
    fn test_password_lifecycle() {
        let mut c = make_test_cluster();
        // Initially no password
        assert!(c.password_hash.is_none(), "initially no password hash");
        assert!(c.unlock("anything"), "no password means always unlocked");

        // Set password
        c.set_password("mypassword").unwrap();
        assert!(c.password_hash.is_some(), "password hash should be set");
        assert!(c.unlock("mypassword"), "correct password should unlock");
        assert!(!c.unlock("wrongpassword"), "wrong password should fail");

        // Change password
        c.change_password("mypassword", "newpassword").unwrap();
        assert!(c.unlock("newpassword"), "new password should work");
        assert!(
            !c.unlock("mypassword"),
            "old password should no longer work"
        );

        // Clear password
        c.clear_password();
        assert!(c.password_hash.is_none(), "password hash should be cleared");
        assert!(c.unlock("anything"), "no password means always unlocked");
    }

    // ─── Visibility ──────────────────────────────────────

    #[test]
    fn test_visibility_change() {
        let mut c = make_test_cluster();
        assert_eq!(c.visibility, Visibility::Private);
        c.set_visibility(Visibility::Public);
        assert_eq!(c.visibility, Visibility::Public);
        c.set_visibility(Visibility::Organization);
        assert_eq!(c.visibility, Visibility::Organization);
    }
}
