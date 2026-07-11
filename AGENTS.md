# AGENTS.md — Statuz Rust Engine Working Guide

> All legacy docs (66 Manifesto, niche, SYN, schemas, examples) have been moved to `leftover/`.
> The project has been recalibrated. Read `STATUZ设计哲学的论述.md` for the current vision.
> **Language switch: Rust replaces TypeScript as the engine language (July 2026).**

## Current Architecture

```
crates/statuz-core/  ← Rust Graph Engine (active development)
  src/
    graph/           ← In-memory adjacency list + graph algorithms
      types.rs       ← Node, Edge, Relation, Field, Cluster type system
      engine.rs      ← GraphEngine: add/remove/traverse/serialize
      query.rs       ← Three core queries: traverse, impact, path
    cluster/         ← Cluster = storage container + multi-field ecosystem
      cluster.rs     ← Cluster: centralized node registry, cross-field bridges
      field.rs       ← Field: sub-graph within a cluster
    storage/         ← Statuz storage format (msgpack + blake3 + argon2)
      mod.rs         ← Ser/Des, hash ID, password verification
    main.rs          ← CLI (init, show, save, load, self-test)
    lib.rs           ← Public API exports
leftover/            ← All outdated docs, schemas, and examples
packages/            ← Legacy CLI/SDK/MCP code (frozen — to be replaced)
```

## Core Philosophy

- Statuz is a **graph engine**, not a protocol or document system
- Information must be **actively released** (like working memory), not passively retrieved
- "Better Engine, Better Diagram, Better Loop"
- Cluster is the storage standard; fields are sub-graphs within a cluster
- Cross-field communication is the core mechanism (bridge edges)
- Goal: July MVP — working Rust Engine + CLI Dashboard

## Engine Development Rules

1. **Zero non-serde dependencies** — Graph algorithms are pure std
2. **Memory-first** — All graph ops in-memory. Serialization is secondary.
3. **Three core queries** must always work: `traverse`, `impact`, `path`
4. **Self-test** — `cd crates/statuz-core && cargo run -- self-test` must pass before any commit
5. **No YAML files** — Old paradigm is dead. Engine uses msgpack+blake3 storage format.

## The Three Queries

| Query | What it answers | Method |
|-------|----------------|--------|
| `traverse(from, relation?)` | "What does this connect to?" | Direct adjacency lookup |
| `impact(nodeId)` | "If this changes, who's affected?" | Reverse BFS (blast radius) |
| `path(from, to)` | "How do I get there?" | BFS shortest path |

## Cluster Architecture

```
Cluster
├── nodes[]          ← Centralized node registry (shared across all fields)
├── fields[]         ← Named sub-graphs
│   ├── Field "Architecture"  → GraphEngine instance
│   └── Field "Data Flow"     → GraphEngine instance
├── bridges[]        ← Cross-field edges (relation: "bridges")
└── password_hash    ← argon2 (optional, for sharing)
```

## Storage Format

```
[magic: 4 bytes]   "STZ\0"
[version: 2 bytes] 0x0001
[flags: 2 bytes]   encryption/compression
[content: var]     msgpack-encoded Cluster
[hash: 32 bytes]   blake3 integrity hash
```

## Hard Rules

- Do NOT add YAML schemas, JSON Schema files, or protocol documents
- Do NOT revive niche, SYN, Arrow Map file formats from `leftover/`
- Do NOT add CLI commands before the Engine is solid
- Do NOT add databases, servers, or network calls
- Do NOT change the LICENSE without explicit human approval
- The Engine is the product — everything else emerges from it
- Cluster is the ONLY storage unit — no more arrow maps, niche files, or syn proposals

## Decision Rule

If a concept from the old paradigm (niche, SYN, status-keeper) comes up:
- **Can the Engine compute it?** → Add as a Rust method
- **Is it a UI concern?** → Defer to Dashboard phase
- **Is it a YAML file pattern?** → Discard

## Verification

```bash
cd crates/statuz-core
cargo run -- self-test
```

All queries must return correct results. Expanded tests also cover cross-field bridge traversal and storage format integrity.

## Handoff Rule

At the end of every meaningful change, summarize:
- What changed in the Engine
- Why it changed
- How to verify (`cargo run -- self-test`)
- What remains unresolved
- What the next agent should build