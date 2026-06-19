# AGENTS.md — Statuz Post-66 Working Guide

> All legacy docs (66 Manifesto, niche, SYN, schemas, examples) have been moved to `leftover/`.
> The project has been recalibrated. Read `STATUZ设计哲学的论述.md` for the current vision.

## Current Architecture

```
engine/          ← Graph Engine prototype (active development)
  src/graph.ts   ← In-memory adjacency list + graph algorithms
  src/types.ts   ← Node, Edge, Relation type system
  demo/          ← Self-test and demonstration scripts
packages/        ← Legacy CLI/SDK/MCP code (frozen — to be replaced)
leftover/        ← All outdated docs, schemas, and examples
```

## Core Philosophy (from 设计哲学论述)

- Statuz is a **graph engine**, not a protocol or document system
- Information must be **actively released** (like working memory), not passively retrieved
- "Better Engine, Better Diagram, Better Loop"
- Core is the base; Dashboard is where features emerge
- Goal: July MVP — working Engine + CLI Dashboard

## Engine Development Rules

1. **Zero dependencies** — Engine is pure TypeScript
2. **Memory-first** — All graph ops in-memory. Serialization is secondary.
3. **Three core queries** must always work: `traverse`, `impact`, `path`
4. **Self-test** — `npx tsx engine/demo/self-test.ts` must pass before any commit
5. **No YAML files** — Old paradigm is dead. Engine decides storage format.

## The Three Queries

| Query | What it answers | Method |
|-------|----------------|--------|
| `traverse(from, relation?)` | "What does this connect to?" | Direct adjacency lookup |
| `impact(nodeId)` | "If this changes, who's affected?" | Reverse BFS (blast radius) |
| `path(from, to)` | "How do I get there?" | BFS shortest path |

## Hard Rules

- Do NOT add YAML schemas, JSON Schema files, or protocol documents
- Do NOT revive niche, SYN, Arrow Map file formats from `leftover/`
- Do NOT add CLI commands before the Engine is solid
- Do NOT add databases, servers, or network calls
- Do NOT change the LICENSE without explicit human approval
- The Engine is the product — everything else emerges from it

## Decision Rule

If a concept from the old paradigm (niche, SYN, status-keeper) comes up:
- **Can the Engine compute it?** → Add as an Engine method
- **Is it a UI concern?** → Defer to Dashboard phase
- **Is it a YAML file pattern?** → Discard

## Verification

```bash
cd engine
npx tsx demo/self-test.ts
```

All queries must return correct results. Types must compile cleanly.

## Handoff Rule

At the end of every meaningful change, summarize:
- What changed in the Engine
- Why it changed
- How to verify (`npx tsx engine/demo/self-test.ts`)
- What remains unresolved
- What the next agent should build
