# AGENT.md — Working Guide for AI Agents on Statuz

> For AI agents working on this repository. Last updated: 2026-06-16

---

## Core Vision — The Why

**Statuz exists to solve one of AI's biggest challenges: information compression and state closure.**

We believe:
- AI needs **true global state**, not scattered documents
- Topology matters more than text — we need structured relationships, not just markdown
- Information storage needs a **paradigm shift** — moving from flat documents to graph-based representations
- **Niche** requires a fundamentally new search engine (future: C++ backend, graph theory based)
- Only with this foundation can AI tackle **truly complex projects**

This is **hell-level difficulty** — we won't solve everything alone. We'll:
1. Design the architecture
2. Implement what we can
3. Flag unsolved problems for deeper research (professor consultation)

---

## The Four Layers You Must Understand

Statuz has a four-layer architecture. Do not mix concerns between layers:

1. **Core (statuz.yaml)** — Runtime state. What the project is currently doing. Read on every task.
2. **Niche (niche.yaml)** — Ecological position. What this project does and does NOT do. Read before architectural changes.
3. **SYN (.statuz/syn/*.yaml)** — Strategic proposals. Human approves changes to niche or cross-project topology.
4. **Arrow Map (arrow-map.yaml + cluster.yaml)** — Topology. What connects to what across the ecosystem.

## Standard Workflow

For every task:
1. `statuz resume <path>` — understand current state
2. Do the work
3. After meaningful progress or before handoff: `statuz checkpoint <path>`
4. Run health check: `statuz status-keeper run`
5. If you detected architectural change needs — generate SYN proposal, do NOT make the change

## Hard Rules — Always Obey

- Never change `LICENSE` files
- Never rewrite the entire repository structure
- Status is not memory: do not turn statuz.yaml into a chat log
- Niche changes require SYN proposal + human approval
- Cross-project topology changes require SYN proposal + human approval
- When LLM is available, use it for arrow descriptions and niche statements
- When LLM is unavailable, use pattern matching and flag the limitation

## Command Cheat Sheet

| Task | Command |
|------|---------|
| Start a new project | `statuz init` |
| Pick up state | `statuz resume <file>` |
| Create a checkpoint | `statuz checkpoint <file>` |
| Validate files | `statuz validate <file>` |
| Discover project | `statuz agent discover <path>` |
| Create SYN proposal | `statuz agent discover` generates it |
| Approve proposal | `statuz syn approve <proposal-file>` |
| Health check | `statuz status-keeper run` |
| Cluster management | `statuz cluster init/validate/show` |
| LLM test | `statuz llm test` |

## When to Escalate via SYN

Escalate to a SYN proposal when:
- A project's niche boundary should change (what it does / does NOT do)
- A new project is discovered that belongs in the cluster
- A new cross-project dependency arrow needs to be added
- The current state exceeds the niche's declared scope
- Any architectural decision that changes topology or positioning

Do NOT escalate for:
- Runtime state changes (just update statuz.yaml checkpoints)
- Bug fixes that stay within declared niche boundaries
- Documentation updates

## LLM Philosophy

- LLM enhances, never replaces. Pattern matching always runs first.
- If no API key is configured, degrade gracefully — don't fail.
- LLM output must be validated: JSON structure, field length, arrow direction logic.
- Never commit API keys or sensitive LLM output to the repo.

## Documentation Honesty

- If a feature is planned but not implemented, mark it clearly.
- If code only partially works, say so.
- Do not write documentation that implies capabilities the code doesn't have.

## Before You Commit

1. Run `npm run build` in packages/cli
2. Run `statuz validate` on any changed YAML files
3. Run `statuz status-keeper run`
4. Update AGENT.md if your work changes the rules

---

## Unsolved Problems — For Future Research

These are the hard problems we've identified but haven't solved yet. Flag these when encountered:

| Problem | Description | Status |
|---------|-------------|--------|
| **Information Compression** | How to compress vast amounts of project context into a navigable, queryable structure without losing meaning? | 📚 Needs research |
| **True Global State** | Current statuz is per-project. How to create a unified view across all projects in a cluster? | 📚 Needs research |
| **Niche Search Engine** | Niche needs a graph-based search engine capable of understanding ecological positioning. Requires C++ for performance. | 📚 Needs research |
| **Graph-Based Topology** | Moving Arrow Map from YAML to a proper graph database with efficient traversal and query capabilities. | 📚 Needs research |
| **State Closure** | How to detect when we have enough context to make decisions without missing critical information? | 📚 Needs research |
| **Cross-Project Influence Analysis** | When Project A changes, which other projects in the cluster might be affected? | 📚 Needs research |

## Research Notes

When you encounter these problems, document:
1. What specific behavior you observed
2. What you tried and why it didn't work
3. Any mathematical or theoretical approaches that might apply
4. References to papers/theories that might be relevant

These notes will be collected and shared with experts for deeper analysis.
