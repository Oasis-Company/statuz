//! D0' Hotspot Profiler — benchmark harness for storage & query hot spots.
//!
//! Plan: .hermes/plans/2026-08-09_134415-csr-dual-layout-plan.md (v2, D0')
//!
//! Usage:
//!   cargo run --example bench_graph -- 1k
//!   cargo run --example bench_graph -- 100k --profile
//!
//! Scale: 1k | 10k | 100k (total local edges). Deterministic seed — reproducible.
//!
//! Synthetic graph generation rules (Q1 — team review required):
//!   - nodes = edges / 5 + 50; 3 fields (arch/data/team); bridges = edges/100 + 3
//!   - local edges: 60% attach to hubs (index % 20 == 0), 40% uniform random
//!   - source != target; relation = depends_on; weight = 0.5
//!   - bridges: random field pair, random node pair, weight 0.8

use statuz_core::*;
use std::time::Instant;

const FIELDS: [&str; 3] = ["arch", "data", "team"];

// ─── Deterministic LCG (reproducible across platforms, no external deps) ───

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
    /// True with probability pct/100.
    fn chance(&mut self, pct: u64) -> bool {
        self.next() % 100 < pct
    }
}

// ─── Synthetic graph generation ────────────────────────────────────────────

fn hub_index(rng: &mut Lcg, nodes: usize) -> usize {
    rng.below(nodes / 20 + 1) * 20
}

fn add_local_edge(cluster: &mut Cluster, field: &str, src: usize, tgt: usize, id: usize) {
    if let Some(f) = cluster.get_field_mut(field) {
        f.graph.add_edge(Edge {
            id: format!("e{}", id),
            source: format!("n{}", src),
            target: format!("n{}", tgt),
            relation: Relation::DependsOn,
            weight: 0.5,
            description: "bench edge".into(),
            target_field: None,
            meta: None,
        });
    }
}

fn build_cluster(total_edges: usize, total_bridges: usize) -> Cluster {
    let nodes = total_edges / 5 + 50;
    let mut cluster = Cluster::new(
        "bench".to_string(),
        "Benchmark Cluster".to_string(),
        Visibility::Private,
    );
    for i in 0..nodes {
        cluster.register_node(Node {
            id: format!("n{}", i),
            type_: "service".into(),
            label: format!("Node {}", i),
            status: NodeStatus::Active,
            meta: None,
        });
    }
    for (i, f) in FIELDS.iter().enumerate() {
        cluster.create_field(f.to_string(), format!("Field {}", i), None);
    }

    let mut rng = Lcg::new(0x5EED_2026);
    let per_field = total_edges / FIELDS.len();
    let mut edge_id = 0usize;
    for field in FIELDS {
        for _ in 0..per_field {
            let src = if rng.chance(60) {
                hub_index(&mut rng, nodes)
            } else {
                rng.below(nodes)
            };
            let mut tgt = rng.below(nodes);
            if tgt == src {
                tgt = (tgt + 1) % nodes;
            }
            add_local_edge(&mut cluster, field, src, tgt, edge_id);
            edge_id += 1;
        }
    }
    for _ in 0..total_bridges {
        let fi = rng.below(FIELDS.len());
        let fj = (fi + 1 + rng.below(FIELDS.len() - 1)) % FIELDS.len();
        let src = rng.below(nodes);
        let tgt = rng.below(nodes);
        let _ = cluster.add_bridge(
            FIELDS[fi],
            FIELDS[fj],
            &format!("n{}", src),
            &format!("n{}", tgt),
            "bench bridge".into(),
            0.8,
        );
    }
    cluster
}

// ─── Query benchmarking ────────────────────────────────────────────────────

struct Segment {
    name: &'static str,
    ops: usize,
    total_ms: f64,
}

