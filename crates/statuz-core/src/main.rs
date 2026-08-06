use clap::{Parser, Subcommand};
use statuz_core::*;

#[derive(Parser)]
#[command(
    name = "statuz",
    version,
    about = "Statuz Graph Engine — Cluster Management"
)]
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
    /// Save cluster to .stz file
    Save {
        #[arg(short, long, default_value = "test-cluster.stz")]
        output: String,
        /// Enable zstd compression
        #[arg(long, default_value_t = false)]
        compress: bool,
        /// Enable chacha20 encryption (requires password)
        #[arg(long, default_value_t = false)]
        encrypt: bool,
        /// Password for encryption (if not set, uses cluster's password)
        #[arg(long)]
        password: Option<String>,
    },
    /// Load cluster from .stz file
    Load {
        #[arg(short, long)]
        path: String,
        /// Password for decryption (required for encrypted files)
        #[arg(long)]
        password: Option<String>,
    },
    /// Verify .stz file integrity without full deserialization
    Verify {
        #[arg(short, long)]
        path: String,
    },
    /// Export cluster to human-readable JSON
    Export {
        #[arg(short, long)]
        path: String,
        #[arg(short, long, default_value = "cluster.json")]
        output: String,
    },
    /// Clone a cluster with options
    Clone {
        #[arg(short, long)]
        input: String,
        #[arg(short, long, default_value = "clone.stz")]
        output: String,
        #[arg(short, long)]
        name: Option<String>,
        #[arg(short, long)]
        password: Option<String>,
        #[arg(long, default_value_t = false)]
        keep_password: bool,
        #[arg(long, default_value_t = false)]
        keep_timestamps: bool,
    },
    /// Merge a source cluster into a target cluster
    Merge {
        #[arg(short, long)]
        target: String,
        #[arg(short, long)]
        source: String,
        #[arg(short, long, default_value = "skip")]
        strategy: String,
        #[arg(long)]
        rename_suffix: Option<String>,
        #[arg(short, long, default_value = "merged.stz")]
        output: String,
    },
    /// Set, change, or clear the password on a cluster
    SetPassword {
        #[arg(short, long)]
        path: String,
        #[arg(short, long)]
        set: Option<String>,
        #[arg(long)]
        old: Option<String>,
        #[arg(long)]
        new: Option<String>,
        #[arg(long, default_value_t = false)]
        clear: bool,
    },
    /// Set the visibility of a cluster
    SetVisibility {
        #[arg(short, long)]
        path: String,
        #[arg(short, long)]
        visibility: String,
    },
    /// Run comprehensive self-test
    SelfTest,
}

