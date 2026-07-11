use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::graph::types::*;
use crate::cluster::field::Field;

/// Visibility of a Cluster
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Visibility {
    #[serde(rename = "public")]
    Public,
    #[serde(rename = "private")]
    Private,
    #[serde(rename = "organization")]
    Organization,
}

/// Cluster is the top-level storage container in Statuz.
///
/// Design principles:
/// 1. A Cluster owns all nodes centrally — nodes are shared across fields
/// 2. Each Field owns its own edges (local topology)
/// 3. Cross-field communication happens via Bridge edges (relation: "bridges")
/// 4. Clusters are isolated from each other — no cross-cluster communication
/// 5. Sharing is done via hash ID + password (file-level, not network)
///
/// "A statuz grows by creating clusters, mapping, and building richer representations on top."
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cluster {
    /// blake3 hash of the cluster content (for content-addressable storage)
    pub id: ClusterId,
    pub name: String,
    pub visibility: Visibility,
    /// argon2 password hash (optional, for private/public sharing)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password_hash: Option<String>,
    /// Centralized node registry — all nodes across all fields live here
    pub nodes: HashMap<NodeId, Node>,
    /// The fields (sub-graphs) in this cluster
    pub fields: HashMap<FieldId, Field>,
    /// Bridge edges that connect nodes across fields
    /// Key: bridge_id, Value: bridge edge
    #[serde(skip_serializing_if = "Option::is_none")]
    pub bridges: Option<HashMap<EdgeId, Edge>>,
    pub created_at: u64,
    pub updated_at: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<HashMap<String, String>>,
}

