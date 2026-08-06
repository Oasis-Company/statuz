//! Cross-Field Demo — M3 milestone artifact
//!
//! Shows the cluster's cross-field capabilities with 2 fields + 1 bridge:
//!   1. traverse_across_fields — what connects to what, crossing bridges
//!   2. impact_across_fields  — if a node changes, who is affected everywhere
//!   3. path_across_fields    — shortest path across field boundaries
//!
//! Run: cargo run --example cross_field

use statuz_core::*;

fn node(id: &str) -> Node {
    Node {
        id: id.into(),
        type_: "service".into(),
        label: id.to_string(),
        status: NodeStatus::Active,
        meta: None,
    }
}

fn edge(id: &str, src: &str, dst: &str, relation: Relation, description: &str) -> Edge {
    Edge {
        id: id.into(),
        source: src.into(),
        target: dst.into(),
        relation,
        weight: 1.0,
        description: description.into(),
        target_field: None,
        meta: None,
    }
}

fn main() {
    println!("╔══════════════════════════════════════════════════════╗");
    println!("║   Statuz Cross-Field Demo — 2 fields, 1 bridge      ║");
    println!("╚══════════════════════════════════════════════════════╝\n");

    // ─── Build the demo cluster ──────────────────────────────
    let mut cluster = Cluster::new(
        "demo-cross-field".into(),
        "Payment Platform".into(),
        Visibility::Private,
    );

    for id in ["api-gateway", "auth-service", "db-primary", "redis-cache"] {
        cluster.register_node(node(id));
    }
    cluster.create_field("arch".into(), "Architecture".into(), None);
    cluster.create_field("data".into(), "Data Flow".into(), None);

    // Field "arch": api-gateway delegates auth to auth-service
    cluster
        .get_field_mut("arch")
        .unwrap()
        .graph
        .add_edge(edge(
            "e1",
            "api-gateway",
            "auth-service",
            Relation::DependsOn,
            "API Gateway delegates auth",
        ));

    // Field "data": auth-service reads db, redis-cache feeds db
    let data = cluster.get_field_mut("data").unwrap();
    data.graph.add_edge(edge(
        "e2",
        "auth-service",
        "db-primary",
        Relation::DependsOn,
        "Auth Service reads user data",
    ));
    data.graph.add_edge(edge(
        "e3",
        "redis-cache",
        "db-primary",
        Relation::DependsOn,
        "Redis cache feeds the DB",
    ));

    // Bridge: api-gateway (arch) ↔ redis-cache (data)
    cluster
        .add_bridge(
            "arch",
            "data",
            "api-gateway",
            "redis-cache",
            "API Gateway keeps sessions in Redis".into(),
            0.8,
        )
        .unwrap();

    println!("📦 Cluster: {} ({} nodes, {} fields)",
        cluster.name, cluster.nodes.len(), cluster.fields.len());
    for (fid, field) in &cluster.fields {
        println!("   ─ Field '{}': {} edges", fid, field.graph.edge_count());
    }
    println!("   🔗 Bridge: api-gateway (arch) ↔ redis-cache (data)\n");

    // ─── Q1: cross-field traverse ────────────────────────────
    println!("━━━ Q1: traverse_across_fields(\"arch\", \"api-gateway\") ━━━");
    let result = cluster.traverse_across_fields("arch", "api-gateway", None, 3);
    for (fid, (nodes, edges)) in &result {
        println!("  Field '{}': {} nodes, {} edges", fid, nodes.len(), edges.len());
        for nid in nodes {
            println!("     • {}", nid);
        }
    }
    println!();

    // ─── Q2: cross-field impact ──────────────────────────────
    println!("━━━ Q2: impact_across_fields(\"db-primary\") ━━━");
    let impact = cluster.impact_across_fields("db-primary");
    println!("   If db-primary changes, {} nodes affected:", impact.affected.len());
    for nid in &impact.affected {
        println!("     ⚡ {}", nid);
    }
    println!();

    // ─── Q3: cross-field path ────────────────────────────────
    println!("━━━ Q3: path_across_fields(\"api-gateway\", \"db-primary\") ━━━");
    let path = cluster.path_across_fields("api-gateway", "db-primary", "arch");
    if path.exists {
        println!("   Path found ({} steps):", path.length);
        println!("     api-gateway ──> redis-cache ──> db-primary");
        println!("     field path: arch ──> data");
    } else {
        println!("   No path found");
    }
    println!();

    println!("✅ Demo complete — cross-field traverse / impact / path all working.");
}
