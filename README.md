# Statuz

**A graph engine for AI project ecosystems.**

Statuz is an in-memory graph engine that computes the topology of AI project ecosystems. It answers three fundamental questions: What does this connect to? If this changes, who is affected? How do I get there?

## Quick Start

```bash
# Build from source
cd crates/statuz-core
cargo build --release

# Initialize a cluster
cargo run -- init -n "My Project" -v private

# Save as .stz file
cargo run -- save -o my-project.stz

# Load and inspect
cargo run -- load -p my-project.stz
cargo run -- show -p my-project.stz

# Load an encrypted file (password required)
cargo run -- load -p my-project.stz --password "your-secret"

# Verify integrity
cargo run -- verify -p my-project.stz

# Save with compression
cargo run -- save -o my-project.stz --compress

# Save with encryption
cargo run -- save -o my-project.stz --encrypt --password "your-secret"

# Run self-test
cargo run -- self-test

# Run unit tests
cargo test

# Cross-field demo (2 fields + 1 bridge)
cargo run --example cross_field

# End-to-end workflow test (create → clone → merge → password)
powershell -ExecutionPolicy Bypass -File scripts/e2e.ps1
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `init` | Create a new cluster |
| `show` | Display cluster info (nodes, fields, bridges) |
| `save` | Serialize cluster to `.stz` file |
| `load` | Deserialize and inspect `.stz` file |
| `verify` | Check `.stz` integrity without full deserialization |
| `export` | Export cluster to human-readable JSON |
| `clone` | Clone a cluster with rename/fresh options |
| `merge` | Merge two clusters with conflict strategies |
| `set-password` | Set/change/clear cluster password |
| `set-visibility` | Change cluster visibility (Public/Private/Organization) |
| `self-test` | Run 11-phase built-in verification |

### Save Options

| Flag | Description |
|------|-------------|
| `--compress` | Enable zstd compression (smaller files) |
| `--encrypt` | Enable chacha20 encryption (requires `--password`) |
| `--password` | Password for encryption |

## Architecture

```
crates/statuz-core/
├── graph/         ← In-memory adjacency list + graph algorithms
│   ├── types.rs   ← Node, Edge, Relation type system
│   ├── engine.rs  ← GraphEngine: add/remove/traverse/serialize
│   └── query.rs   ← Three core queries: traverse, impact, path
├── cluster/       ← Storage container + multi-field ecosystem
│   ├── cluster.rs ← Cluster: centralized node registry, cross-field bridges
│   ├── field.rs   ← Field: sub-graph within a cluster
│   └── sharing.rs ← Clone, Merge, Password, Visibility
├── storage/       ← Storage format (msgpack + blake3 + argon2 + zstd + chacha20)
│   └── mod.rs     ← Ser/Des, hash ID, password verification, compression, encryption
└── main.rs        ← CLI (11 commands + self-test)
```

## The Three Queries

| Query | What it answers | Method |
|-------|----------------|--------|
| `traverse(from, relation?)` | "What does this connect to?" | Direct adjacency lookup |
| `impact(nodeId)` | "If this changes, who's affected?" | Reverse BFS (blast radius) |
| `path(from, to)` | "How do I get there?" | BFS shortest path |

## Storage Format

```
[STZ\0][version][flags][salt][content...][blake3 hash]
 4 bytes  2 bytes  2 bytes  16 bytes  variable   32 bytes
```

- **Content-addressed**: ID = blake3(content) hex
- **Compression**: zstd (level 3, enabled via `--compress`)
- **Encryption**: chacha20 with argon2-derived key (enabled via `--encrypt`)
- **Integrity**: blake3 hash verified on every load
- **Backward compatible**: reads v0x0001 format (pre-encryption)

## Development

```bash
# Build
cargo build

# Run all tests
cargo test

# Run self-test
cargo run -- self-test

# Code style check
cargo clippy

# Run end-to-end test
./scripts/e2e.ps1
```

## Design Principles

- **Memory-first**: All graph operations in-memory. Serialization is secondary.
- **Zero non-serde dependencies**: Graph algorithms are pure `std`. Compression/encryption libraries are infrastructure, not business logic.
- **Cluster is the only storage unit**: No YAML files, no individual node files.
- **Offline sharing**: Clone + Merge via files, not network.

## What Statuz is Not

- Not a database
- Not a protocol (not MCP, not A2A, not a transport protocol)
- Not a YAML/Niche/SYN document system
- Not a dashboard (UI is a separate concern)

## License

MIT