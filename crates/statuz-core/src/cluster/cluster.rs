use std::collections::{HashMap, HashSet, VecDeque};
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
/// 4. Bridges are bidirectional — each field stores its own bridge edges
/// 5. Clusters are isolated from each other — no cross-cluster communication
/// 6. Sharing is done via hash ID + password (file-level, not network)
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

    /// Add a bidirectional bridge between a node in `from_field` and a node in `to_field`.
    ///
    /// Bridges are stored in both fields:
    /// - Forward edge in `from_field`: source_node → target_node, target_field = to_field
    /// - Reverse edge in `to_field`: target_node → source_node, target_field = from_field
    ///
    /// This enables full bidirectional cross-field traversal and impact analysis.
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

        // Forward edge: stored in source field
        let forward_edge = Edge {
            id: format!("{}-fwd", bridge_id),
            source: source_node.clone(),
            target: target_node.clone(),
            relation: Relation::Bridges,
            weight,
            description: description.clone(),
            target_field: Some(to_field.clone()),
            meta: None,
        };

        // Reverse edge: stored in target field
        let reverse_edge = Edge {
            id: format!("{}-rev", bridge_id),
            source: target_node.clone(),
            target: source_node.clone(),
            relation: Relation::Bridges,
            weight,
            description: format!("{} (reverse)", description),
            target_field: Some(from_field.clone()),
            meta: None,
        };

        // Store forward edge in source field
        let source_field = self.fields.get_mut(from_field).unwrap();
        source_field.add_bridge(forward_edge.clone());

        // Store reverse edge in target field
        let target_field = self.fields.get_mut(to_field).unwrap();
        target_field.add_bridge(reverse_edge.clone());

        // Record in cluster bridge registry
        let bridges = self.bridges.get_or_insert_with(HashMap::new);
        bridges.insert(format!("{}-fwd", bridge_id), forward_edge);
        bridges.insert(format!("{}-rev", bridge_id), reverse_edge);

        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Ok(())
    }

    // ─── Cross-Field Traversal ────────────────────────────

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

            // Collect bridge edges to follow before recursive call (avoid borrow conflict)
            let bridges: Vec<(FieldId, NodeId)> = edges.iter()
                .filter(|e| e.target_field.is_some() && e.relation == Relation::Bridges)
                .map(|e| (e.target_field.clone().unwrap(), e.target.clone()))
                .collect();

            for (target_field, target_node) in bridges {
                if !visited_fields.contains(&target_field) && !visited_nodes.contains(&target_node) {
                    visited_fields.insert(target_field);
                    self._traverse_across(
                        &target_field, &target_node,
                        relation, max_depth, depth + 1,
                        visited_fields, visited_nodes, result,
                    );
                }
            }
        }
    }

    // ─── Cross-Field Impact ──────────────────────────────

    /// True cross-field impact analysis.
    ///
    /// "If this node changes, who is affected across the entire cluster?"
    ///
    /// Uses reverse BFS across ALL fields:
    /// 1. Starting from `changed`, find all nodes that directly point to it
    /// 2. Continue reverse traversal across all fields
    /// 3. When crossing a bridge edge, follow the reverse bridge to the other field
    pub fn impact_across_fields(&self, changed: &NodeId) -> ImpactResult {
        let mut affected = HashSet::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(changed.clone());

        while let Some(current) = queue.pop_front() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            for (_, field) in &self.fields {
                // Reverse BFS: who points to `current`?
                let incoming = field.graph.incoming_edges(&current, None);
                for edge in incoming {
                    let source = &edge.source;
                    if !visited.contains(source) && !affected.contains(source) {
                        affected.insert(source.clone());
                        queue.push_back(source.clone());
                    }
                    // If this edge is a bridge, follow it to the OTHER field
                    if edge.relation == Relation::Bridges {
                        // The bridge's source is in the current field's perspective
                        // We need to also traverse the reverse side
                        if let Some(ref target_field) = edge.target_field {
                            // The bridge target points to another field
                            // The source node is the one that's affected
                            if !visited.contains(source) {
                                affected.insert(source.clone());
                                queue.push_back(source.clone());
                            }
                        }
                    }
                }
            }
        }

        affected.remove(changed);
        let mut list: Vec<NodeId> = affected.into_iter().collect();
        list.sort();

        ImpactResult {
            changed: changed.clone(),
            affected: list.clone(),
            blast_radius: list,
            critical_path: false,
        }
    }

    // ─── Cross-Field Path ─────────────────────────────────

    /// Find the shortest path between two nodes, possibly crossing fields.
    /// Returns the path with field-level metadata for each step.
    pub fn path_across_fields(&self, from: &NodeId, to: &NodeId, start_field: &FieldId) -> PathResult {
        let mut visited = HashSet::new();
        visited.insert(from.clone());
        // BFS state: (node_id, current_field, path_edges, field_path)
        let mut queue: VecDeque<(NodeId, FieldId, Vec<Edge>, Vec<FieldId>)> = VecDeque::new();
        queue.push_back((from.clone(), start_field.clone(), vec![], vec![start_field.clone()]));

        while let Some((current, field_id, path, field_path)) = queue.pop_front() {
            if current == *to {
                return PathResult {
                    from: from.clone(),
                    to: to.clone(),
                    path,
                    field_path,
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
                        let mut new_field_path = field_path.clone();
                        if i < edges.len() {
                            new_path.push(edges[i].clone());
                            new_field_path.push(field_id.clone());
                        }
                        queue.push_back((neighbor.clone(), field_id.clone(), new_path, new_field_path));
                    }
                }

                // Follow bridge edges to other fields
                let bridge_edges = field.graph.outgoing_edges(&current, Some("bridges"));
                for e in bridge_edges {
                    if let Some(ref target_field) = e.target_field {
                        if !visited.contains(&e.target) {
                            visited.insert(e.target.clone());
                            let mut new_path = path.clone();
                            new_path.push(e.clone());
                            let mut new_field_path = field_path.clone();
                            new_field_path.push(field_id.clone());
                            new_field_path.push(target_field.clone());
                            queue.push_back((e.target.clone(), target_field.clone(), new_path, new_field_path));
                        }
                    }
                }
            }
        }

        PathResult {
            from: from.clone(),
            to: to.clone(),
            path: vec![],
            field_path: vec![],
            length: -1,
            exists: false,
        }
    }
}