fn bench_queries(cluster: &Cluster, scale: usize) -> Vec<Segment> {
    let mut rng = Lcg::new(0x5EED_2026);
    // Op counts adaptive: keep the 100k debug run bounded (~30s).
    let (n_trav_local, n_imp_local, n_path_local, n_cross) = (
        10_000usize,
        1_000usize,
        1_000usize,
        (300_000 / scale).max(100),
    );

    let mut field_nodes: Vec<Vec<String>> = FIELDS
        .iter()
        .map(|f| {
            cluster
                .get_field(f)
                .map(|field| {
                    field
                        .graph
                        .all_nodes()
                        .iter()
                        .map(|n| n.id.clone())
                        .collect()
                })
                .unwrap_or_default()
        })
        .collect();
    // ensure non-empty fallback: registry-wide ids
    if field_nodes.iter().all(|v| v.is_empty()) {
        field_nodes = vec![vec!["n0".into()]; FIELDS.len()];
    }

    // Warmup (cold caches, first-touch pages)
    for _ in 0..50 {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        if let Some(field) = cluster.get_field(f) {
            let _ = field
                .graph
                .traverse(&nodes[rng.below(nodes.len())], None, false);
        }
        let _ = cluster.impact_across_fields(&nodes[rng.below(nodes.len())]);
    }

    let mut segs = Vec::new();

    // traverse (field-local)
    let t0 = Instant::now();
    for _ in 0..n_trav_local {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        if let Some(field) = cluster.get_field(f) {
            let _ = field
                .graph
                .traverse(&nodes[rng.below(nodes.len())], None, false);
        }
    }
    segs.push(Segment {
        name: "traverse (local)",
        ops: n_trav_local,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    // impact (field-local)
    let t0 = Instant::now();
    for _ in 0..n_imp_local {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        if let Some(field) = cluster.get_field(f) {
            let _ = field.graph.impact(&nodes[rng.below(nodes.len())]);
        }
    }
    segs.push(Segment {
        name: "impact (local)",
        ops: n_imp_local,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    // path (field-local)
    let t0 = Instant::now();
    for _ in 0..n_path_local {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        if let Some(field) = cluster.get_field(f) {
            let a = &nodes[rng.below(nodes.len())];
            let b = &nodes[rng.below(nodes.len())];
            let _ = field.graph.path(a, b, false);
        }
    }
    segs.push(Segment {
        name: "path (local)",
        ops: n_path_local,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    // traverse (cross-field)
    let t0 = Instant::now();
    for _ in 0..n_cross {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        let _ = cluster.traverse_across_fields(f, &nodes[rng.below(nodes.len())], None, 3);
    }
    segs.push(Segment {
        name: "traverse (cross-field)",
        ops: n_cross,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    // impact (cross-field) — THE D0' hotspot candidate
    let t0 = Instant::now();
    for _ in 0..n_cross {
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        let _ = cluster.impact_across_fields(&nodes[rng.below(nodes.len())]);
    }
    segs.push(Segment {
        name: "impact (cross-field)",
        ops: n_cross,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    // path (cross-field)
    let t0 = Instant::now();
    for _ in 0..n_cross {
        let f = FIELDS[rng.below(FIELDS.len())];
        let nodes = &field_nodes[rng.below(FIELDS.len())];
        let a = &nodes[rng.below(nodes.len())];
        let b = &nodes[rng.below(nodes.len())];
        let _ = cluster.path_across_fields(a, b, f);
    }
    segs.push(Segment {
        name: "path (cross-field)",
        ops: n_cross,
        total_ms: t0.elapsed().as_secs_f64() * 1e3,
    });

    segs
}

// ─── Report ────────────────────────────────────────────────────────────────

fn print_report(
    scale: usize,
    cluster: &Cluster,
    bytes: usize,
    build_ms: f64,
    save_ms: f64,
    load_ms: f64,
    segs: &[Segment],
) {
    let total_edges: usize = FIELDS
        .iter()
        .filter_map(|f| cluster.get_field(f))
        .map(|f| f.graph.all_edges().len())
        .sum();
    println!("════════ D0' Hotspot Profile ════════");
    println!(
        "build: {} | nodes: {} | edges: {} | bridges: {} | fields: {}",
        if cfg!(debug_assertions) {
            "DEBUG"
        } else {
            "RELEASE"
        },
        cluster.nodes.len(),
        total_edges,
        cluster.bridges.as_ref().map_or(0, |b| b.len()),
        FIELDS.len()
    );
    println!(
        "serialized: {} bytes | build {:.1}ms | save {:.1}ms | load {:.1}ms",
        bytes, build_ms, save_ms, load_ms
    );
    println!();
    println!("── Query segments (hotspot ranking) ──");
    println!(
        "{:<28} {:>10} {:>12} {:>10} {:>8}",
        "segment", "ops", "total ms", "us/op", "share"
    );
    let query_ms: f64 = segs.iter().map(|s| s.total_ms).sum();
    for s in segs {
        println!(
            "{:<28} {:>10} {:>12.1} {:>10.1} {:>7.1}%",
            s.name,
            s.ops,
            s.total_ms,
            s.total_ms * 1e3 / s.ops as f64,
            s.total_ms / query_ms * 100.0
        );
    }
    println!("───────────────────────────────────────");
    println!("query total: {:.1}ms | scale: {} edges", query_ms, scale);
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let scale_str = args.get(1).map(String::as_str).unwrap_or("10k");
    let profile = args.iter().any(|a| a == "--profile");
    let edges = match scale_str {
        "1k" => 1_000usize,
        "10k" => 10_000usize,
        "100k" => 100_000usize,
        other => {
            eprintln!(
                "usage: bench_graph [1k|10k|100k] [--profile] (got '{}')",
                other
            );
            std::process::exit(2);
        }
    };
    let bridges = edges / 100 + 3;

    let t0 = Instant::now();
    let cluster = build_cluster(edges, bridges);
    let build_ms = t0.elapsed().as_secs_f64() * 1e3;

    let t0 = Instant::now();
    let bytes = serialize_cluster(&cluster).expect("serialize");
    let save_ms = t0.elapsed().as_secs_f64() * 1e3;

    let t0 = Instant::now();
    let loaded = deserialize_cluster(&bytes).expect("deserialize");
    let load_ms = t0.elapsed().as_secs_f64() * 1e3;

    let segs = bench_queries(&loaded, edges);

    if profile {
        println!("[profile] per-segment breakdown enabled (default detail)");
    }
    print_report(
        edges,
        &loaded,
        bytes.len(),
        build_ms,
        save_ms,
        load_ms,
        &segs,
    );
}
