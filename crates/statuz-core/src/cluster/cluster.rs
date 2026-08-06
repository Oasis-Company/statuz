use crate::cluster::field::Field;
use crate::graph::types::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

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
    pub fn get_node(&self, id: &str) -> Option<&Node> {
        self.nodes.get(id)
    }

    /// Remove a node from the central registry and all fields.
    pub fn unregister_node(&mut self, id: &str) {
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
    pub fn create_field(
        &mut self,
        id: FieldId,
        name: String,
        description: Option<String>,
    ) -> &mut Field {
        let fid = id.clone();
        self.fields
            .entry(fid.clone())
            .or_insert_with(|| Field::new(id, name, description));
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.fields.get_mut(&fid).unwrap()
    }

    /// Get a mutable reference to a field.
    pub fn get_field_mut(&mut self, id: &str) -> Option<&mut Field> {
        self.fields.get_mut(id)
    }

    /// Get a field by ID.
    pub fn get_field(&self, id: &str) -> Option<&Field> {
        self.fields.get(id)
    }

    /// Remove a field and all its edges from the cluster.
    pub fn remove_field(&mut self, id: &str) {
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
        from_field: &str,
        to_field: &str,
        source_node: &str,
        target_node: &str,
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
            return Err(format!(
                "Source node '{}' not found in cluster registry",
                source_node
            ));
        }
        if !self.nodes.contains_key(target_node) {
            return Err(format!(
                "Target node '{}' not found in cluster registry",
                target_node
            ));
        }

        let bridge_id = format!(
            "bridge-{}-{}-{}-{}",
            from_field, source_node, to_field, target_node
        );

        // Forward edge: stored in source field
        let forward_edge = Edge {
            id: format!("{}-fwd", bridge_id),
            source: source_node.to_string(),
            target: target_node.to_string(),
            relation: Relation::Bridges,
            weight,
            description: description.clone(),
            target_field: Some(to_field.to_string()),
            meta: None,
        };

        // Reverse edge: stored in target field
        let reverse_edge = Edge {
            id: format!("{}-rev", bridge_id),
            source: target_node.to_string(),
            target: source_node.to_string(),
            relation: Relation::Bridges,
            weight,
            description: format!("{} (reverse)", description),
            target_field: Some(from_field.to_string()),
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
        start_field: &str,
        from_node: &str,
        relation: Option<&str>,
        max_depth: usize,
    ) -> HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)> {
        let mut result: HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)> = HashMap::new();
        let mut visited_fields = HashSet::new();
        let mut visited_nodes = HashSet::new();

        self._traverse_across(
            start_field,
            from_node,
            relation,
            max_depth,
            0,
            &mut visited_fields,
            &mut visited_nodes,
            &mut result,
        );

        result
    }

    fn _traverse_across(
        &self,
        current_field: &str,
        current_node: &str,
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
        if visited_nodes.contains(current_node) {
            return;
        }
        visited_nodes.insert(current_node.to_string());

        if let Some(field) = self.fields.get(current_field) {
            // Record the current node as part of this field's discovered set
            // (including bridge entry points like the bridge target in f2)
            let entry = result
                .entry(current_field.to_string())
                .or_insert_with(|| (Vec::new(), Vec::new()));
            if !entry.0.iter().any(|n| n == current_node) {
                entry.0.push(current_node.to_string());
            }

            let (_, edges) = field.graph.traverse(current_node, relation, true);

            // Collect results for this field
            for e in &edges {
                entry.1.push((*e).clone());
            }
            // Local edges' targets belong to THIS field's node list; bridge
            // targets belong to the target field (added via the recursion below)
            for e in &edges {
                let is_bridge = e.relation == Relation::Bridges && e.target_field.is_some();
                if !is_bridge && !visited_nodes.contains(&e.target) {
                    entry.0.push(e.target.clone());
                }
            }

            // Continue BFS along every edge: bridge edges hop to the target field,
            // local edges continue within the current field (depth counts total hops)
            let next: Vec<(FieldId, NodeId, bool)> = edges
                .iter()
                .map(|e| {
                    let is_bridge = e.relation == Relation::Bridges && e.target_field.is_some();
                    let target_field = if is_bridge {
                        e.target_field.clone().unwrap()
                    } else {
                        current_field.to_string()
                    };
                    (target_field, e.target.clone(), is_bridge)
                })
                .collect();

            for (target_field, target_node, is_bridge) in next {
                if !visited_nodes.contains(&target_node) {
                    if is_bridge {
                        visited_fields.insert(target_field.clone());
                    }
                    self._traverse_across(
                        &target_field,
                        &target_node,
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

    // ─── Cross-Field Impact ──────────────────────────────

    /// True cross-field impact analysis.
    ///
    /// "If this node changes, who is affected across the entire cluster?"
    ///
    /// Uses reverse BFS across ALL fields:
    /// 1. Starting from `changed`, find all nodes that directly point to it
    /// 2. Continue reverse traversal across all fields
    /// 3. When crossing a bridge edge, follow the reverse bridge to the other field
    pub fn impact_across_fields(&self, changed: &str) -> ImpactResult {
        let mut affected = HashSet::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(changed.to_string());

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
                    if edge.relation == Relation::Bridges && edge.target_field.is_some() {
                        // The bridge's source is in the current field's perspective
                        // We need to also traverse the reverse side
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

        affected.remove(changed);
        let mut list: Vec<NodeId> = affected.into_iter().collect();
        list.sort();

        ImpactResult {
            changed: changed.to_string(),
            affected: list.clone(),
            blast_radius: list,
            critical_path: false,
        }
    }

    // ─── Cross-Field Path ─────────────────────────────────

    /// Find the shortest path between two nodes, possibly crossing fields.
    /// Returns the path with field-level metadata for each step.
    pub fn path_across_fields(&self, from: &str, to: &str, start_field: &str) -> PathResult {
        let mut visited = HashSet::new();
        visited.insert(from.to_string());
        // BFS state: (node_id, current_field, path_edges, field_path)
        let mut queue: VecDeque<(NodeId, FieldId, Vec<Edge>, Vec<FieldId>)> = VecDeque::new();
        queue.push_back((
            from.to_string(),
            start_field.to_string(),
            vec![],
            vec![start_field.to_string()],
        ));

        while let Some((current, field_id, path, field_path)) = queue.pop_front() {
            if current == *to {
                let length = path.len() as i32;
                return PathResult {
                    from: from.to_string(),
                    to: to.to_string(),
                    path,
                    field_path,
                    length,
                    exists: true,
                };
            }

            if let Some(field) = self.fields.get(&field_id) {
                // Traverse local edges (bridges handled separately below — they
                // must enqueue with the TARGET field, not the current one)
                let (neighbors, edges) = field.graph.traverse(&current, None, false);
                for (i, neighbor) in neighbors.iter().enumerate() {
                    if !visited.contains(neighbor) {
                        visited.insert(neighbor.clone());
                        let mut new_path = path.clone();
                        let mut new_field_path = field_path.clone();
                        if i < edges.len() {
                            new_path.push(edges[i].clone());
                            new_field_path.push(field_id.clone());
                        }
                        queue.push_back((
                            neighbor.clone(),
                            field_id.clone(),
                            new_path,
                            new_field_path,
                        ));
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
                            queue.push_back((
                                e.target.clone(),
                                target_field.clone(),
                                new_path,
                                new_field_path,
                            ));
                        }
                    }
                }
            }
        }

        PathResult {
            from: from.to_string(),
            to: to.to_string(),
            path: vec![],
            field_path: vec![],
            length: -1,
            exists: false,
        }
    }
}

// ─── Diff ─────────────────────────────────────────────

const WEIGHT_EPSILON: f64 = 1e-10;

/// Compare two nodes for equality, excluding meta field.
fn nodes_differ(a: &Node, b: &Node) -> bool {
    a.id != b.id || a.type_ != b.type_ || a.label != b.label || a.status != b.status
}

/// Compare two edges for equality, using EPSILON for weight comparison.
fn edges_differ(a: &Edge, b: &Edge) -> bool {
    a.id != b.id
        || a.source != b.source
        || a.target != b.target
        || a.relation != b.relation
        || (a.weight - b.weight).abs() > WEIGHT_EPSILON
        || a.description != b.description
        || a.target_field != b.target_field
}

impl Cluster {
    /// Compare self (old) with other (new) and return the differences.
    ///
    /// Comparison rules:
    /// - Node/edge/field matching is by ID
    /// - `meta` field is excluded from comparison (None == Some({}))
    /// - Edge weight uses EPSILON tolerance
    /// - Bridge edges are compared separately from field edges
    pub fn diff(&self, other: &Cluster) -> DiffResult {
        // ─── Nodes ─────────────────────────────────
        let mut added_nodes = Vec::new();
        let mut removed_nodes = Vec::new();
        let mut changed_nodes = Vec::new();

        for (id, node) in &other.nodes {
            if !self.nodes.contains_key(id) {
                added_nodes.push(node.clone());
            }
        }
        for (id, node) in &self.nodes {
            if !other.nodes.contains_key(id) {
                removed_nodes.push(node.clone());
            }
        }
        for (id, self_node) in &self.nodes {
            if let Some(other_node) = other.nodes.get(id) {
                if nodes_differ(self_node, other_node) {
                    changed_nodes.push((self_node.clone(), other_node.clone()));
                }
            }
        }

        // ─── Edges (across all fields) ─────────────
        let self_edges = Self::collect_all_edges(self);
        let other_edges = Self::collect_all_edges(other);

        let mut added_edges = Vec::new();
        let mut removed_edges = Vec::new();
        let mut changed_edges = Vec::new();

        for (id, edge) in &other_edges {
            if !self_edges.contains_key(id) {
                added_edges.push(edge.clone());
            }
        }
        for (id, edge) in &self_edges {
            if !other_edges.contains_key(id) {
                removed_edges.push(edge.clone());
            }
        }
        for (id, self_edge) in &self_edges {
            if let Some(other_edge) = other_edges.get(id) {
                if edges_differ(self_edge, other_edge) {
                    changed_edges.push((self_edge.clone(), other_edge.clone()));
                }
            }
        }

        // ─── Fields ────────────────────────────────
        let mut added_fields = Vec::new();
        let mut removed_fields = Vec::new();

        for fid in other.fields.keys() {
            if !self.fields.contains_key(fid) {
                added_fields.push(fid.clone());
            }
        }
        for fid in self.fields.keys() {
            if !other.fields.contains_key(fid) {
                removed_fields.push(fid.clone());
            }
        }

        // ─── Bridges ───────────────────────────────
        let self_bridges = self.bridges.clone().unwrap_or_default();
        let other_bridges = other.bridges.clone().unwrap_or_default();

        let mut added_bridges = Vec::new();
        let mut removed_bridges = Vec::new();

        for (id, edge) in &other_bridges {
            if !self_bridges.contains_key(id) {
                added_bridges.push(edge.clone());
            }
        }
        for (id, edge) in &self_bridges {
            if !other_bridges.contains_key(id) {
                removed_bridges.push(edge.clone());
            }
        }

        DiffResult {
            added_nodes,
            removed_nodes,
            changed_nodes,
            added_edges,
            removed_edges,
            changed_edges,
            added_fields,
            removed_fields,
            added_bridges,
            removed_bridges,
        }
    }

    /// Collect all non-bridge edges from all fields into a HashMap.
    fn collect_all_edges(cluster: &Cluster) -> HashMap<EdgeId, Edge> {
        let mut all = HashMap::new();
        for field in cluster.fields.values() {
            for edge in field.graph.all_edges() {
                all.insert(edge.id.clone(), edge.clone());
            }
        }
        all
    }
}

// ─── Validate ────────────────────────────────────────

impl Cluster {
    /// Validate the entire Cluster for internal consistency.
    ///
    /// Checks:
    /// 1. Orphan edges in each field — source/target node not in graph (via GraphEngine::validate)
    /// 2. Foreign node references — edge references node not in cluster registry
    /// 3. Broken bridges — bridge edge references non-existent target_field
    /// 4. Orphan nodes — registered but not present in any field (Warning only)
    pub fn validate(&self) -> ValidationResult {
        let mut issues = Vec::new();

        // ─── 1. Field-level validation + foreign node check ──
        for (fid, field) in &self.fields {
            // Delegate to GraphEngine::validate for orphan edges.
            // In cluster context, edges may reference cluster-registry nodes that are
            // not cached in the field's GraphEngine node map — those are NOT orphans
            // (the registry is the authoritative node source), so drop those issues.
            let field_result = field.graph.validate();
            for issue in field_result.issues {
                let references_registry_node = issue
                    .affected_ids
                    .iter()
                    .any(|id| self.nodes.contains_key(id));
                if issue.category == IssueCategory::OrphanEdge && references_registry_node {
                    continue;
                }
                issues.push(issue);
            }

            // Check all field edges for foreign node references
            for edge in field.graph.all_edges() {
                if !self.nodes.contains_key(&edge.source) {
                    issues.push(ValidationIssue {
                        severity: IssueSeverity::Error,
                        category: IssueCategory::ForeignNode,
                        message: format!(
                            "Field '{}' edge '{}' references node '{}' not in cluster registry",
                            fid, edge.id, edge.source
                        ),
                        affected_ids: vec![edge.id.clone(), edge.source.clone(), fid.clone()],
                    });
                }
                if !self.nodes.contains_key(&edge.target) {
                    issues.push(ValidationIssue {
                        severity: IssueSeverity::Error,
                        category: IssueCategory::ForeignNode,
                        message: format!(
                            "Field '{}' edge '{}' references node '{}' not in cluster registry",
                            fid, edge.id, edge.target
                        ),
                        affected_ids: vec![edge.id.clone(), edge.target.clone(), fid.clone()],
                    });
                }

                // Check bridge edges' target_field existence
                if let Some(ref tf) = edge.target_field {
                    if !self.fields.contains_key(tf) {
                        issues.push(ValidationIssue {
                            severity: IssueSeverity::Error,
                            category: IssueCategory::BrokenBridge,
                            message: format!(
                                "Bridge edge '{}' in field '{}' references non-existent field '{}'",
                                edge.id, fid, tf
                            ),
                            affected_ids: vec![edge.id.clone(), fid.clone(), tf.clone()],
                        });
                    }
                }
            }
        }

        // ─── 2. Bridge registry consistency ────────────────
        if let Some(bridges) = &self.bridges {
            for (bridge_id, bridge) in bridges {
                if !self.nodes.contains_key(&bridge.source) {
                    issues.push(ValidationIssue {
                        severity: IssueSeverity::Error,
                        category: IssueCategory::BrokenBridge,
                        message: format!(
                            "Bridge '{}' references non-existent source node '{}'",
                            bridge_id, bridge.source
                        ),
                        affected_ids: vec![bridge_id.clone(), bridge.source.clone()],
                    });
                }
                if !self.nodes.contains_key(&bridge.target) {
                    issues.push(ValidationIssue {
                        severity: IssueSeverity::Error,
                        category: IssueCategory::BrokenBridge,
                        message: format!(
                            "Bridge '{}' references non-existent target node '{}'",
                            bridge_id, bridge.target
                        ),
                        affected_ids: vec![bridge_id.clone(), bridge.target.clone()],
                    });
                }
                if let Some(ref tf) = bridge.target_field {
                    if !self.fields.contains_key(tf) {
                        issues.push(ValidationIssue {
                            severity: IssueSeverity::Error,
                            category: IssueCategory::BrokenBridge,
                            message: format!(
                                "Bridge '{}' references non-existent target field '{}'",
                                bridge_id, tf
                            ),
                            affected_ids: vec![bridge_id.clone(), tf.clone()],
                        });
                    }
                }
            }
        }

        // ─── 3. Orphan nodes (warning only) ────────────────
        // A node is "present" in a field if it appears as an edge endpoint there
        // (field GraphEngines may not cache nodes — the registry is authoritative).
        if !self.fields.is_empty() {
            for (nid, _) in &self.nodes {
                let mut found = false;
                'fields: for field in self.fields.values() {
                    if field.graph.get_node(nid).is_some() {
                        found = true;
                        break;
                    }
                    for edge in field.graph.all_edges() {
                        if &edge.source == nid || &edge.target == nid {
                            found = true;
                            break 'fields;
                        }
                    }
                }
                if !found {
                    issues.push(ValidationIssue {
                        severity: IssueSeverity::Warning,
                        category: IssueCategory::OrphanNode,
                        message: format!(
                            "Node '{}' is registered but not present in any field",
                            nid
                        ),
                        affected_ids: vec![nid.clone()],
                    });
                }
            }
        }

        let is_valid = issues.iter().all(|i| i.severity != IssueSeverity::Error);
        ValidationResult { issues, is_valid }
    }
}

// ─── Subgraph Wrapper ────────────────────────────────

impl Cluster {
    /// Extract a subgraph from a specific field.
    /// Returns an error if the field does not exist.
    pub fn subgraph(
        &self,
        field_id: &str,
        seeds: &[NodeId],
        depth: Option<usize>,
        relation: Option<&str>,
    ) -> Result<SubgraphResult, String> {
        let field = self
            .fields
            .get(field_id)
            .ok_or_else(|| format!("Field '{}' not found in cluster", field_id))?;
        let mut result = field.graph.subgraph(seeds, depth, relation);
        // Enrich node data from the cluster registry (field GraphEngines may not
        // cache nodes; the engine returns id-only placeholders for cache misses)
        result.nodes = result
            .nodes
            .iter()
            .map(|n| self.nodes.get(&n.id).cloned().unwrap_or_else(|| n.clone()))
            .collect();
        // Ensure seed nodes are present even if the engine didn't cache them
        for seed in seeds {
            if !result.nodes.iter().any(|n| &n.id == seed) {
                if let Some(node) = self.nodes.get(seed) {
                    result.nodes.push(node.clone());
                }
            }
        }
        Ok(result)
    }
}

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, type_: &str, label: &str, status: NodeStatus) -> Node {
        Node {
            id: id.into(),
            type_: type_.into(),
            label: label.into(),
            status,
            meta: None,
        }
    }

    /// Build a test cluster with:
    ///   Nodes: a, b, c, d
    ///   Field "f1": a -> b -> c  (depends_on)
    ///   Field "f2": (empty)
    ///   Bridge: f1.a → f2.d
    fn build_test_cluster() -> Cluster {
        let mut cluster = Cluster::new(
            "test-cluster".into(),
            "Test Cluster".into(),
            Visibility::Private,
        );
        for id in &["a", "b", "c", "d"] {
            cluster.register_node(Node {
                id: id.to_string(),
                type_: "test".into(),
                label: id.to_string(),
                status: NodeStatus::Active,
                meta: None,
            });
        }
        cluster.create_field("f1".into(), "Field 1".into(), None);
        cluster.create_field("f2".into(), "Field 2".into(), None);

        // Add edges in f1: a -> b -> c
        let f1 = cluster.fields.get_mut("f1").unwrap();
        f1.graph.add_edge(Edge {
            id: "e1".into(),
            source: "a".into(),
            target: "b".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });
        f1.graph.add_edge(Edge {
            id: "e2".into(),
            source: "b".into(),
            target: "c".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });

        // Bridge: f1.a → f2.d
        cluster
            .add_bridge("f1", "f2", "a", "d", "bridge".into(), 1.0)
            .unwrap();

        cluster
    }

    // ─── Empty Cluster ───────────────────────────────────

    #[test]
    fn test_empty_cluster() {
        let c = Cluster::new("id".into(), "empty".into(), Visibility::Public);
        assert_eq!(c.fields.len(), 0, "new cluster should have zero fields");
        assert_eq!(c.nodes.len(), 0, "new cluster should have zero nodes");
        assert!(c.bridges.is_none(), "new cluster should have no bridges");
    }

    // ─── Add Field ───────────────────────────────────────

    #[test]
    fn test_add_field() {
        let mut c = Cluster::new("id".into(), "test".into(), Visibility::Public);
        c.create_field("arch".into(), "Architecture".into(), None);
        assert_eq!(c.fields.len(), 1);
        assert!(
            c.get_field("arch").is_some(),
            "field should exist after creation"
        );
    }

    // ─── Register Node ───────────────────────────────────

    #[test]
    fn test_register_node() {
        let mut c = Cluster::new("id".into(), "test".into(), Visibility::Organization);
        let node = Node {
            id: "n1".into(),
            type_: "test".into(),
            label: "N1".into(),
            status: NodeStatus::Active,
            meta: None,
        };
        c.register_node(node);
        assert!(
            c.get_node("n1").is_some(),
            "node should be found after registration"
        );
    }

    // ─── Unregister Node ─────────────────────────────────

    #[test]
    fn test_unregister_node() {
        let mut c = build_test_cluster();
        assert!(c.get_node("a").is_some());
        c.unregister_node("a");
        assert!(
            c.get_node("a").is_none(),
            "node should be removed from registry"
        );
        // Node should also be removed from all fields
        for field in c.fields.values() {
            assert!(
                field.graph.get_node("a").is_none(),
                "node should be removed from field '{}'",
                field.name
            );
        }
    }

    // ─── Empty Field Bridge ──────────────────────────────

    #[test]
    fn test_empty_field_bridge() {
        let mut c = Cluster::new("id".into(), "test".into(), Visibility::Private);
        for id in &["x", "y"] {
            c.register_node(Node {
                id: id.to_string(),
                type_: "t".into(),
                label: id.to_string(),
                status: NodeStatus::Active,
                meta: None,
            });
        }
        c.create_field("f1".into(), "F1".into(), None);
        c.create_field("f2".into(), "F2".into(), None);
        let result = c.add_bridge("f1", "f2", "x", "y", "bridge".into(), 1.0);
        assert!(result.is_ok(), "bridge between empty fields should succeed");

        // Forward bridge should be visible in f1
        let f1 = c.get_field("f1").unwrap();
        let (nodes, _) = f1.graph.traverse("x", Some("bridges"), false);
        assert!(
            nodes.contains(&"y".to_string()),
            "bridge target 'y' should be reachable from 'x' in f1"
        );
    }

    // ─── Duplicate Bridge ────────────────────────────────

    #[test]
    fn test_duplicate_bridge() {
        let mut c = build_test_cluster();
        // Adding the same bridge again should not error
        let result = c.add_bridge("f1", "f2", "a", "d", "duplicate".into(), 1.0);
        assert!(result.is_ok(), "duplicate bridge should not error");
        // Bridge entries exist (overwritten in HashMap, same keys)
        let bridges = c.bridges.as_ref().unwrap();
        assert_eq!(
            bridges.len(),
            2,
            "should still have exactly 2 bridge entries (fwd + rev)"
        );
    }

    // ─── Remove Field ────────────────────────────────────

    #[test]
    fn test_remove_field() {
        let mut c = build_test_cluster();
        assert_eq!(c.fields.len(), 2);
        c.remove_field("f1");
        assert_eq!(c.fields.len(), 1, "one field should remain after removal");
        assert!(
            c.get_field("f1").is_none(),
            "removed field should not be accessible"
        );
        assert!(
            c.get_field("f2").is_some(),
            "other field should still exist"
        );
    }

    // ─── Cross-Field Traverse ────────────────────────────

    #[test]
    fn test_traverse_across_fields() {
        let c = build_test_cluster();
        let result = c.traverse_across_fields("f1", "a", None, 3);
        // Should find nodes in f1
        assert!(result.contains_key("f1"), "should have results for f1");
        let (f1_nodes, _) = result.get("f1").unwrap();
        assert!(f1_nodes.contains(&"b".to_string()), "f1 should contain 'b'");
        assert!(f1_nodes.contains(&"c".to_string()), "f1 should contain 'c'");
        // Should cross the bridge to f2
        assert!(result.contains_key("f2"), "should cross bridge to f2");
        let (f2_nodes, _) = result.get("f2").unwrap();
        assert!(
            f2_nodes.contains(&"d".to_string()),
            "f2 should contain 'd' via bridge"
        );
    }

    // ─── Cross-Field Impact ──────────────────────────────

    #[test]
    fn test_impact_across_fields() {
        let c = build_test_cluster();
        // impact("a") looks for incoming edges to "a" across all fields.
        // In f2, the reverse bridge "d -> a" is an incoming edge to "a",
        // so "d" is affected when "a" changes.
        let impact = c.impact_across_fields("a");
        assert!(
            impact.affected.contains(&"d".to_string()),
            "reverse bridge should make 'd' affected when 'a' changes"
        );
    }

    #[test]
    fn test_impact_across_fields_no_effect() {
        let mut c = build_test_cluster();
        // A registered node with no edges anywhere affects no one
        c.register_node(Node {
            id: "iso".into(),
            type_: "test".into(),
            label: "Isolated".into(),
            status: NodeStatus::Active,
            meta: None,
        });
        let impact = c.impact_across_fields("iso");
        assert!(
            impact.affected.is_empty(),
            "isolated node should affect no one"
        );
        // "d" has one incoming bridge edge (f1.a → f2.d), so changing d affects a
        let impact_d = c.impact_across_fields("d");
        assert_eq!(
            impact_d.affected,
            vec!["a".to_string()],
            "changing 'd' should affect the bridge source 'a'"
        );
    }

    // ─── Cross-Field Path ────────────────────────────────

    #[test]
    fn test_path_across_fields_same_field() {
        let c = build_test_cluster();
        // a -> b -> c within f1
        let path = c.path_across_fields("a", "c", "f1");
        assert!(path.exists, "path a->c within f1 should exist");
        assert_eq!(path.length, 2, "a->b->c is 2 steps");
    }

    #[test]
    fn test_path_across_fields_cross_bridge() {
        let c = build_test_cluster();
        // a -> d via bridge (f1.a → f2.d)
        let path = c.path_across_fields("a", "d", "f1");
        assert!(path.exists, "path a->d across bridge should exist");
        assert_eq!(path.length, 1, "a->d via bridge is 1 step");
    }

    #[test]
    fn test_path_across_fields_nonexistent() {
        let c = build_test_cluster();
        // "c" is a leaf in f1 (no outgoing edges), so no path from c to d
        let path = c.path_across_fields("c", "d", "f1");
        assert!(!path.exists, "no path from leaf c to d");
        assert_eq!(path.length, -1);

        // But d IS reachable from a: a →d via the f1→f2 bridge (stored as a→d in f1)
        let path2 = c.path_across_fields("a", "d", "f1");
        assert!(path2.exists, "bridge path a → d should exist");
        assert_eq!(path2.length, 1);
    }

    // ─── Diff Tests ──────────────────────────────────────

    #[test]
    fn test_diff_identical_clusters() {
        let c1 = build_test_cluster();
        let c2 = build_test_cluster();
        let diff = c1.diff(&c2);
        assert!(diff.added_nodes.is_empty());
        assert!(diff.removed_nodes.is_empty());
        assert!(diff.changed_nodes.is_empty());
        assert!(diff.added_edges.is_empty());
        assert!(diff.removed_edges.is_empty());
        assert!(diff.changed_edges.is_empty());
        assert!(diff.added_fields.is_empty());
        assert!(diff.removed_fields.is_empty());
        assert!(diff.added_bridges.is_empty());
        assert!(diff.removed_bridges.is_empty());
    }

    #[test]
    fn test_diff_added_node() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        c2.register_node(node("new-node", "test", "New", NodeStatus::Active));
        let diff = c1.diff(&c2);
        assert_eq!(diff.added_nodes.len(), 1);
        assert_eq!(diff.added_nodes[0].id, "new-node");
    }

    #[test]
    fn test_diff_removed_node() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        c2.unregister_node("d");
        let diff = c1.diff(&c2);
        assert_eq!(diff.removed_nodes.len(), 1);
        assert_eq!(diff.removed_nodes[0].id, "d");
    }

    #[test]
    fn test_diff_changed_node_label() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        if let Some(node) = c2.nodes.get_mut("a") {
            node.label = "A-Modified".into();
        }
        let diff = c1.diff(&c2);
        assert_eq!(diff.changed_nodes.len(), 1);
        assert_eq!(diff.changed_nodes[0].0.id, "a");
        assert_eq!(diff.changed_nodes[0].1.label, "A-Modified");
    }

    #[test]
    fn test_diff_added_field() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        c2.create_field("f3".into(), "Field 3".into(), None);
        let diff = c1.diff(&c2);
        assert_eq!(diff.added_fields.len(), 1);
        assert_eq!(diff.added_fields[0], "f3");
    }

    #[test]
    fn test_diff_removed_field() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        c2.remove_field("f1");
        let diff = c1.diff(&c2);
        assert_eq!(diff.removed_fields.len(), 1);
        assert_eq!(diff.removed_fields[0], "f1");
    }

    #[test]
    fn test_diff_added_edge() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        let f2 = c2.fields.get_mut("f2").unwrap();
        f2.graph.add_edge(Edge {
            id: "e-new".into(),
            source: "a".into(),
            target: "d".into(),
            relation: Relation::Informs,
            weight: 0.5,
            description: "new edge".into(),
            target_field: None,
            meta: None,
        });
        let diff = c1.diff(&c2);
        assert_eq!(diff.added_edges.len(), 1);
        assert_eq!(diff.added_edges[0].id, "e-new");
    }

    #[test]
    fn test_diff_removed_edge() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        // Remove edge e1 from c2's field f1
        let f2 = c2.fields.get_mut("f1").unwrap();
        f2.graph.remove_edge("e1");
        let diff = c1.diff(&c2);
        assert_eq!(diff.removed_edges.len(), 1);
        assert_eq!(diff.removed_edges[0].id, "e1");
    }

    #[test]
    fn test_diff_empty_vs_populated() {
        let empty = Cluster::new("empty".into(), "Empty".into(), Visibility::Private);
        let c = build_test_cluster();
        let diff = empty.diff(&c);
        assert_eq!(diff.added_nodes.len(), 4, "cluster has 4 registered nodes");
        assert_eq!(diff.added_fields.len(), 2, "cluster has 2 fields");
        assert!(diff.removed_nodes.is_empty());
        assert!(diff.removed_fields.is_empty());
    }

    #[test]
    fn test_diff_added_bridge() {
        let c1 = build_test_cluster();
        let mut c2 = build_test_cluster();
        let _ = c2.add_bridge("f1", "f2", "b", "a", "new bridge".into(), 0.5);
        let diff = c1.diff(&c2);
        // add_bridge creates 2 bridge edges (fwd + rev)
        assert_eq!(diff.added_bridges.len(), 2);
    }

    // ─── Cluster Validate Tests ──────────────────────────

    #[test]
    fn test_cluster_validate_clean() {
        let c = build_test_cluster();
        let result = c.validate();
        assert!(result.is_valid);
        assert!(result.issues.is_empty());
    }

    #[test]
    fn test_cluster_validate_broken_bridge_target_field() {
        let mut c = build_test_cluster();
        let f1 = c.fields.get_mut("f1").unwrap();
        f1.graph.add_edge(Edge {
            id: "bad-bridge".into(),
            source: "a".into(),
            target: "b".into(),
            relation: Relation::Bridges,
            weight: 1.0,
            description: "broken".into(),
            target_field: Some("non-existent-field".into()),
            meta: None,
        });
        let result = c.validate();
        assert!(!result.is_valid);
        assert!(result
            .issues
            .iter()
            .any(|i| i.category == IssueCategory::BrokenBridge));
    }

    #[test]
    fn test_cluster_validate_foreign_node() {
        let mut c = build_test_cluster();
        let f1 = c.fields.get_mut("f1").unwrap();
        f1.graph.add_edge(Edge {
            id: "foreign-edge".into(),
            source: "a".into(),
            target: "foreign-node".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: "foreign".into(),
            target_field: None,
            meta: None,
        });
        let result = c.validate();
        assert!(!result.is_valid);
        assert!(result
            .issues
            .iter()
            .any(|i| i.category == IssueCategory::ForeignNode));
    }

    #[test]
    fn test_cluster_validate_orphan_node_warning() {
        let mut c = build_test_cluster();
        c.register_node(node("orphan-node", "test", "Orphan", NodeStatus::Active));
        let result = c.validate();
        // Orphan node is a Warning, so cluster is still valid
        assert!(result.is_valid);
        assert!(result
            .issues
            .iter()
            .any(|i| i.category == IssueCategory::OrphanNode));
    }

    #[test]
    fn test_cluster_validate_empty() {
        let c = Cluster::new("empty".into(), "Empty".into(), Visibility::Private);
        let result = c.validate();
        assert!(result.is_valid);
        assert!(result.issues.is_empty());
    }

    // ─── Cluster Subgraph Tests ──────────────────────────

    #[test]
    fn test_cluster_subgraph_valid_field() {
        let c = build_test_cluster();
        let result = c.subgraph("f1", &["a".into()], Some(1), None).unwrap();
        let mut node_ids: Vec<_> = result.nodes.iter().map(|n| n.id.as_str()).collect();
        node_ids.sort();
        assert_eq!(node_ids, vec!["a", "b"]);
        // Local edges only (bridge edges point outside the field)
        assert_eq!(result.edges.len(), 1);
    }

    #[test]
    fn test_cluster_subgraph_nonexistent_field() {
        let c = build_test_cluster();
        let result = c.subgraph("nonexistent", &["a".into()], None, None);
        assert!(result.is_err());
        let err_msg = result.err().unwrap();
        assert!(
            err_msg.contains("not found"),
            "error message should indicate field not found, got: {}",
            err_msg
        );
    }

    #[test]
    fn test_cluster_subgraph_empty_seeds() {
        let c = build_test_cluster();
        let result = c.subgraph("f1", &[], None, None).unwrap();
        assert!(result.nodes.is_empty());
        assert!(result.edges.is_empty());
    }
}
