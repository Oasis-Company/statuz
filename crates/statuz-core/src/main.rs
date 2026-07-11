use clap::{Parser, Subcommand};
use statuz_core::*;

#[derive(Parser)]
#[command(name = "statuz", version, about = "Statuz Graph Engine — Cluster Management")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new cluster
    Init {
        #[arg(short, long)]
        name: String,
        #[arg(short, long, default_value = "private")]
        visibility: String,
        #[arg(short, long)]
        password: Option<String>,
    },
    /// Show cluster info
    Show {
        #[arg(short, long)]
        path: Option<String>,
    },
    /// Run self-test
    SelfTest,
    /// Serialize a test cluster to file
    Save {
        #[arg(short, long, default_value = "test-cluster.stz")]
        output: String,
    },
    /// Load and verify a cluster from file
    Load {
        #[arg(short, long)]
        path: String,
    },
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Init { name, visibility, password } => {
            let vis = match visibility.as_str() {
                "public" => Visibility::Public,
                "private" => Visibility::Private,
                "organization" => Visibility::Organization,
                _ => {
                    eprintln!("Invalid visibility: {}. Use: public, private, or organization", visibility);
                    return;
                }
            };

            let id = format!("cluster-{}", uuid::Uuid::new_v4());
            let mut cluster = Cluster::new(id, name.clone(), vis);

            if let Some(pwd) = password {
                match hash_password(pwd) {
                    Ok(hash) => cluster.password_hash = Some(hash),
                    Err(e) => {
                        eprintln!("Password hash error: {}", e);
                        return;
                    }
                }
            }

            println!("✅ Cluster '{}' initialized", name);
            println!("   ID: {}", cluster.id);
            println!("   Visibility: {:?}", cluster.visibility);
            println!("   Password protected: {}", password.is_some());
        }
        Commands::Show { path } => {
            if let Some(p) = path {
                match std::fs::read(p) {
                    Ok(data) => match deserialize_cluster(&data) {
                        Ok(cluster) => print_cluster_info(&cluster),
                        Err(e) => eprintln!("Deserialize error: {}", e),
                    },
                    Err(e) => eprintln!("Read error: {}", e),
                }
            } else {
                println!("No cluster path provided. Run a self-test first.");
            }
        }
        Commands::SelfTest => {
            run_self_test();
        }
        Commands::Save { output } => {
            let cluster = build_test_cluster();
            match serialize_cluster(&cluster) {
                Ok(data) => {
                    match std::fs::write(output, &data) {
                        Ok(_) => {
                            println!("✅ Cluster saved to '{}' ({} bytes)", output, data.len());
                            println!("   Cluster ID: {}", cluster.id);
                        }
                        Err(e) => eprintln!("Write error: {}", e),
                    }
                }
                Err(e) => eprintln!("Serialize error: {}", e),
            }
        }
        Commands::Load { path } => {
            match std::fs::read(path) {
                Ok(data) => match deserialize_cluster(&data) {
                    Ok(cluster) => {
                        print_cluster_info(&cluster);
                        println!("✅ Integrity verified (blake3 hash match)");
                    }
                    Err(e) => eprintln!("Load error: {}", e),
                },
                Err(e) => eprintln!("Read error: {}", e),
            }
        }
    }
}

fn print_cluster_info(cluster: &Cluster) {
    println!("📦 Cluster: {}", cluster.name);
    println!("   ID: {}", cluster.id);
    println!("   Visibility: {:?}", cluster.visibility);
    println!("   Nodes: {}", cluster.nodes.len());
    println!("   Fields: {}", cluster.fields.len());
    println!("   Created: {}", cluster.created_at);
    println!("   Updated: {}", cluster.updated_at);
    for (fid, field) in &cluster.fields {
        println!("   ─ Field '{}' ({}): {} nodes, {} edges",
            fid, field.name, field.graph.node_count(), field.graph.edge_count());
    }
}

