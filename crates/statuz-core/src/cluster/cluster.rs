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

// ─── Tests ──────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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
            id: "e1".into(), source: "a".into(), target: "b".into(),
            relation: Relation::DependsOn, weight: 1.0, description: String::new(),
            target_field: None, meta: None,
        });
        f1.graph.add_edge(Edge {
            id: "e2".into(), source: "b".into(), target: "c".into(),
            relation: Relation::DependsOn, weight: 1.0, description: String::new(),
            target_field: None, meta: None,
        });

        // Bridge: f1.a → f2.d
        cluster.add_bridge("f1", "f2", "a", "d", "bridge".into(), 1.0).unwrap();

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
        assert!(c.get_field("arch").is_some(), "field should exist after creation");
    }

    // ─── Register Node ───────────────────────────────────

    #[test]
    fn test_register_node() {
        let mut c = Cluster::new("id".into(), "test".into(), Visibility::Organization);
        let node = Node {
            id: "n1".into(), type_: "test".into(), label: "N1".into(),
            status: NodeStatus::Active, meta: None,
        };
        c.register_node(node);
        assert!(c.get_node("n1").is_some(), "node should be found after registration");
    }

    // ─── Unregister Node ─────────────────────────────────

    #[test]
    fn test_unregister_node() {
        let mut c = build_test_cluster();
        assert!(c.get_node("a").is_some());
        c.unregister_node(&"a".into());
        assert!(c.get_node("a").is_none(), "node should be removed from registry");
        // Node should also be removed from all fields
        for field in c.fields.values() {
            assert!(field.graph.get_node("a").is_none(),
                "node should be removed from field '{}'", field.name);
        }
    }

    // ─── Empty Field Bridge ──────────────────────────────

    #[test]
    fn test_empty_field_bridge() {
        let mut c = Cluster::new("id".into(), "test".into(), Visibility::Private);
        for id in &["x", "y"] {
            c.register_node(Node {
                id: id.to_string(), type_: "t".into(), label: id.to_string(),
                status: NodeStatus::Active, meta: None,
            });
        }
        c.create_field("f1".into(), "F1".into(), None);
        c.create_field("f2".into(), "F2".into(), None);
        let result = c.add_bridge("f1", "f2", "x", "y", "bridge".into(), 1.0);
        assert!(result.is_ok(), "bridge between empty fields should succeed");

        // Forward bridge should be visible in f1
        let f1 = c.get_field("f1").unwrap();
        let (nodes, _) = f1.graph.traverse(&"x".into(), Some("bridges"), false);
        assert!(nodes.contains(&"y".into()), "bridge target 'y' should be reachable from 'x' in f1");
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
        assert_eq!(bridges.len(), 2, "should still have exactly 2 bridge entries (fwd + rev)");
    }

    // ─── Remove Field ────────────────────────────────────

    #[test]
    fn test_remove_field() {
        let mut c = build_test_cluster();
        assert_eq!(c.fields.len(), 2);
        c.remove_field("f1");
        assert_eq!(c.fields.len(), 1, "one field should remain after removal");
        assert!(c.get_field("f1").is_none(), "removed field should not be accessible");
        assert!(c.get_field("f2").is_some(), "other field should still exist");
    }

    // ─── Cross-Field Traverse ────────────────────────────

    #[test]
    fn test_traverse_across_fields() {
        let c = build_test_cluster();
        let result = c.traverse_across_fields(&"f1".into(), &"a".into(), None, 3);
        // Should find nodes in f1
        assert!(result.contains_key("f1"), "should have results for f1");
        let (f1_nodes, _) = result.get("f1").unwrap();
        assert!(f1_nodes.contains(&"b".into()), "f1 should contain 'b'");
        assert!(f1_nodes.contains(&"c".into()), "f1 should contain 'c'");
        // Should cross the bridge to f2
        assert!(result.contains_key("f2"), "should cross bridge to f2");
        let (f2_nodes, _) = result.get("f2").unwrap();
        assert!(f2_nodes.contains(&"d".into()), "f2 should contain 'd' via bridge");
    }

    // ─── Cross-Field Impact ──────────────────────────────

    #[test]
    fn test_impact_across_fields() {
        let c = build_test_cluster();
        // impact("a") looks for incoming edges to "a" across all fields.
        // In f2, the reverse bridge "d -> a" is an incoming edge to "a",
        // so "d" is affected when "a" changes.
        let impact = c.impact_across_fields(&"a".into());
        assert!(impact.affected.contains(&"d".into()),
            "reverse bridge should make 'd' affected when 'a' changes");
    }

    #[test]
    fn test_impact_across_fields_no_effect() {
        let c = build_test_cluster();
        // "d" has no incoming edges in any field, so nothing should be affected
        let impact = c.impact_across_fields(&"d".into());
        assert!(impact.affected.is_empty(),
            "leaf node 'd' should affect no one");
    }

    // ─── Cross-Field Path ────────────────────────────────

    #[test]
    fn test_path_across_fields_same_field() {
        let c = build_test_cluster();
        // a -> b -> c within f1
        let path = c.path_across_fields(&"a".into(), &"c".into(), &"f1".into());
        assert!(path.exists, "path a->c within f1 should exist");
        assert_eq!(path.length, 2, "a->b->c is 2 steps");
    }

    #[test]
    fn test_path_across_fields_cross_bridge() {
        let c = build_test_cluster();
        // a -> d via bridge (f1.a → f2.d)
        let path = c.path_across_fields(&"a".into(), &"d".into(), &"f1".into());
        assert!(path.exists, "path a->d across bridge should exist");
        assert_eq!(path.length, 1, "a->d via bridge is 1 step");
    }

    #[test]
    fn test_path_across_fields_nonexistent() {
        let c = build_test_cluster();
        // No path from f1.a to f1.a (self-loop not created)
        // Actually there's no edge from d to anything, so we can test d -> something
        let path = c.path_across_fields(&"d".into(), &"a".into(), &"f2".into());
        // d has no outgoing edges in f2, so no path back to a
        assert!(!path.exists, "no path from d back to a");
        assert_eq!(path.length, -1);
    }
}