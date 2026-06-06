<div align="center">
  <img src="../assets/statuz-logo.svg" alt="Statuz Logo" width="110">
  <br><br>
  <h1>66 Implementation</h1>
  <p><em>The Topological Shift is coming.</em></p>
</div>

---

> ⚠️ **Status: Early Design Phase**
>
> This directory contains the foundational specifications for the next evolution of Statuz.
> What you see here is not an incremental update. It is a new layer.
>
> **Arrow Maps. StatuNodes. Niche Topologies.**
>
> The 66 Manifesto declared the vision. This is where we build it.

---

## What's Inside

| Path | Description |
|------|-------------|
| `spec/` | JSON Schema definitions for Arrow, StatuNode, and Arrow Map |
| `examples/` | YAML examples demonstrating the new topological model |
| `docs/` | Design documents and architecture decisions |

## Core Concepts

### Arrow

An **Arrow** is a directed relationship between two StatuNodes. It is not a line on a diagram. It is an executable declaration of how value, dependency, or constraint flows through a system.

Arrows have **types**:
- `dependency` — A requires B to function
- `information_flow` — A sends information to B
- `responsibility` — A is accountable for B
- `validation` — A validates B
- `resource_transfer` — A provides resources to B
- `influence` — A affects B's behavior
- `constraint` — A limits what B can do

### StatuNode

Everything is a **StatuNode**. Projects, components, files, agents, people, knowledge, resources — all are nodes in the topology. The distinction between categories is secondary. The topology is primary.

### Arrow Map

An **Arrow Map** is a portable, executable description of a niche. It captures the living structure of a system — not as a static diagram, but as a reproducible topology that can be instantiated across projects.

## Relationship to Existing Statuz

The 66 layer does not replace Statuz Core or niche. It **extends** them.

```
Project Files (Concrete) → Core (0.1) → niche (1.0) → 66 (Arrow Maps)
     What exists?        → Who am I?    → Where do I stand? → What is my topology?
```

- **Core** answers: *What am I doing right now?*
- **niche** answers: *Where do I stand in the ecosystem?*
- **66** answers: *What is the invisible architecture that makes me possible?*

## The Long Path

1. ✅ **Make niches visible** — niche schemas and examples (DONE)
2. 🔄 **Make niches topological** — Arrow Maps (IN PROGRESS)
3. ⏳ **Make niches reusable** — Niche templates and instantiation
4. ⏳ **Make niches executable** — Runtime topology engine
5. ⏳ **Make niches comparable** — Topology diff and analysis
6. ⏳ **Make niches evolvable** — Niche Genome atlas

## Reading Order

1. Start with `docs/66-OVERVIEW.md` for the full architecture vision
2. Read `spec/arrow.schema.json` to understand the atomic unit
3. Read `spec/statu-node.schema.json` to understand the node abstraction
4. Read `spec/arrow-map.schema.json` to see how they compose
5. Explore `examples/` for concrete YAML instances

---

> *"Nodes tell us what exists. Arrows tell us why it exists."*
>
> — 66 Manifesto
