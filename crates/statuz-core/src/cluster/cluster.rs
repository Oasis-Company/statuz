use crate::cluster::field::Field;
use crate::graph::types::*;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::{HashMap, HashSet, VecDeque};

/// Mutable state shared across the cross-field BFS recursion.
struct CrossFieldTraversal {
    visited_fields: HashSet<FieldId>,
    visited_nodes: HashSet<NodeId>,
    result: HashMap<FieldId, (Vec<NodeId>, Vec<Edge>)>,
}

/// Derived cross-field incoming-edge index: node → the source nodes of every
/// incoming edge across ALL fields (including bridge edges).
///
/// Built by `build_incoming_index`; invalidated by mutations (see
/// `invalidate_index`); never serialized. The `edge_counts` fingerprint lets
/// `impact_across_fields` detect mutations that bypass cluster methods
/// (e.g. direct `fields.get_mut(...).graph.add_edge(...)`).
#[derive(Debug, Clone)]
pub(crate) struct IncomingIndex {
    sources: HashMap<NodeId, Vec<NodeId>>,
    /// (field_id, edge_count) snapshot at build time.
    edge_counts: Vec<(FieldId, usize)>,
}

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
    /// Derived cross-field incoming-edge index (see `IncomingIndex`).
    /// `None` = stale/never built → rebuilt on demand by `impact_across_fields`.
    /// Never serialized — keeps the disk format and content IDs stable.
    #[serde(skip)]
    pub(crate) incoming_index: RefCell<Option<IncomingIndex>>,
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
            incoming_index: RefCell::new(None),
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
        self.invalidate_index();
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

    /// Mark the derived cross-field index stale. Called by every mutating
    /// cluster method and by `get_field_mut` (mutable field access may change
    /// edges). The index is rebuilt on demand by `impact_across_fields`.
    pub(crate) fn invalidate_index(&mut self) {
        self.incoming_index = RefCell::new(None);
    }

    /// Get a mutable reference to a field.
    ///
    /// Invalidates the cross-field index: the returned `&mut Field` may be
    /// used to add/remove edges directly.
    pub fn get_field_mut(&mut self, id: &str) -> Option<&mut Field> {
        self.invalidate_index();
        self.fields.get_mut(id)
    }

    /// Get a field by ID.
    pub fn get_field(&self, id: &str) -> Option<&Field> {
        self.fields.get(id)
    }

    /// Remove a field and all its edges from the cluster.
    ///
    /// Its cascade keeps nodes in the central registry (they are shared, not
    /// owned by any single field). What is removed:
    /// - the field itself,
    /// - every bridge edge in OTHER fields that targets this field (they would
    ///   otherwise dangle at a non-existent field),
    /// - those bridge edges from the cluster bridge registry.
    pub fn remove_field(&mut self, id: &str) {
        // 1. Catch bridge edges stored in OTHER fields that target this field.
        let mut dangling: Vec<(FieldId, EdgeId)> = Vec::new();
        for (fid, field) in self.fields.iter() {
            for e in field.graph.all_edges() {
                if e.target_field.as_deref() == Some(id) {
                    dangling.push((fid.clone(), e.id.clone()));
                }
            }
        }
        // 2. Remove them from their owning fields.
        for (fid, eid) in &dangling {
            if let Some(f) = self.fields.get_mut(fid) {
                f.graph.remove_edge(eid);
            }
        }
        // 3. Drop the field itself.
        self.fields.remove(id);
        // 4. Rebuild the bridge registry to keep ONLY edges still alive in a
        //    surviving field's graph. This also drops the removed field's own
        //    bridge edges (whose graphs are gone), which the "targets deleted
        //    field" catch above alone would leave as ghost entries.
        if let Some(bridges) = self.bridges.as_mut() {
            let live: HashMap<EdgeId, Edge> = bridges
                .values()
                .filter(|e| self.fields.values().any(|f| f.graph.get_edge(&e.id).is_some()))
                .map(|e| (e.id.clone(), e.clone()))
                .collect();
            *bridges = live;
        }
        self.invalidate_index();
        self.updated_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
    }

    /// Axiom B (membership) · deterministic member set of a field.
    ///
    /// A node is a member of a field iff it is an endpoint of a non-bridge
    /// (local) edge inside the field, or the **source** of a bridge edge in the
    /// field (a resident node that connects outward). Bridge **targets**
    /// (`target_field = Some(..)`) belong to the OTHER field and are excluded.
    ///
    /// Result is sorted and deterministic: same member set for the same field
    /// no matter how edges were inserted.
    pub fn field_members(&self, field_id: &str) -> Vec<NodeId> {
        let Some(field) = self.fields.get(field_id) else {
            return Vec::new();
        };
        let mut members: HashSet<NodeId> = HashSet::new();
        for e in field.graph.all_edges() {
            let is_bridge = e.target_field.is_some();
            if is_bridge {
                // Only the bridge source is a resident of THIS field.
                members.insert(e.source.clone());
            } else {
                members.insert(e.source.clone());
                members.insert(e.target.clone());
            }
        }
        let mut out: Vec<NodeId> = members.into_iter().collect();
        out.sort();
        out
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
        self.invalidate_index();

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
        let mut traversal = CrossFieldTraversal {
            visited_fields: HashSet::new(),
            visited_nodes: HashSet::new(),
            result: HashMap::new(),
        };

        self._traverse_across(
            start_field,
            from_node,
            relation,
            max_depth,
            0,
            &mut traversal,
        );

        traversal.result
    }

    #[allow(clippy::too_many_arguments)]
    fn _traverse_across(
        &self,
        current_field: &str,
        current_node: &str,
        relation: Option<&str>,
        max_depth: usize,
        depth: usize,
        t: &mut CrossFieldTraversal,
    ) {
        if depth > max_depth {
            return;
        }
        if t.visited_nodes.contains(current_node) {
            return;
        }
        t.visited_nodes.insert(current_node.to_string());

        if let Some(field) = self.fields.get(current_field) {
            // Record the current node as part of this field's discovered set
            // (including bridge entry points like the bridge target in f2)
            let entry = t
                .result
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
                if !is_bridge && !t.visited_nodes.contains(&e.target) {
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
                if !t.visited_nodes.contains(&target_node) {
                    if is_bridge {
                        t.visited_fields.insert(target_field.clone());
                    }
                    self._traverse_across(
                        &target_field,
                        &target_node,
                        relation,
                        max_depth,
                        depth + 1,
                        t,
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
    /// Reverse BFS through a derived inverted index (node → incoming sources
    /// across ALL fields, including bridges). The index is rebuilt on demand
    /// when stale: after any cluster mutation, or when per-field edge counts
    /// changed (catches direct field-graph mutations that bypass cluster
    /// methods). Correctness never depends on the index — a stale index is
    /// always rebuilt before use.
    pub fn impact_across_fields(&self, changed: &str) -> ImpactResult {
        // Ensure the inverted index is fresh.
        let stale = match self.incoming_index.borrow().as_ref() {
            None => true,
            Some(idx) => idx.edge_counts != self.current_edge_counts(),
        };
        if stale {
            let built = self.build_incoming_index();
            *self.incoming_index.borrow_mut() = Some(built);
        }
        let idx = self.incoming_index.borrow();

        let mut affected = HashSet::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(changed.to_string());

        while let Some(current) = queue.pop_front() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            // Reverse BFS: who points to `current`? (all fields, incl. bridges)
            if let Some(incoming) = idx.as_ref() {
                if let Some(sources) = incoming.sources.get(&current) {
                    for source in sources {
                        // Mirror the reference scan exactly: `affected` doubles
                        // as the enqueue-dedup set, `visited` marks processed
                        // nodes (enqueue must NOT mark visited, or the BFS
                        // would stop after the first level).
                        if !visited.contains(source) && !affected.contains(source) {
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

    /// Reference implementation: per-node × per-field reverse BFS scan.
    /// Test-only oracle for the inverted-index path (D1' correctness gate).
    #[cfg(test)]
    pub(crate) fn impact_across_fields_scan(&self, changed: &str) -> ImpactResult {
        let mut affected = HashSet::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();
        queue.push_back(changed.to_string());

        while let Some(current) = queue.pop_front() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            for field in self.fields.values() {
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

    /// Current (field_id, edge_count) fingerprint used for index freshness.
    fn current_edge_counts(&self) -> Vec<(FieldId, usize)> {
        let mut counts: Vec<(FieldId, usize)> = self
            .fields
            .iter()
            .map(|(fid, field)| (fid.clone(), field.graph.edge_count()))
            .collect();
        counts.sort();
        counts
    }

    /// Build the cross-field inverted index from live field state.
    fn build_incoming_index(&self) -> IncomingIndex {
        let mut sources: HashMap<NodeId, Vec<NodeId>> = HashMap::new();
        for field in self.fields.values() {
            for (node_id, cell) in &field.graph.adj {
                for edges in cell.incoming.values() {
                    for edge in edges {
                        sources
                            .entry(node_id.clone())
                            .or_default()
                            .push(edge.source.clone());
                    }
                }
            }
        }
        IncomingIndex {
            sources,
            edge_counts: self.current_edge_counts(),
        }
    }

    /// Rebuild derived field-level indexes (degree indexes) after
    /// deserialization so loaded clusters query at full speed (D1').
    ///
    /// The cluster cross-field inverted index is intentionally NOT built here:
    /// its build cost (~O(E) String-keyed inserts) would blow the load budget
    /// (T4). It is built lazily on the first `impact_across_fields` call and
    /// invalidated by every mutation.
    pub(crate) fn rebuild_indexes(&mut self) {
        for field in self.fields.values_mut() {
            field.graph.rebuild_degrees();
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
            for nid in self.nodes.keys() {
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

    // ─── Membership Axiom (A2) ─────────────────────────────

    #[test]
    fn field_members_is_deterministic_and_sorted() {
        let c = build_test_cluster();
        // f1 holds local edges a→b, b→c : members {a,b,c}
        let mut m1 = c.field_members("f1");
        assert_eq!(m1, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
        m1.sort();
        assert_eq!(m1, c.field_members("f1"), "member set is deterministic/path-independent");
        // f2 holds the reverse bridge d→a; only the bridge SOURCE (d) is a
        // resident of f2 — the target a belongs to f1.
        assert_eq!(c.field_members("f2"), vec!["d".to_string()]);
    }

    #[test]
    fn field_members_excludes_unknown_field() {
        let c = build_test_cluster();
        assert!(c.field_members("ghost").is_empty());
    }

    #[test]
    fn field_members_survives_node_unregister_but_field_edge_removal_does_not() {
        // unregister_node removes a node from ALL fields' graphs, so a member
        // whose only presence was as an edge endpoint disappears with that edge.
        let mut c = build_test_cluster();
        // "c" exists in f1 as the target of b→c. Unregistering/removing it from
        // the field must drop it from field_members.
        let f1 = c.fields.get_mut("f1").unwrap();
        f1.graph.remove_edge("e2"); // b→c removed
        assert_eq!(c.field_members("f1"), vec!["a".to_string(), "b".to_string()]);
    }

    #[test]
    fn remove_field_cascades_outgoing_bridges_and_registry() {
        let mut c = build_test_cluster();
        // A bridge f1.a → f2.d exists. Removing f2 must:
        // 1) drop the dangling reverse bridge edge from f1's graph,
        // 2) drop both bridge entries from the registry,
        // while keeping the actual nodes alive in the central registry.
        let nodes_before: Vec<_> = c.nodes.keys().cloned().collect();

        c.remove_field("f2");

        assert!(c.get_field("f2").is_none());
        assert_eq!(
            c.fields.len(),
            1,
            "only f1 should remain after removing f2"
        );
        // f1 must no longer hold the bridge edge that pointed at f2.
        let f1 = c.get_field("f1").unwrap();
        assert!(
            !f1.graph.all_edges().iter().any(|e| e.target_field.is_some()),
            "f1 should have no bridge edges left after f2 is removed"
        );
        // Bridge registry is empty.
        let bridges = c.bridges.as_ref().unwrap();
        assert!(bridges.is_empty(), "bridge registry should be cascaded");
        // Nodes are shared — they must survive field removal.
        for nid in &nodes_before {
            assert!(c.nodes.contains_key(nid), "node '{}' must survive cascades", nid);
        }
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

    // ─── Inverted Index Property Tests (D1') ─────────────

    /// Deterministic LCG for reproducible random graph scenarios.
    struct Lcg(u64);

    impl Lcg {
        fn new(seed: u64) -> Self {
            Lcg(seed)
        }
        fn next(&mut self) -> u64 {
            self.0 = self
                .0
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            self.0 >> 33
        }
        fn below(&mut self, n: usize) -> usize {
            if n == 0 {
                0
            } else {
                (self.next() % n as u64) as usize
            }
        }
    }

    /// 100 random cluster scenarios × random queries: the inverted-index path
    /// must produce identical results to the reference scan (100/100).
    #[test]
    fn test_inverted_index_matches_scan_100_scenarios() {
        for scenario in 0..100u64 {
            let mut rng = Lcg::new(0xD1E6_0000 + scenario);
            let mut c = Cluster::new("prop".into(), "Prop".into(), Visibility::Private);
            let n_fields = 2 + rng.below(3);
            for f in 0..n_fields {
                c.create_field(format!("f{}", f), format!("Field {}", f), None);
            }
            let n_nodes = 4 + rng.below(15);
            for i in 0..n_nodes {
                c.register_node(Node {
                    id: format!("n{}", i),
                    type_: "t".into(),
                    label: "N".into(),
                    status: NodeStatus::Active,
                    meta: None,
                });
            }
            for edge_id in 0..rng.below(40) {
                let fid = format!("f{}", rng.below(n_fields));
                if let Some(f) = c.get_field_mut(&fid) {
                    f.graph.add_edge(Edge {
                        id: format!("e{}", edge_id),
                        source: format!("n{}", rng.below(n_nodes)),
                        target: format!("n{}", rng.below(n_nodes)),
                        relation: Relation::DependsOn,
                        weight: 0.5,
                        description: String::new(),
                        target_field: None,
                        meta: None,
                    });
                }
            }
            for _ in 0..rng.below(6) {
                let fi = rng.below(n_fields);
                let fj = (fi + 1 + rng.below(n_fields - 1)) % n_fields;
                let _ = c.add_bridge(
                    &format!("f{}", fi),
                    &format!("f{}", fj),
                    &format!("n{}", rng.below(n_nodes)),
                    &format!("n{}", rng.below(n_nodes)),
                    "b".into(),
                    0.8,
                );
            }
            for _ in 0..8 {
                let changed = format!("n{}", rng.below(n_nodes));
                let indexed = c.impact_across_fields(&changed);
                let scanned = c.impact_across_fields_scan(&changed);
                assert_eq!(
                    indexed.affected, scanned.affected,
                    "scenario {} node {}: affected mismatch",
                    scenario, changed
                );
                assert_eq!(
                    indexed.blast_radius, scanned.blast_radius,
                    "scenario {} node {}: blast_radius mismatch",
                    scenario, changed
                );
            }
        }
    }

    /// Mutations through cluster methods must invalidate the index; results
    /// must stay correct afterwards (rebuild on demand).
    #[test]
    fn test_inverted_index_invalidated_by_cluster_mutations() {
        let mut c = Cluster::new("mut".into(), "Mut".into(), Visibility::Private);
        c.create_field("f1".into(), "F1".into(), None);
        for id in ["n0", "n1", "n2"] {
            c.register_node(node(id, "t", id, NodeStatus::Active));
        }
        let f = c.get_field_mut("f1").unwrap();
        f.graph.add_edge(Edge {
            id: "e1".into(),
            source: "n1".into(),
            target: "n0".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });

        let impact_before = c.impact_across_fields("n0");
        assert_eq!(impact_before.affected, vec!["n1".to_string()]);
        assert!(
            c.incoming_index.borrow().is_some(),
            "index must be built after a query"
        );

        // Mutation via cluster API (get_field_mut) — must invalidate the index.
        let f = c.get_field_mut("f1").unwrap();
        f.graph.add_edge(Edge {
            id: "e2".into(),
            source: "n2".into(),
            target: "n0".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });
        assert!(
            c.incoming_index.borrow().is_none(),
            "get_field_mut must invalidate the index"
        );

        let impact_after = c.impact_across_fields("n0");
        assert_eq!(
            impact_after.affected,
            vec!["n1".to_string(), "n2".to_string()]
        );
        assert_eq!(
            impact_after.affected,
            c.impact_across_fields_scan("n0").affected
        );
    }

    /// Direct field-graph mutation (bypassing cluster methods) is detected by
    /// the edge-count fingerprint: results must stay correct.
    #[test]
    fn test_inverted_index_detects_direct_field_mutation() {
        let mut c = Cluster::new("bypass".into(), "Bypass".into(), Visibility::Private);
        c.create_field("f1".into(), "F1".into(), None);
        for id in ["n0", "n1", "n2"] {
            c.register_node(node(id, "t", id, NodeStatus::Active));
        }
        let f = c.get_field_mut("f1").unwrap();
        f.graph.add_edge(Edge {
            id: "e1".into(),
            source: "n1".into(),
            target: "n0".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });

        let _ = c.impact_across_fields("n0"); // build the index
        assert!(c.incoming_index.borrow().is_some());

        // Direct mutation bypassing cluster methods: `fields` map + `graph`.
        c.fields.get_mut("f1").unwrap().graph.add_edge(Edge {
            id: "e2".into(),
            source: "n2".into(),
            target: "n0".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });

        let impact = c.impact_across_fields("n0");
        assert_eq!(
            impact.affected,
            c.impact_across_fields_scan("n0").affected,
            "fingerprint must catch direct field mutations"
        );
        assert!(impact.affected.contains(&"n2".to_string()));
    }

    /// Serialization round-trip must not change query results; `rebuild_indexes`
    /// restores full-speed indexes after load.
    #[test]
    fn test_rebuild_indexes_after_deserialization() {
        let mut c = Cluster::new("rt".into(), "RT".into(), Visibility::Private);
        c.create_field("f1".into(), "F1".into(), None);
        c.register_node(node("n0", "t", "N0", NodeStatus::Active));
        c.register_node(node("n1", "t", "N1", NodeStatus::Active));
        let f = c.get_field_mut("f1").unwrap();
        f.graph.add_edge(Edge {
            id: "e1".into(),
            source: "n1".into(),
            target: "n0".into(),
            relation: Relation::DependsOn,
            weight: 1.0,
            description: String::new(),
            target_field: None,
            meta: None,
        });

        let expected = c.impact_across_fields("n0");

        // struct-as-map: `skip_serializing_if` fields misalign in array mode.
        let mut buf = Vec::new();
        let mut serializer = rmp_serde::Serializer::new(&mut buf).with_struct_map();
        c.serialize(&mut serializer).expect("serialize cluster");
        let mut restored: Cluster = rmp_serde::from_slice(&buf).expect("deserialize cluster");
        assert!(
            restored.incoming_index.borrow().is_none(),
            "index must not survive serialization"
        );
        assert!(
            !restored.fields.get("f1").unwrap().graph.degrees_valid,
            "field degree indexes must not survive serialization"
        );

        // rebuild_indexes: degree indexes rebuilt eagerly; the cluster
        // inverted index stays lazy (built on first impact_across_fields).
        restored.rebuild_indexes();
        assert!(
            restored.incoming_index.borrow().is_none(),
            "cluster index is lazy — built on first impact_across_fields"
        );
        assert!(restored.fields.get("f1").unwrap().graph.degrees_valid);
        assert_eq!(
            restored.impact_across_fields("n0").affected,
            expected.affected
        );
        assert!(
            restored.incoming_index.borrow().is_some(),
            "first query must build the cluster index"
        );
    }
}
