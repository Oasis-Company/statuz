use crate::cluster::Cluster;
use crate::cluster::cluster::Visibility;
use crate::graph::types::*;
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
    pub fn clone_fresh(&self, new_name: Option<String>, new_password: Option<String>) -> Result<Self, String> {
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
                            existing.meta = if merged_meta.is_empty() { None } else { Some(merged_meta) };
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
                    result.warnings.push(format!("Field '{}' has edges but field was not merged (skipped)", field_id));
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

                if valid {
                    // Re-add bridge through the proper method to ensure bidirectional
                    if let Some(ref tf) = bridge.target_field {
                        // Find which field in source has this bridge
                        for (src_fid, src_field) in &source.fields {
                            if src_field.graph.get_edge(&bridge.id).is_some() {
                                let _ = self.add_bridge(
                                    src_fid, tf,
                                    &bridge.source, &bridge.target,
                                    bridge.description.clone(), bridge.weight,
                                );
                                result.bridges_added += 1;
                                break;
                            }
                        }
                    }
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
    pub fn change_password(&mut self, old_password: &str, new_password: &str) -> Result<(), String> {
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