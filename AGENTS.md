# AGENTS.md — Statuz Rust Engine Working Guide

> All legacy docs (66 Manifesto, niche, SYN, schemas, examples) have been moved to `leftover/`.
> The project has been recalibrated. Read `STATUZ设计哲学的论述.md` for the current vision.
> **Language switch: Rust replaces TypeScript as the engine language (July 2026).**

## TRAE Skills

This project uses TRAE skills from `.agents/skills/` (installed via `mattpocock/skills`).

| Skill | Command | When to use |
|-------|---------|-------------|
| **tdd** | `/tdd` | Test-driven development. Write tests first, then implement. |
| **code-review** | `/code-review` | Two-axis review: standards compliance + spec alignment. |
| **domain-modeling** | `/domain-modeling` | Refine domain language, update CONTEXT.md, record ADRs. |
| **research** | `/research` | Background investigation (library choices, API docs). |
| **handoff** | `/handoff` | Cross-session handoff. Compress context to file for next agent. |
| **grill-with-docs** | `/grill-with-docs` | Clarify requirements against CONTEXT.md before building. |
| **diagnosing-bugs** | `/diagnosing-bugs` | Structured debugging loop for hard bugs. |
| **implement** | `/implement` | Coordinate implementation by delegating to tdd + code-review. |
| **prototype** | `/prototype` | Quick throwaway prototype to answer a design question. |

Key workflow: `/grill-with-docs` → `/tdd` → `/code-review` → commit.

## Current Architecture

```
crates/
├── statuz-core/         ← Rust Graph Engine (active development)
│   src/
│     graph/             ← In-memory adjacency list + graph algorithms
│       types.rs         ← Node, Edge, Relation, Field, Cluster type system
│       engine.rs        ← GraphEngine: add/remove/traverse/serialize
│       query.rs         ← Five core queries: traverse, impact, path, subgraph, validate
│     cluster/           ← Cluster = storage container + multi-field ecosystem
│       cluster.rs       ← Cluster: centralized node registry, diff, validate, subgraph
│       field.rs         ← Field: sub-graph within a cluster
│       sharing.rs       ← Clone, Merge, Password, Visibility
│     storage/           ← Statuz storage format (msgpack + blake3 + argon2)
│       mod.rs           ← Ser/Des, hash ID, password verification, compression, encryption
│     main.rs            ← CLI (init, show, save, load, self-test)
│     lib.rs             ← Public API exports
├── arrow-map/           ← Text-to-graph parser (placeholder)
├── niche/               ← Semantic interpretation engine (placeholder)
├── syn/                 ← Change decision & audit system (placeholder)
└── statuz-core-napi/    ← napi-rs bindings (frozen)
leftover/                ← All outdated docs, schemas, and examples
packages/                ← Legacy CLI/SDK/MCP code (frozen — to be replaced)
```

## Core Philosophy

- Statuz is a **graph engine**, not a protocol or document system
- Information must be **actively released** (like working memory), not passively retrieved
- "Better Engine, Better Diagram, Better Loop"
- Cluster is the storage standard; fields are sub-graphs within a cluster
- Cross-field communication is the core mechanism (bridge edges)
- Goal: July MVP — working Rust Engine + CLI

## Engine Development Rules

1. **Zero non-serde dependencies** — Graph algorithms are pure std. Compression/encryption libraries (zstd, chacha20) are infrastructure, not business logic.
2. **Memory-first** — All graph ops in-memory. Serialization is secondary.
3. **Five core queries** must always work: `traverse`, `impact`, `path`, `subgraph`, `validate`
4. **Self-test** — `cd crates/statuz-core && cargo run -- self-test` must pass before any commit
5. **No YAML files** — Old paradigm is dead. Engine uses msgpack+blake3 storage format.
6. **Unit tests** — Each module must have `#[cfg(test)]` tests. Run `cargo test` before any commit.
7. **No dead code** — Unused variables, imports, or functions must be removed or prefixed with `_`.
8. **Representation layer crates** — `arrow-map`, `niche`, `syn` are companion crates that depend on `statuz-core`. They must NOT create independent storage, CLI commands, or schema files. They communicate through the engine's public API only.

