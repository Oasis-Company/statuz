# Statuz Domain Context

## One-Line Definition
Statuz is a **graph engine** for understanding the structure of AI project ecosystems — who depends on what, what happens when something changes, and how to navigate the topology.

## Core Concepts

### Graph Engine
The heart of Statuz. An in-memory adjacency list (`HashMap<NodeId, HashMap<NodeId, Vec<Edge>>>`) that stores nodes and edges, and supports three queries: traverse, impact, path.

### Three Queries
- **Traverse**: "What does this node connect to?" — direct adjacency lookup
- **Impact**: "If this changes, who's affected?" — reverse BFS blast radius
- **Path**: "How do I get there?" — BFS shortest path between two nodes

### Cluster
The only storage unit. A self-contained, content-addressed graph container with:
- **Nodes**: global node registry shared across all fields
- **Fields**: named sub-graphs within a cluster (different perspectives)
- **Bridges**: bidirectional cross-field edges connecting nodes across fields
- **Password**: optional argon2 password protection

### Field
A sub-graph within a cluster. Each field has its own `GraphEngine` instance but shares the cluster's node registry. Provides perspective isolation — different teams see different views of the same topology.

### Bridge
A bidirectional cross-field connection. When you add a bridge between node A in Field X and node B in Field Y, both fields store the connection. Queries (traverse, impact, path) automatically cross bridges.

### Storage Format
`.stz` binary format: `[magic:4][version:2][flags:2][msgpack:var][blake3:32]`
- Content-addressable: blake3 hash of content determines identity
- Password-protected: argon2 for key derivation
- Structurally validated: magic bytes, version check, integrity hash

### Sharing
- **Clone**: Create a copy of a cluster with optional ID regeneration
- **Merge**: Combine two clusters with 4 strategies (Skip, Overwrite, Rename, MergeMeta)
- **Visibility**: Public, Private, or Organization

## CLI
11 commands: `init`, `show`, `save`, `load`, `verify`, `export`, `clone`, `merge`, `set-password`, `set-visibility`, `self-test`

## What Statuz Is NOT
- Not a database (no queries beyond the three)
- Not a protocol (no transport layer)
- Not a replacement for MCP (accessed through MCP, not replacing it)
- Not a YAML document system (old paradigm, discarded)
- Not a real-time sync system (offline file sharing only)

## Project History
- **June 2026**: TypeScript + YAML protocol paradigm (frozen, migrated to `leftover/`)
- **July 2026**: Paradigm shift to Rust graph engine (current, active development)
- **Engine**: ~2500 lines Rust, 10-phase self-test, 11 CLI commands
- **Website**: 1471-line single-page HTML, Architectural Blueprint design