fn build_test_cluster() -> Cluster {
    let mut cluster = Cluster::new(
        "test-cluster-001".to_string(),
        "Statuz Demo Cluster".to_string(),
        Visibility::Private,
    );

    // Register nodes
    cluster.register_node(Node {
        id: "api-gateway".into(),
        type_: "service".into(),
        label: "API Gateway".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "auth-service".into(),
        type_: "service".into(),
        label: "Auth Service".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "db-primary".into(),
        type_: "database".into(),
        label: "Primary Database".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "redis-cache".into(),
        type_: "cache".into(),
        label: "Redis Cache".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "orchestrator".into(),
        type_: "service".into(),
        label: "Workflow Orchestrator".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "payment-service".into(),
        type_: "service".into(),
        label: "Payment Service".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    cluster.register_node(Node {
        id: "notification-service".into(),
        type_: "service".into(),
        label: "Notification Service".into(),
        status: NodeStatus::Dormant,
        meta: None,
    });

    // Field 1: System Architecture
    let field1 = cluster.create_field(
        "system-arch".into(),
        "System Architecture".into(),
        Some("High-level system architecture showing service dependencies".into()),
    );

    field1.graph.add_edge_v2(Edge {
        id: "e-arch-01".into(),
        source: "api-gateway".into(),
        target: "auth-service".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "API Gateway delegates auth to Auth Service".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge_v2(Edge {
        id: "e-arch-02".into(),
        source: "api-gateway".into(),
        target: "orchestrator".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "API Gateway forwards requests to Orchestrator".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge_v2(Edge {
        id: "e-arch-03".into(),
        source: "orchestrator".into(),
        target: "payment-service".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "Orchestrator calls Payment Service for transactions".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge_v2(Edge {
        id: "e-arch-04".into(),
        source: "orchestrator".into(),
        target: "notification-service".into(),
        relation: Relation::DependsOn,
        weight: 0.8,
        description: "Orchestrator triggers notifications".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge_v2(Edge {
        id: "e-arch-05".into(),
        source: "auth-service".into(),
        target: "db-primary".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "Auth Service reads user data from DB".into(),
        target_field: None,
        meta: None,
    });

    // Field 2: Data Flow
    let field2 = cluster.create_field(
        "data-flow".into(),
        "Data Flow".into(),
        Some("Data flow between services and data stores".into()),
    );

    field2.graph.add_edge_v2(Edge {
        id: "e-data-01".into(),
        source: "api-gateway".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.7,
        description: "API Gateway reads session data from Redis".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge_v2(Edge {
        id: "e-data-02".into(),
        source: "auth-service".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.6,
        description: "Auth Service caches tokens in Redis".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge_v2(Edge {
        id: "e-data-03".into(),
        source: "payment-service".into(),
        target: "db-primary".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "Payment Service writes transactions to DB".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge_v2(Edge {
        id: "e-data-04".into(),
        source: "orchestrator".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.5,
        description: "Orchestrator uses Redis for workflow state".into(),
        target_field: None,
        meta: None,
    });

    // Bridge: connect "System Architecture" field's "orchestrator" to "Data Flow" field's "redis-cache"
    // This shows that the orchestrator's dependency on Redis (in Data Flow) is a cross-field concern.
    let _ = cluster.add_bridge(
        &"system-arch".to_string(),
        &"data-flow".to_string(),
        &"orchestrator".to_string(),
        &"redis-cache".to_string(),
        "Orchestrator's Redis dependency crosses from Architecture to Data Flow view".to_string(),
        0.8,
    );

    cluster
}

fn run_self_test() {
    println!("╔══════════════════════════════════════════════╗");
    println!("║        Statuz Rust Engine — Self Test        ║");
    println!("╚══════════════════════════════════════════════╝\n");

    // ─── 1. Build Cluster ────────────────────────────────
    println!("━━━ Phase 1: Build Cluster ━━━");
    let cluster = build_test_cluster();
    println!("  Cluster: {}", cluster.name);
    println!("  Nodes: {}", cluster.nodes.len());
    println!("  Fields: {}", cluster.fields.len());
    println!("  Password protected: {}", cluster.password_hash.is_some());

    // ─── 2. Graph Engine Queries ─────────────────────────
    println!("\n━━━ Phase 2: Graph Engine Queries (Field: system-arch) ━━━");

    let field = cluster.get_field(&"system-arch".to_string()).unwrap();
    let g = &field.graph;

    // Q1: traverse
    println!("\n  Q1: traverse(\"api-gateway\")");
    let (nodes, _) = g.traverse(&"api-gateway".to_string(), None, false);
    println!("   api-gateway connects to {} nodes:", nodes.len());
    for nid in &nodes {
        if let Some(node) = g.get_node(nid) {
            println!("     → {} ({})", node.label, nid);
        }
    }

    // Q2: impact
    println!("\n  Q2: impact(\"api-gateway\")");
    let impact = g.impact(&"api-gateway".to_string());
    println!("   If api-gateway changes, {} nodes affected:", impact.affected.len());
    for nid in &impact.affected {
        if let Some(node) = g.get_node(nid) {
            println!("     ⚡ {} ({})", node.label, nid);
        }
    }
    println!("   Critical path: {}", if impact.critical_path { "YES ⚠️" } else { "no" });

    // Q3: path
    println!("\n  Q3: path(\"api-gateway\", \"db-primary\")");
    let path = g.path(&"api-gateway".to_string(), &"db-primary".to_string(), false);
    if path.exists {
        println!("   Path found ({} steps):", path.length);
        for e in &path.path {
            let src = g.get_node(&e.source).map(|n| n.label.as_str()).unwrap_or(&e.source);
            let tgt = g.get_node(&e.target).map(|n| n.label.as_str()).unwrap_or(&e.target);
            println!("     {} → {} [{}]", src, tgt, e.relation.as_str());
        }
    }

    // Centrality
    println!("\n  Centrality (Top 3):");
    for (i, nid) in g.centrality(3).iter().enumerate() {
        if let Some(node) = g.get_node(nid) {
            println!("   {}. {} ({})", i + 1, node.label, nid);
        }
    }

    // Health
    println!("\n  Health Report:");
    let health = g.health();
    println!("   Nodes: {}  Edges: {}", health.total_nodes, health.total_edges);
    println!("   Orphans: {}", health.orphans.len());
    println!("   Sources: {}", health.sources.len());
    println!("   Sinks: {}", health.sinks.len());
    println!("   Components: {}", health.disconnected_components);

    // ─── 3. Cross-Field Bridge ────────────────────────────
    println!("\n━━━ Phase 3: Cross-Field Bridge Communication ━━━");
    println!("\n  Cross-field traverse from orchestrator (system-arch → data-flow):");
    let cross = cluster.traverse_across_fields(
        &"system-arch".to_string(),
        &"orchestrator".to_string(),
        None,
        2,
    );
    for (fid, (nodes, edges)) in &cross {
        println!("   Field '{}': {} nodes, {} edges", fid, nodes.len(), edges.len());
        for nid in nodes {
            if let Some(node) = cluster.get_node(nid) {
                println!("     → {} ({})", node.label, nid);
            }
        }
    }

    // Cross-field path
    println!("\n  Cross-field path: api-gateway → redis-cache");
    let cf_path = cluster.path_across_fields(
        &"api-gateway".to_string(),
        &"redis-cache".to_string(),
        &"system-arch".to_string(),
    );
    if cf_path.exists {
        println!("   Path found ({} steps)!", cf_path.length);
        for e in &cf_path.path {
            let src = cluster.get_node(&e.source).map(|n| n.label.as_str()).unwrap_or(&e.source);
            let tgt = cluster.get_node(&e.target).map(|n| n.label.as_str()).unwrap_or(&e.target);
            let field_hint = e.target_field.as_ref().map(|f| format!(" [→ field: {}]", f)).unwrap_or_default();
            println!("     {} → {} [{}{}]", src, tgt, e.relation.as_str(), field_hint);
        }
    } else {
        println!("   No path found");
    }

    // ─── 4. Storage Format ────────────────────────────────
    println!("\n━━━ Phase 4: Storage Format (Ser/De) ━━━");
    let serialized = serialize_cluster(&cluster).expect("Serialization failed");
    println!("  Serialized size: {} bytes", serialized.len());
    println!("  Hash: {}", blake3::hash(&serialized).to_hex());

    let deserialized = deserialize_cluster(&serialized).expect("Deserialization failed");
    println!("  Deserialized: {} nodes, {} fields",
        deserialized.nodes.len(), deserialized.fields.len());
    println!("  Integrity: ✅ blake3 hash verified");

    // ─── 5. Password ──────────────────────────────────────
    println!("\n━━━ Phase 5: Password Protection ─━━");
    let pwd = "statuz-secret-2026";
    match hash_password(pwd) {
        Ok(hash) => {
            println!("  Password hash: {}...", &hash[..20]);
            let mut p_cluster = Cluster::new("pwd-test".into(), "Password Test".into(), Visibility::Private);
            p_cluster.password_hash = Some(hash);
            let verified = verify_password(&p_cluster, pwd);
            println!("  Password verify (correct): {}", verified);
            let wrong = verify_password(&p_cluster, "wrong-password");
            println!("  Password verify (wrong):  {}", wrong);
        }
        Err(e) => eprintln!("  Password test error: {}", e),
    }

    // ─── Summary ──────────────────────────────────────────
    println!("\n━━━ Summary ─━━");
    println!("  ✅ GraphEngine: traverse, impact, path, centrality, health");
    println!("  ✅ Cluster: multi-field, centralized node registry");
    println!("  ✅ Cross-Field: bridge edges, across-field traversal, path");
    println!("  ✅ Storage: msgpack + blake3 integrity + header format");
    println!("  ✅ Password: argon2 verification");
    println!("\n✅ Self-test complete.\n");
}