## The Five Queries (three core + two supplementary)

| Query | What it answers | Method |
|-------|----------------|--------|
| `traverse(from, relation?)` | "What does this connect to?" | Direct adjacency lookup |
| `impact(nodeId)` | "If this changes, who's affected?" | Reverse BFS (blast radius) |
| `path(from, to)` | "How do I get there?" | BFS shortest path |
| `subgraph(seeds, depth, relation?)` | "What does this sub-ecosystem look like?" | BFS extract |
| `validate()` | "Is the graph internally consistent?" | Structural consistency check |

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
[version: 2 bytes] 0x0002 (v0x0001 supported for backward compat)
[flags: 2 bytes]   bit 0 = encrypted, bit 1 = compressed
[salt: 16 bytes]   argon2 salt (only for v0x0002+, zeros when not encrypted)
[content: var]     msgpack-encoded Cluster (opt. compressed + encrypted)
[hash: 32 bytes]   blake3 integrity hash
```

Compression: `zstd` (level 3). Encryption: `chacha20` with argon2-derived key.
CLI: `statuz save --compress` / `statuz save --encrypt --password <pwd>`

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

## Coding Style

### Immutability

Prefer immutable patterns. In Rust, this is the default — use `&` references, avoid `Cell`/`RefCell` unless necessary. For data transformation, prefer constructing new instances over mutation.

### File Organization

- One concept per file. High cohesion, low coupling.
- 200-400 lines typical, 800 max.
- Organize by module (graph/, cluster/, storage/), not by type.

### Error Handling

- Use `Result<T, E>` for fallible operations. Prefer custom error enums over `String` errors.
- Use `Option<T>` for operations that may return nothing.
- Propagate errors with `?` operator. Do not unwrap in library code (main.rs is the exception).
- Validate inputs at public API boundaries. Use Rust's type system to make invalid states unrepresentable.

### Code Quality Checklist

Before marking work complete:
- [ ] Code compiles with no warnings (`cargo build` / `cargo check`)
- [ ] All tests pass (`cargo test`)
- [ ] Self-test passes (`cargo run -- self-test`)
- [ ] No `unwrap()` in library code
- [ ] No unused variables or imports
- [ ] Functions are small and focused
- [ ] No deep nesting (>4 levels)
- [ ] No hardcoded file paths or secrets

## Git Workflow

### Commit Message Format

```
<type>: <description>

<optional body>
```

Types: feat, fix, refactor, docs, test, chore, perf, ci

### Feature Implementation Workflow

1. **Plan First** — Read the plan file, understand the task before coding.
2. **TDD Approach** — Write tests first (RED), implement to pass (GREEN), refactor (IMPROVE).
3. **Code Review** — Use `/code-review` skill after writing code. Address CRITICAL and HIGH issues.
4. **Verify** — Run `cargo test` + `cargo run -- self-test` before commit.
5. **Commit** — Follow conventional commits format.

## Testing Requirements

### Minimum Test Coverage: 70%+

### Test Types (ALL required)

1. **Unit Tests** (`#[cfg(test)]`) — Individual functions, edge cases, error paths.
2. **Integration Tests** — The built-in self-test (`cargo run -- self-test`) covers 11 phases, ~70 assertions.
3. **E2E Tests** — `scripts/e2e.ps1` covers the full create → clone → merge → password workflow.

### Test-Driven Development

1. Write test first (RED)
2. Run test — it should FAIL
3. Write minimal implementation (GREEN)
4. Run test — it should PASS
5. Refactor (IMPROVE)
6. Verify all tests still pass

## Security Guidelines

### For Rust CLI (no network, no database)

- No hardcoded secrets (API keys, passwords, tokens)
- Passwords use argon2 hashing (never stored in plaintext)
- Encryption uses chacha20 with argon2-derived keys
- Error messages do not leak sensitive data (password length, content details)
- Input validation at CLI boundary (Clap handles basic validation; semantic validation in engine)

### Secret Management

- Passwords accepted via CLI argument (interactive mode TBD)
- Encryption keys derived from password + salt at runtime, never stored

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