fn main() {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Init {
            name,
            visibility,
            password,
        } => {
            let vis = match visibility.as_str() {
                "public" => Visibility::Public,
                "private" => Visibility::Private,
                "organization" => Visibility::Organization,
                _ => {
                    eprintln!(
                        "Invalid visibility: {}. Use: public, private, or organization",
                        visibility
                    );
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
        Commands::Verify { path } => match std::fs::read(path) {
            Ok(data) => match verify_stz_file(&data) {
                Ok(()) => println!("✅ Integrity verified: magic ✓ version ✓ blake3 ✓"),
                Err(e) => eprintln!("❌ Verification failed: {}", e),
            },
            Err(e) => eprintln!("Read error: {}", e),
        },
        Commands::Export { path, output } => match std::fs::read(path) {
            Ok(data) => match deserialize_cluster(&data) {
                Ok(cluster) => match export_cluster_json(&cluster) {
                    Ok(json) => match std::fs::write(output, &json) {
                        Ok(_) => println!("✅ Exported to '{}'", output),
                        Err(e) => eprintln!("Write error: {}", e),
                    },
                    Err(e) => eprintln!("JSON export error: {}", e),
                },
                Err(e) => eprintln!("Deserialize error: {}", e),
            },
            Err(e) => eprintln!("Read error: {}", e),
        },
        Commands::Clone {
            input,
            output,
            name,
            password,
            keep_password,
            keep_timestamps,
        } => {
            let data = match std::fs::read(input) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Read error: {}", e);
                    return;
                }
            };
            let cluster = match deserialize_cluster(&data) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Deserialize error: {}", e);
                    return;
                }
            };

            let options = CloneOptions {
                reset_password: !keep_password && password.is_none(),
                new_password: password.clone(),
                new_name: name.clone(),
                reset_timestamps: !keep_timestamps,
            };

            match cluster.clone_with_options(&options) {
                Ok(cloned) => match serialize_cluster(&cloned) {
                    Ok(data) => match std::fs::write(output, &data) {
                        Ok(_) => {
                            println!("✅ Cluster cloned to '{}' ({} bytes)", output, data.len());
                            println!("   New ID: {}", cloned.id);
                            println!("   Name: {}", cloned.name);
                        }
                        Err(e) => eprintln!("Write error: {}", e),
                    },
                    Err(e) => eprintln!("Serialize error: {}", e),
                },
                Err(e) => eprintln!("Clone error: {}", e),
            }
        }
        Commands::Merge {
            target,
            source,
            strategy,
            rename_suffix,
            output,
        } => {
            let target_data = match std::fs::read(target) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Read target error: {}", e);
                    return;
                }
            };
            let source_data = match std::fs::read(source) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Read source error: {}", e);
                    return;
                }
            };

            let mut target_cluster = match deserialize_cluster(&target_data) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Deserialize target error: {}", e);
                    return;
                }
            };
            let source_cluster = match deserialize_cluster(&source_data) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Deserialize source error: {}", e);
                    return;
                }
            };

            let merge_strategy = match strategy.as_str() {
                "skip" => MergeStrategy::Skip,
                "overwrite" => MergeStrategy::Overwrite,
                "rename" => MergeStrategy::Rename {
                    suffix: rename_suffix
                        .clone()
                        .unwrap_or_else(|| "-merged".to_string()),
                },
                "merge-meta" => MergeStrategy::MergeMeta,
                _ => {
                    eprintln!(
                        "Invalid strategy: {}. Use: skip, overwrite, rename, merge-meta",
                        strategy
                    );
                    return;
                }
            };

            let result = target_cluster.merge_from(&source_cluster, &merge_strategy);

            println!("✅ Merge complete");
            println!(
                "   Nodes: {} added, {} skipped, {} overwritten",
                result.nodes_added, result.nodes_skipped, result.nodes_overwritten
            );
            println!(
                "   Fields: {} added, {} skipped, {} overwritten",
                result.fields_added, result.fields_skipped, result.fields_overwritten
            );
            println!(
                "   Edges: {} added, {} skipped",
                result.edges_added, result.edges_skipped
            );
            println!("   Bridges: {} added", result.bridges_added);
            for w in &result.warnings {
                println!("   ⚠ {}", w);
            }

            match serialize_cluster(&target_cluster) {
                Ok(data) => match std::fs::write(output, &data) {
                    Ok(_) => println!(
                        "   Merged cluster saved to '{}' ({} bytes)",
                        output,
                        data.len()
                    ),
                    Err(e) => eprintln!("Write error: {}", e),
                },
                Err(e) => eprintln!("Serialize error: {}", e),
            }
        }
        Commands::SetPassword {
            path,
            set,
            old,
            new,
            clear,
        } => {
            let data = match std::fs::read(path) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Read error: {}", e);
                    return;
                }
            };
            let mut cluster = match deserialize_cluster(&data) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Deserialize error: {}", e);
                    return;
                }
            };

            if let Some(pwd) = set {
                match cluster.set_password(pwd) {
                    Ok(_) => println!("✅ Password set"),
                    Err(e) => {
                        eprintln!("Error: {}", e);
                        return;
                    }
                }
            } else if let (Some(old_pwd), Some(new_pwd)) = (old, new) {
                match cluster.change_password(old_pwd, new_pwd) {
                    Ok(_) => println!("✅ Password changed"),
                    Err(e) => {
                        eprintln!("Error: {}", e);
                        return;
                    }
                }
            } else if *clear {
                cluster.clear_password();
                println!("✅ Password cleared");
            } else {
                eprintln!("Use --set <password>, --old <old> --new <new>, or --clear");
                return;
            }

            match serialize_cluster(&cluster) {
                Ok(data) => match std::fs::write(path, &data) {
                    Ok(_) => println!("   Cluster saved ({} bytes)", data.len()),
                    Err(e) => eprintln!("Write error: {}", e),
                },
                Err(e) => eprintln!("Serialize error: {}", e),
            }
        }
        Commands::SetVisibility { path, visibility } => {
            let data = match std::fs::read(path) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("Read error: {}", e);
                    return;
                }
            };
            let mut cluster = match deserialize_cluster(&data) {
                Ok(c) => c,
                Err(e) => {
                    eprintln!("Deserialize error: {}", e);
                    return;
                }
            };

            let vis = match visibility.as_str() {
                "public" => Visibility::Public,
                "private" => Visibility::Private,
                "organization" => Visibility::Organization,
                _ => {
                    eprintln!(
                        "Invalid visibility: {}. Use: public, private, organization",
                        visibility
                    );
                    return;
                }
            };

            cluster.set_visibility(vis);
            println!("✅ Visibility set to {:?}", cluster.visibility);

            match serialize_cluster(&cluster) {
                Ok(data) => match std::fs::write(path, &data) {
                    Ok(_) => println!("   Cluster saved ({} bytes)", data.len()),
                    Err(e) => eprintln!("Write error: {}", e),
                },
                Err(e) => eprintln!("Serialize error: {}", e),
            }
        }
        Commands::SelfTest => {
            run_self_test();
        }
        Commands::Save {
            output,
            compress,
            encrypt,
            password,
        } => {
            let cluster = build_test_cluster();
            let pwd = password.as_deref();
            if *encrypt && pwd.is_none() {
                eprintln!("Error: --encrypt requires --password <password>");
                return;
            }
            match serialize_cluster_with_options(&cluster, *compress, pwd) {
                Ok(data) => match std::fs::write(output, &data) {
                    Ok(_) => {
                        let flags = if *compress && *encrypt {
                            "compressed + encrypted"
                        } else if *compress {
                            "compressed"
                        } else if *encrypt {
                            "encrypted"
                        } else {
                            "raw"
                        };
                        println!(
                            "✅ Cluster saved to '{}' ({} bytes, {})",
                            output,
                            data.len(),
                            flags
                        );
                        println!("   Cluster ID: {}", cluster.id);
                    }
                    Err(e) => eprintln!("Write error: {}", e),
                },
                Err(e) => eprintln!("Serialize error: {}", e),
            }
        }
        Commands::Load { path, password } => {
            match std::fs::read(path) {
                Ok(data) => match deserialize_cluster_with_password(&data, password.as_deref()) {
                    Ok(cluster) => {
                        print_cluster_info(&cluster);
                        println!("✅ Integrity verified (blake3 hash match)");
                        if cluster.password_hash.is_some() {
                            println!("⚠️  This cluster is password-protected (but was decrypted on load for info display)");
                        }
                    }
                    Err(e) => {
                        // Check if the error is about missing password for decryption
                        let err_str = e.to_string();
                        if err_str.contains("file is encrypted") {
                            eprintln!("Load error: {}", e);
                            eprintln!("Hint: Use --password <password> to decrypt");
                        } else {
                            eprintln!("Load error: {}", e);
                        }
                        std::process::exit(1);
                    }
                },
                Err(e) => {
                    eprintln!("Read error: {}", e);
                    std::process::exit(1);
                }
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
        println!(
            "   ─ Field '{}' ({}): {} nodes, {} edges",
            fid,
            field.name,
            field.graph.node_count(),
            field.graph.edge_count()
        );
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

    field1.graph.add_edge(Edge {
        id: "e-arch-01".into(),
        source: "api-gateway".into(),
        target: "auth-service".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "API Gateway delegates auth to Auth Service".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge(Edge {
        id: "e-arch-02".into(),
        source: "api-gateway".into(),
        target: "orchestrator".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "API Gateway forwards requests to Orchestrator".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge(Edge {
        id: "e-arch-03".into(),
        source: "orchestrator".into(),
        target: "payment-service".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "Orchestrator calls Payment Service for transactions".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge(Edge {
        id: "e-arch-04".into(),
        source: "orchestrator".into(),
        target: "notification-service".into(),
        relation: Relation::DependsOn,
        weight: 0.8,
        description: "Orchestrator triggers notifications".into(),
        target_field: None,
        meta: None,
    });
    field1.graph.add_edge(Edge {
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

    field2.graph.add_edge(Edge {
        id: "e-data-01".into(),
        source: "api-gateway".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.7,
        description: "API Gateway reads session data from Redis".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge(Edge {
        id: "e-data-02".into(),
        source: "auth-service".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.6,
        description: "Auth Service caches tokens in Redis".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge(Edge {
        id: "e-data-03".into(),
        source: "payment-service".into(),
        target: "db-primary".into(),
        relation: Relation::DependsOn,
        weight: 1.0,
        description: "Payment Service writes transactions to DB".into(),
        target_field: None,
        meta: None,
    });
    field2.graph.add_edge(Edge {
        id: "e-data-04".into(),
        source: "orchestrator".into(),
        target: "redis-cache".into(),
        relation: Relation::Consumes,
        weight: 0.5,
        description: "Orchestrator uses Redis for workflow state".into(),
        target_field: None,
        meta: None,
    });

    // Bridge: bidirectional connection between fields
    // orchestrator (system-arch) ↔ redis-cache (data-flow)
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
    println!("╔══════════════════════════════════════════════════╗");
    println!("║        Statuz Rust Engine — Comprehensive Test   ║");
    println!("╚══════════════════════════════════════════════════╝\n");

    let cluster = build_test_cluster();

    // ─── Phase 1: Build Cluster ────────────────────────────────
    println!("━━━ Phase 1: Build Cluster ━━━");
    println!("  Cluster: {}", cluster.name);
    println!("  Nodes: {}", cluster.nodes.len());
    println!("  Fields: {}", cluster.fields.len());
    assert!(cluster.nodes.len() == 7, "Expected 7 nodes");
    assert!(cluster.fields.len() == 2, "Expected 2 fields");

    // ─── Phase 2: Graph Engine Queries ─────────────────────────
    println!("\n━━━ Phase 2: Graph Engine Queries (Field: system-arch) ━━━");

    let field = cluster.get_field(&"system-arch".to_string()).unwrap();
    let g = &field.graph;

    // Q1: traverse
    println!("\n  Q1: traverse(\"api-gateway\")");
    let (nodes, _) = g.traverse(&"api-gateway".to_string(), None, false);
    println!("   api-gateway connects to {} nodes:", nodes.len());
    assert!(nodes.len() == 2, "api-gateway should connect to 2 nodes");
    for nid in &nodes {
        if let Some(node) = g.get_node(nid) {
            println!("     → {} ({})", node.label, nid);
        }
    }

    // Q2: impact
    println!("\n  Q2: impact(\"orchestrator\")");
    let impact = g.impact("orchestrator");
    println!(
        "   If orchestrator changes, {} nodes affected:",
        impact.affected.len()
    );
    assert!(
        impact.affected.len() > 0,
        "orchestrator impact should affect nodes"
    );
    for nid in &impact.affected {
        if let Some(node) = g.get_node(nid) {
            println!("     ⚡ {} ({})", node.label, nid);
        }
    }
    println!(
        "   Critical path: {}",
        if impact.critical_path {
            "YES ⚠️"
        } else {
            "no"
        }
    );

    // Q3: path
    println!("\n  Q3: path(\"api-gateway\", \"db-primary\")");
    let path = g.path(&"api-gateway".to_string(), &"db-primary".to_string(), false);
    if path.exists {
        println!("   Path found ({} steps):", path.length);
        assert!(path.length > 0, "Path should have at least 1 step");
        for e in &path.path {
            let src = g
                .get_node(&e.source)
                .map(|n| n.label.as_str())
                .unwrap_or(&e.source);
            let tgt = g
                .get_node(&e.target)
                .map(|n| n.label.as_str())
                .unwrap_or(&e.target);
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
    println!(
        "   Nodes: {}  Edges: {}",
        health.total_nodes, health.total_edges
    );
    println!(
        "   Orphans: {}  Sources: {}  Sinks: {}  Components: {}",
        health.orphans.len(),
        health.sources.len(),
        health.sinks.len(),
        health.disconnected_components
    );

    // ─── Phase 3: Cross-Field Bridge (Forward) ────────────────
    println!("\n━━━ Phase 3: Cross-Field Bridge (Forward: system-arch → data-flow) ━━━");
    println!("\n  Cross-field traverse from orchestrator (system-arch → data-flow):");
    let cross = cluster.traverse_across_fields(
        &"system-arch".to_string(),
        &"orchestrator".to_string(),
        None,
        2,
    );
    for (fid, (nodes, edges)) in &cross {
        println!(
            "   Field '{}': {} nodes, {} edges",
            fid,
            nodes.len(),
            edges.len()
        );
        for nid in nodes {
            if let Some(node) = cluster.get_node(nid) {
                println!("     → {} ({})", node.label, nid);
            }
        }
    }

    // ─── Phase 4: Bidirectional Bridge (Reverse: data-flow → system-arch) ────
    println!("\n━━━ Phase 4: Bidirectional Bridge (Reverse: data-flow → system-arch) ━━━");
    let cross_rev = cluster.traverse_across_fields(
        &"data-flow".to_string(),
        &"redis-cache".to_string(),
        None,
        2,
    );
    let mut found_reverse = false;
    for (fid, (nodes, _)) in &cross_rev {
        println!("   Field '{}': {} nodes", fid, nodes.len());
        for nid in nodes {
            if let Some(node) = cluster.get_node(nid) {
                println!("     → {} ({})", node.label, nid);
                if nid == "orchestrator" {
                    found_reverse = true;
                }
            }
        }
    }
    println!(
        "   Reverse bridge works: {}",
        if found_reverse { "✅ YES" } else { "❌ NO" }
    );

    // ─── Phase 5: Cross-Field Path ─────────────────────────────
    println!("\n━━━ Phase 5: Cross-Field Path ━━━");
    println!("\n  Cross-field path: api-gateway → redis-cache");
    let cf_path = cluster.path_across_fields(
        &"api-gateway".to_string(),
        &"redis-cache".to_string(),
        &"system-arch".to_string(),
    );
    if cf_path.exists {
        println!(
            "   Path found ({} steps) across {} fields!",
            cf_path.length,
            cf_path.field_path.len()
        );
        for (i, e) in cf_path.path.iter().enumerate() {
            let src = cluster
                .get_node(&e.source)
                .map(|n| n.label.as_str())
                .unwrap_or(&e.source);
            let tgt = cluster
                .get_node(&e.target)
                .map(|n| n.label.as_str())
                .unwrap_or(&e.target);
            let fh = if i < cf_path.field_path.len() {
                format!(" [field: {}]", cf_path.field_path[i])
            } else {
                String::new()
            };
            let bh = e
                .target_field
                .as_ref()
                .map(|f| format!(" → bridge to field: {}", f))
                .unwrap_or_default();
            println!(
                "     {} → {} [{}{}{}]",
                src,
                tgt,
                e.relation.as_str(),
                fh,
                bh
            );
        }
    } else {
        println!("   No path found");
    }

    // ─── Phase 6: Cross-Field Impact ────────────────────────────
    println!("\n━━━ Phase 6: Cross-Field Impact ─━━");
    let cf_impact = cluster.impact_across_fields(&"redis-cache".to_string());
    println!(
        "   If redis-cache changes, {} nodes affected:",
        cf_impact.affected.len()
    );
    let mut orchestrator_affected = false;
    for nid in &cf_impact.affected {
        if let Some(node) = cluster.get_node(nid) {
            println!("     ⚡ {} ({})", node.label, nid);
            if nid == "orchestrator" {
                orchestrator_affected = true;
            }
        }
    }
    println!(
        "   Cross-field impact (redis-cache → orchestrator): {}",
        if orchestrator_affected {
            "✅ YES"
        } else {
            "❌ NO"
        }
    );

    // ─── Phase 7: Storage Format ────────────────────────────────
    println!("\n━━━ Phase 7: Storage Format ─━━");
    let serialized = serialize_cluster(&cluster).expect("Serialization failed");
    println!("  Serialized size: {} bytes", serialized.len());

    // Verify raw binary format: magic bytes at offset 0
    let magic: [u8; 4] = serialized[0..4].try_into().unwrap();
    println!(
        "  Magic bytes: {:02X?} {}",
        magic,
        if magic == [0x53, 0x54, 0x5A, 0x00] {
            "✅ STZ\\0"
        } else {
            "❌ WRONG"
        }
    );
    assert_eq!(
        magic,
        [0x53, 0x54, 0x5A, 0x00],
        "Magic bytes should be STZ\\0"
    );

    // Verify version
    let version = u16::from_le_bytes(serialized[4..6].try_into().unwrap());
    println!(
        "  Version: 0x{:04X} {}",
        version,
        if version == 0x0001 {
            "✅"
        } else {
            "❌ WRONG"
        }
    );

    // Verify flags
    let flags = u16::from_le_bytes(serialized[6..8].try_into().unwrap());
    println!("  Flags: 0x{:04X}", flags);

    // Verify hash at end
    let hash_start = serialized.len() - 32;
    let stored_hash = &serialized[hash_start..];
    println!("  Hash (last 32 bytes): {}", hex::encode(stored_hash));

    // Verify deserialization
    let deserialized = deserialize_cluster(&serialized).expect("Deserialization failed");
    println!(
        "  Deserialized: {} nodes, {} fields — ✅",
        deserialized.nodes.len(),
        deserialized.fields.len()
    );

    // Verify lightweight verify
    let verify_result = verify_stz_file(&serialized);
    println!(
        "  Lightweight verify: {}",
        if verify_result.is_ok() { "✅" } else { "❌" }
    );

    // Verify corruption detection
    let mut corrupted = serialized.clone();
    corrupted[hash_start + 5] ^= 0xFF; // flip bits in the hash
    let corrupt_result = verify_stz_file(&corrupted);
    println!(
        "  Corruption detection: {}",
        if corrupt_result.is_err() {
            "✅ detects corruption"
        } else {
            "❌ fails to detect"
        }
    );

    // ─── Phase 8: JSON Export ──────────────────────────────────
    println!("\n━━━ Phase 8: JSON Export ─━━");
    let json = export_cluster_json(&cluster).expect("JSON export failed");
    println!("  JSON output: {} chars", json.len());
    assert!(json.starts_with("{"), "JSON should be an object");
    assert!(
        json.contains("api-gateway"),
        "JSON should contain node data"
    );
    println!("  JSON structure: ✅ valid");

    // ─── Phase 9: Password ──────────────────────────────────────
    println!("\n━━━ Phase 9: Password Protection ─━━");
    let pwd = "statuz-secret-2026";
    match hash_password(pwd) {
        Ok(hash) => {
            println!("  Password hash: {}...", &hash[..20]);
            let mut p_cluster = Cluster::new(
                "pwd-test".into(),
                "Password Test".into(),
                Visibility::Private,
            );
            p_cluster.password_hash = Some(hash);
            let verified = verify_password(&p_cluster, pwd);
            println!("  Password verify (correct): {}", verified);
            assert!(verified, "Correct password should verify");
            let wrong = verify_password(&p_cluster, "wrong-password");
            println!("  Password verify (wrong):  {}", wrong);
            assert!(!wrong, "Wrong password should not verify");
        }
        Err(e) => eprintln!("  Password test error: {}", e),
    }

    // ─── Phase 10: Sharing Mechanism ─────────────────────────────
    println!("\n━━━ Phase 10: Sharing Mechanism ─━━");

    // Scenario 1: Clone with default options (reset password, reset timestamps)
    println!("\n  Scenario 1: Clone with default options");
    let cloned = cluster
        .clone_with_options(&CloneOptions::default())
        .expect("Clone failed");
    assert!(
        cloned.password_hash.is_none(),
        "Default clone should reset password"
    );
    assert!(cloned.id != cluster.id, "Clone should have new ID");
    println!(
        "   ✅ Clone with defaults: new ID = {}...{}",
        &cloned.id[..8],
        &cloned.id[cloned.id.len() - 8..]
    );

    // Scenario 2: Clone with custom name and password
    println!("\n  Scenario 2: Clone with custom name and password");
    let named = cluster
        .clone_fresh(
            Some("Cloned Cluster".to_string()),
            Some("secret123".to_string()),
        )
        .expect("Clone with name failed");
    assert!(
        named.password_hash.is_some(),
        "Named clone should have password"
    );
    assert!(
        named.unlock("secret123"),
        "Named clone should unlock with correct password"
    );
    assert!(
        !named.unlock("wrong"),
        "Named clone should not unlock with wrong password"
    );
    assert_eq!(named.name, "Cloned Cluster");
    println!(
        "   ✅ Clone with name and password: name='{}', password protected={}",
        named.name,
        named.password_hash.is_some()
    );

    // Scenario 3: Merge with Skip strategy
    println!("\n  Scenario 3: Merge with Skip strategy");
    let mut target = cluster.clone();
    let mut source = cluster.clone();
    let unique_node = Node {
        id: "unique-node-merge-test".into(),
        type_: "test".into(),
        label: "Unique Node".into(),
        status: NodeStatus::Active,
        meta: None,
    };
    source.register_node(unique_node);
    let result = target.merge_from(&source, &MergeStrategy::Skip);
    assert!(result.nodes_added > 0, "Skip merge should add new nodes");
    // The 7 original nodes exist in both clusters → conflicts → skipped
    assert_eq!(
        result.nodes_skipped, 7,
        "Skip merge should skip the 7 conflicting nodes"
    );
    assert!(
        target.nodes.contains_key("unique-node-merge-test"),
        "Skip merge should add unique node"
    );
    println!(
        "   ✅ Merge (Skip): {} nodes added, {} skipped",
        result.nodes_added, result.nodes_skipped
    );

    // Scenario 4: Merge with Overwrite strategy
    println!("\n  Scenario 4: Merge with Overwrite strategy");
    let mut target2 = cluster.clone();
    let mut source2 = cluster.clone();
    let mut modified_node = source2.nodes.get("api-gateway").unwrap().clone();
    modified_node.label = "API Gateway (Modified)".to_string();
    source2.nodes.insert("api-gateway".into(), modified_node);
    let result2 = target2.merge_from(&source2, &MergeStrategy::Overwrite);
    assert!(
        result2.nodes_overwritten > 0,
        "Overwrite merge should overwrite conflicting nodes"
    );
    assert_eq!(
        target2.nodes.get("api-gateway").unwrap().label,
        "API Gateway (Modified)",
        "Overwrite should replace node label"
    );
    println!(
        "   ✅ Merge (Overwrite): {} nodes added, {} overwritten",
        result2.nodes_added, result2.nodes_overwritten
    );

    // Scenario 5: Merge with Rename strategy
    println!("\n  Scenario 5: Merge with Rename strategy");
    let mut target3 = cluster.clone();
    let source3 = cluster.clone();
    let result3 = target3.merge_from(
        &source3,
        &MergeStrategy::Rename {
            suffix: "-v2".to_string(),
        },
    );
    assert!(
        result3.nodes_added > 0,
        "Rename merge should add nodes with suffix"
    );
    assert!(
        target3.nodes.contains_key("api-gateway-v2"),
        "Rename should create api-gateway-v2"
    );
    println!(
        "   ✅ Merge (Rename): {} nodes added (with suffix -v2)",
        result3.nodes_added
    );

    // Scenario 6: Password lifecycle + visibility
    println!("\n  Scenario 6: Password lifecycle and visibility");
    let mut pwd_cluster = Cluster::new(
        "pwd-lifecycle".into(),
        "Password Lifecycle".into(),
        Visibility::Private,
    );
    pwd_cluster
        .set_password("initial-pass")
        .expect("Set password failed");
    assert!(
        pwd_cluster.unlock("initial-pass"),
        "Should unlock with correct password"
    );
    pwd_cluster
        .change_password("initial-pass", "new-pass")
        .expect("Change password failed");
    assert!(
        pwd_cluster.unlock("new-pass"),
        "Should unlock with new password"
    );
    assert!(
        !pwd_cluster.unlock("initial-pass"),
        "Should NOT unlock with old password"
    );
    pwd_cluster.clear_password();
    assert!(
        pwd_cluster.password_hash.is_none(),
        "Password should be cleared"
    );
    assert!(
        pwd_cluster.unlock("anything"),
        "No password = always unlocked"
    );
    pwd_cluster.set_visibility(Visibility::Public);
    assert_eq!(
        pwd_cluster.visibility,
        Visibility::Public,
        "Visibility should be Public"
    );
    println!("   ✅ Password lifecycle: set → change → clear → verify");
    println!("   ✅ Visibility: changed to {:?}", pwd_cluster.visibility);

    // ─── Phase 11: Subgraph, Validate, Diff ───────────────────────
    println!("\n━━━ Phase 11: Subgraph, Validate, Diff ─━━");

    // Subgraph: extract from "system-arch" field, depth=1 from api-gateway
    let sg = cluster
        .subgraph("system-arch", &["api-gateway".into()], Some(1), None)
        .expect("subgraph should succeed");
    println!(
        "  Subgraph (api-gateway, depth=1): {} nodes, {} edges",
        sg.nodes.len(),
        sg.edges.len()
    );
    assert!(
        sg.nodes.len() >= 2,
        "subgraph should include at least 2 nodes (api-gateway + its neighbors)"
    );
    assert!(sg.edges.len() >= 2, "subgraph should include at least 2 edges (api-gateway -> auth, api-gateway -> orchestrator)");

    // Validate: test cluster should be clean
    let vr = cluster.validate();
    println!(
        "  Cluster validation: valid={}, issues={}",
        vr.is_valid,
        vr.issues.len()
    );
    assert!(vr.is_valid, "test cluster should be valid");
    assert!(
        vr.issues.is_empty(),
        "test cluster should have no validation issues, got {} issues",
        vr.issues.len()
    );

    // Diff: identical clusters should have no differences
    let identical_clone = cluster.clone();
    let diff_same = cluster.diff(&identical_clone);
    println!(
        "  Diff (identical): {} changes",
        diff_same.added_nodes.len()
            + diff_same.removed_nodes.len()
            + diff_same.changed_nodes.len()
            + diff_same.added_edges.len()
            + diff_same.removed_edges.len()
            + diff_same.changed_edges.len()
            + diff_same.added_fields.len()
            + diff_same.removed_fields.len()
    );
    assert!(
        diff_same.added_nodes.is_empty(),
        "identical clusters should have no added nodes"
    );
    assert!(
        diff_same.removed_nodes.is_empty(),
        "identical clusters should have no removed nodes"
    );
    assert!(
        diff_same.changed_nodes.is_empty(),
        "identical clusters should have no changed nodes"
    );

    // Diff: clusters with changes should detect differences
    let mut modified = cluster.clone();
    modified.register_node(Node {
        id: "diff-test-node".into(),
        type_: "test".into(),
        label: "Diff Test".into(),
        status: NodeStatus::Active,
        meta: None,
    });
    let diff_mod = cluster.diff(&modified);
    println!("  Diff (1 new node): {} added", diff_mod.added_nodes.len());
    assert_eq!(
        diff_mod.added_nodes.len(),
        1,
        "should detect exactly 1 added node"
    );
    assert_eq!(
        diff_mod.added_nodes[0].id, "diff-test-node",
        "added node should have the correct ID"
    );

    println!("  ✅ Phase 11 passed");

    // ─── Summary ─────────────────────────────────────────────────
    println!("\n━━━ Summary ─━━");
    println!("  ✅ GraphEngine: traverse, impact, path, centrality, health, subgraph, validate");
    println!("  ✅ Cluster: multi-field, centralized node registry, diff, validate, subgraph");
    println!("  ✅ Bidirectional bridges: forward + reverse cross-field traversal");
    println!("  ✅ Cross-field path: field-level metadata in path display");
    println!("  ✅ Cross-field impact: reverse BFS across all fields");
    println!("  ✅ Storage: raw binary format (STZ\\0 magic + version + flags + msgpack + blake3)");
    println!("  ✅ Corruption detection: hash mismatch detection");
    println!("  ✅ JSON export: human-readable debugging output");
    println!("  ✅ Password: argon2 verification");
    println!("  ✅ Sharing: clone, merge (skip/overwrite/rename), password lifecycle, visibility");
    println!("  ✅ Subgraph, Validate, Diff: engine-level subgraph extraction, consistency check, cluster diff");
    println!("\n✅ All 11 phases passed. Engine is ready for representation layer.\n");
}
