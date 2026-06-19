# Detector: The Discovery Engine

> **Status:** Design Document  
> **Version:** 0.1.0-draft  
> **Last Updated:** 2026-06-06

---

## What is the Detector?

The Detector is not a tool you run once. It is a **continuous process** that asks questions about your system until the topology reveals itself.

Most software asks users to organize information. The Detector discovers structure instead.

---

## Core Questions

The Detector continuously asks six questions about every StatuNode in the system:

| # | Question | Arrow Type | Purpose |
|---|----------|------------|---------|
| 1 | **What depends on this?** | `dependency` | Discover upstream consumers |
| 2 | **What does this depend on?** | `dependency` | Discover downstream requirements |
| 3 | **What creates value here?** | `information_flow` / `resource_transfer` | Discover value sources |
| 4 | **What consumes value here?** | `information_flow` / `resource_transfer` | Discover value sinks |
| 5 | **Who validates this?** | `validation` | Discover accountability chains |
| 6 | **Which arrow is missing?** | *any* | Detect gaps in the topology |

These questions are not asked in a vacuum. They are asked in the context of what the system already knows — and what it suspects it does not know.

---

## Detection Modes

### Mode 1: Manual Discovery (Interactive)

The Detector interviews the user through a structured dialogue:

```
$ statuz arrow-map detect --interactive

[Detector] I found a component: "auth-service"
[Detector] What depends on auth-service? (comma-separated list, or "unknown")
> api-gateway, mobile-app

[Detector] What does auth-service depend on?
> user-db, redis-cache

[Detector] Who is responsible for auth-service uptime?
> backend-team

[Detector] What information flows INTO auth-service?
> login-credentials, session-tokens

[Detector] What information flows OUT OF auth-service?
> auth-tokens, user-roles

[Detector] Any constraints on auth-service?
> must-respond-in-200ms, gdpr-compliant
```

Each answer generates one or more Arrows. The Detector validates them against the schema and adds them to the Arrow Map.

### Mode 2: Automatic Discovery (Heuristic)

The Detector scans the project for structural clues:

| Source | What it discovers | Confidence |
|--------|-------------------|------------|
| `package.json` dependencies | `dependency` arrows between components | 0.7 |
| `import` statements | `dependency` arrows between files | 0.8 |
| Git commit messages | `responsibility` and `information_flow` arrows | 0.4 |
| Dockerfile `FROM` | `dependency` arrows for base images | 0.9 |
| docker-compose links | `dependency` and `information_flow` arrows | 0.85 |
| API endpoint definitions | `information_flow` arrows | 0.75 |
| Code review assignments | `validation` and `responsibility` arrows | 0.6 |
| Environment variables | `resource_transfer` and `constraint` arrows | 0.5 |

Discovered arrows are marked with `metadata.confidence < 1.0` and `metadata.discovery_method: "detected"`. They require human confirmation before being promoted to `confidence: 1.0`.

### Mode 3: Inference (Topological)

The Detector infers missing arrows from the existing topology:

- **Transitive inference:** If A → B and B → C, the Detector asks: "Should A → C exist?"
- **Symmetry inference:** If A validates B, should B inform A?
- **Completeness inference:** If a component has no incoming arrows, the Detector flags it as "isolated node"
- **Pattern matching:** If this topology resembles a known niche template, the Detector suggests missing arrows from the template

---

## The Detection Loop

```
┌─────────────────────────────────────────┐
│           Detection Loop                 │
├─────────────────────────────────────────┤
│                                          │
│  1. SCAN → Find all StatuNodes           │
│     (files, components, agents, etc.)    │
│                                          │
│  2. QUERY → Ask the 6 core questions     │
│     (manual, automatic, or inferred)     │
│                                          │
│  3. GENERATE → Create Arrow candidates   │
│     (with confidence scores)             │
│                                          │
│  4. VALIDATE → Check against schema      │
│     (and invariants)                     │
│                                          │
│  5. PRESENT → Show to user for review    │
│     (if confidence < threshold)          │
│                                          │
│  6. COMMIT → Add confirmed arrows        │
│     (update Arrow Map)                   │
│                                          │
│  7. REPEAT → Go back to step 1          │
│     (continuous discovery)               │
│                                          │
└─────────────────────────────────────────┘
```

---

## Confidence Thresholds

| Confidence | Action | User Interaction |
|------------|--------|------------------|
| 0.9 – 1.0 | Auto-commit | None (logged) |
| 0.7 – 0.89 | Suggest | Notification only |
| 0.4 – 0.69 | Propose | Requires approval |
| 0.0 – 0.39 | Flag | Requires investigation |

---

## Integration with Existing Layers

### Core Integration

The Detector reads `.statuz/statuz.yaml` to understand:
- What agents are active
- What the current task is
- What the agent graph already contains

It converts existing `relations.agent_graph` entries into full Arrow Map arrows.

### niche Integration

The Detector reads `.statuz/niche/manifest.yaml` to understand:
- What the project declares it does
- What signals it cares about
- What its boundaries are

It uses this to filter irrelevant arrow candidates and focus on the declared position.

### 66 Integration

The Detector writes to the Arrow Map registry (or local cache at `~/.statuz/maps/`). It does not write directly into project directories — Arrow Maps are project-independent.

It also reads existing Arrow Maps to:
- Avoid duplicate arrows
- Detect topology drift (new arrows that contradict existing ones)
- Suggest map extensions ("This project adds a payment service — should we extend the microservice-backend map?")

---

## CLI Commands

```bash
# Interactive detection session
statuz arrow-map detect --interactive

# Automatic detection (scan project, infer arrows)
statuz arrow-map detect --auto --confidence-threshold 0.7

# Detect from specific source
statuz arrow-map detect --from package.json --from docker-compose.yml

# Review pending arrows (confidence < 1.0)
statuz arrow-map review

# Approve a pending arrow
statuz arrow-map approve arrow-candidate-001

# Reject a pending arrow
statuz arrow-map reject arrow-candidate-001 --reason "not a real dependency"

# Run continuous detection (watches file changes)
statuz arrow-map detect --watch
```

---

## Open Questions

1. **Detection Frequency:** How often should automatic detection run? On every file save? On every commit? On a schedule?
2. **Noise Reduction:** How do we prevent the Detector from generating too many low-confidence arrows?
3. **User Fatigue:** How do we balance thoroughness with not overwhelming the user with questions?
4. **Multi-Agent Detection:** If multiple agents are working on the same project, how do they coordinate detection to avoid duplicate questions?
5. **Historical Learning:** Should the Detector learn from past approvals/rejections to improve its confidence scoring?

---

## References

- [66 Manifesto](../66%20Manifesto.md) — The foundational vision
- [66 Overview](66-OVERVIEW.md) — The 66 architecture
- [Arrow Schema](../spec/arrow.schema.json) — Arrow data model
- [StatuNode Schema](../spec/statu-node.schema.json) — StatuNode data model
- [Arrow Map Schema](../spec/arrow-map.schema.json) — Arrow Map data model

---

> *"The purpose is not management. The purpose is revelation."*
>
> — 66 Manifesto