impl Cluster {
    pub fn new(id: ClusterId, name: String, visibility: Visibility) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        Cluster {
            id,
            name,
            visibility,
            password_hash: None,
            nodes: HashMap::new(),
            fields: HashMap::new(),
            bridges: None,
            created_at: now,
            updated_at: now,
            meta: None,
        }
    }

    // ─── Node Management ─────────────────────────────────

    /// Register a node in the cluster's central registry.
    /// This node is then available to all fields.
    pub fn register_node(&mut self, node: Node) {
        self.nodes.insert(node.id.clone(), node);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// Get a node from the central registry.
    pub fn get_node(&self, id: &NodeId) -> Option<&Node> {
        self.nodes.get(id)
    }

    /// Remove a node from the central registry and all fields.
    pub fn unregister_node(&mut self, id: &NodeId) {
        self.nodes.remove(id);
        for field in self.fields.values_mut() {
            field.graph.remove_node(id);
        }
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    // ─── Field Management ─────────────────────────────────

    /// Create a new field in this cluster.
    pub fn create_field(&mut self, id: FieldId, name: String, description: Option<String>) -> &mut Field {
        let field = Field::new(id, name, description);
        self.fields.entry(field.id.clone()).or_insert(field);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.fields.get_mut(&field.id).unwrap()
    }

    /// Get a mutable reference to a field.
    pub fn get_field_mut(&mut self, id: &FieldId) -> Option<&mut Field> {
        self.fields.get_mut(id)
    }

    /// Get a field by ID.
    pub fn get_field(&self, id: &FieldId) -> Option<&Field> {
        self.fields.get(id)
    }

    /// Remove a field and all its edges from the cluster.
    pub fn remove_field(&mut self, id: &FieldId) {
        self.fields.remove(id);
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    // ─── Cross-Field Bridge Communication ─────────────────

    /// Add a bridge edge connecting a node in `from_field` to a node in `to_field`.
    ///
    /// This is the core mechanism for cross-field communication.
    /// The bridge edge is stored in the source field's graph with `target_field` set,
    /// and also recorded in the cluster's bridge registry.
    ///
    /// When you traverse with `cross_field: true`:
    /// - You start in Field A, traverse its local edges
    /// - When you hit a bridge edge, you follow it to the target node in Field B
    /// - From that node in Field B, you can continue traversing Field B's local edges
    ///
    /// This enables "field-hopping" queries without merging edge data.
    pub fn add_bridge(
        &mut self,
        from_field: &FieldId,
        to_field: &FieldId,
        source_node: &NodeId,
        target_node: &NodeId,
        description: String,
        weight: f64,
    ) -> Result<(), String> {
        // Validate fields exist
        if !self.fields.contains_key(from_field) {
            return Err(format!("Source field '{}' not found", from_field));
        }
        if !self.fields.contains_key(to_field) {
            return Err(format!("Target field '{}' not found", to_field));
        }

        // Validate nodes exist in central registry
        if !self.nodes.contains_key(source_node) {
            return Err(format!("Source node '{}' not found in cluster registry", source_node));
        }
        if !self.nodes.contains_key(target_node) {
            return Err(format!("Target node '{}' not found in cluster registry", target_node));
        }

        let bridge_id = format!("bridge-{}-{}-{}-{}", from_field, source_node, to_field, target_node);
        let edge_id = format!("{}-{}", bridge_id, uuid::Uuid::new_v4());

        let bridge = Edge {
            id: edge_id,
            source: source_node.clone(),
            target: target_node.clone(),
            relation: Relation::Bridges,
            weight,
            description,
            target_field: Some(to_field.clone()),
            meta: None,
        };

        // Store in source field's graph
        let field = self.fields.get_mut(from_field).unwrap();
        field.add_bridge(bridge.clone());

        // Record in cluster bridge registry
        let bridges = self.bridges.get_or_insert_with(HashMap::new);
        bridges.insert(bridge_id, bridge);

        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(())
    }

    /// Cross-field traversal: traverse from a node in one field,
    /// following local edges AND bridge edges to other fields.
    ///
    /// Returns a map of field_id → (nodes, edges) found in each field.
    pub fn traverse_across_fields(
        &self,
        start_field: &FieldId,
        from_node: &NodeId,
        relation: Option<&str>,
        max_depth: usize,
    ) -> HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)> {
        let mut result: HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)> = HashMap::new();
        let mut visited_fields = HashSet::new();
        let mut visited_nodes = HashSet::new();

        // Start traversal
        self._traverse_across(
            start_field, from_node, relation, max_depth, 0,
            &mut visited_fields, &mut visited_nodes, &mut result,
        );

        result
    }

    fn _traverse_across(
        &self,
        current_field: &FieldId,
        current_node: &NodeId,
        relation: Option<&str>,
        max_depth: usize,
        depth: usize,
        visited_fields: &mut HashSet<FieldId>,
        visited_nodes: &mut HashSet<NodeId>,
        result: &mut HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)>,
    ) {
        if depth > max_depth {
            return;
        }
        if visited_nodes.contains(current_node) && depth > 0 {
            return;
        }
        visited_nodes.insert(current_node.clone());

        // Traverse in the current field
        if let Some(field) = self.fields.get(current_field) {
            let (nodes, edges) = if relation.is_some() {
                field.graph.traverse(current_node, relation, false)
            } else {
                field.graph.traverse(current_node, None, true)
            };

            // Collect results for this field
            let entry = result.entry(current_field.clone()).or_insert_with(|| (Vec::new(), Vec::new()));
            for nid in &nodes {
                if !visited_nodes.contains(nid) {
                    entry.0.push(nid.clone());
                }
            }
            for e in &edges {
                entry.1.push(e.clone());
            }

            // Follow bridge edges to other fields
            for e in &edges {
                if let Some(ref target_field) = e.target_field {
                    if !visited_fields.contains(target_field) {
                        visited_fields.insert(target_field.clone());
                        let target_node = if e.source == *current_node {
                            &e.target
                        } else {
                            &e.source
                        };
                        self._traverse_across(
                            target_field,
                            target_node,
                            relation,
                            max_depth,
                            depth + 1,
                            visited_fields,
                            visited_nodes,
                            result,
                        );
                    }
                }
            }
        }
    }

    // ─── Cross-Field Impact ──────────────────────────────

    /// Impact analysis across all fields:
    /// "If this node changes, who is affected across the entire cluster?"
    pub fn impact_across_fields(&self, changed: &NodeId) -> Vec<ImpactResult> {
        let mut results = Vec::new();
        for (field_id, field) in &self.fields {
            let mut impact = field.graph.impact(changed);
            impact.blast_radius = self.reachable_across_fields(changed, &field_id, 3);
            results.push(impact);
        }
        results
    }

    /// Cross-field reachability: find all nodes reachable from `from`
    /// across fields, up to `max_depth` field hops.
    pub fn reachable_across_fields(&self, from: &NodeId, start_field: &FieldId, max_depth: usize) -> Vec<NodeId> {
        let mut result = HashSet::new();
        let mut visited_fields = HashSet::new();
        let mut visited_nodes = HashSet::new();

        self._reachable_across(from, start_field, max_depth, 0, &mut visited_fields, &mut visited_nodes, &mut result);

        result.into_iter().collect()
    }

    fn _reachable_across(
        &self,
        node: &NodeId,
        field_id: &FieldId,
        max_depth: usize,
        depth: usize,
        visited_fields: &mut HashSet<FieldId>,
        visited_nodes: &mut HashSet<NodeId>,
        result: &mut HashSet<NodeId>,
    ) {
        if depth > max_depth || visited_nodes.contains(node) {
            return;
        }
        visited_nodes.insert(node.clone());

        if let Some(field) = self.fields.get(field_id) {
            let reachable = field.graph.reachable(node);
            for n in reachable {
                if !visited_nodes.contains(&n) {
                    result.insert(n.clone());
                    visited_nodes.insert(n.clone());
                }
            }

            // Follow bridges
            let outgoing = field.graph.outgoing_edges(node, Some("bridges"));
            for e in outgoing {
                if let Some(ref target_field) = e.target_field {
                    if !visited_fields.contains(target_field) {
                        visited_fields.insert(target_field.clone());
                        self._reachable_across(
                            &e.target,
                            target_field,
                            max_depth,
                            depth + 1,
                            visited_fields,
                            visited_nodes,
                            result,
                        );
                    }
                }
            }
        }
    }

    // ─── Cross-Field Path ─────────────────────────────────

    /// Find the shortest path between two nodes, possibly crossing fields.
    pub fn path_across_fields(&self, from: &NodeId, to: &NodeId, start_field: &FieldId) -> PathResult {
        // BFS over all fields
        let mut visited = HashSet::new();
        visited.insert(from.clone());
        let mut queue: VecDeque<(NodeId, FieldId, Vec<Edge>)> = VecDeque::new();
        queue.push_back((from.clone(), start_field.clone(), vec![]));

        while let Some((current, field_id, path)) = queue.pop_front() {
            if current == *to {
                return PathResult {
                    from: from.clone(),
                    to: to.clone(),
                    path,
                    length: path.len() as i32,
                    exists: true,
                };
            }

            if let Some(field) = self.fields.get(&field_id) {
                // Traverse local edges
                let (neighbors, edges) = field.graph.traverse(&current, None, true);
                for (i, neighbor) in neighbors.iter().enumerate() {
                    if !visited.contains(neighbor) {
                        visited.insert(neighbor.clone());
                        let mut new_path = path.clone();
                        if i < edges.len() {
                            new_path.push(edges[i].clone());
                        }
                        queue.push_back((neighbor.clone(), field_id.clone(), new_path));
                    }
                }

                // Follow bridge edges
                let bridge_edges = field.graph.outgoing_edges(&current, Some("bridges"));
                for e in bridge_edges {
                    if let Some(ref target_field) = e.target_field {
                        if !visited.contains(&e.target) {
                            visited.insert(e.target.clone());
                            let mut new_path = path.clone();
                            new_path.push(e.clone());
                            queue.push_back((e.target.clone(), target_field.clone(), new_path));
                        }
                    }
                }
            }
        }

        PathResult {
            from: from.clone(),
            to: to.clone(),
            path: vec![],
            length: -1,
            exists: false,
        }
    }
}

use std::collections::HashSet;
use std::collections::VecDeque;