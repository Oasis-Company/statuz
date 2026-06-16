# AGENT.md — Working Guide for AI Agents on Statuz

> For AI agents working on this repository. Last updated: 2026-06-16

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
