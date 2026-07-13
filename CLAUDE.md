# Statuz — Graph Engine for AI Project Ecosystems

## Project
- Rust graph engine (`crates/statuz-core/`)
- Single-page website (`docs/index.html`)
- **`AGENTS.md` is the authoritative working guide** — read it first

## Key Commands
- `cd crates/statuz-core && cargo run -- self-test` — verify all 10 phases
- `cd crates/statuz-core && cargo test` — run unit tests
- `cd crates/statuz-core && cargo build` — build engine
- `docs/index.html` — open website in browser

## Architecture (Quick Reference)
- **GraphEngine**: in-memory adjacency list (`HashMap`)
- **Three queries**: `traverse`, `impact`, `path`
- **Cluster**: storage container with Fields and Bridges
- **Storage**: `.stz` binary format (msgpack + blake3 + optional zstd/chacha20)

## TRAE Skills
See `.agents/skills/` for available skills. Key skills: `/tdd`, `/code-review`, `/domain-modeling`, `/research`, `/handoff`.

## Knowledge Base
- `knowledge-base/01-achievements/` — what was built
- `knowledge-base/02-plans/` — roadmap and plans
- `knowledge-base/03-methodology/` — development workflow
- `knowledge-base/04-architecture/` — architecture decisions
- `knowledge-base/05-hard-rules/` — hard constraints
- `knowledge-base/06-unresolved/` — open questions