# Statuz Core Protocol Specification

> **The open standard for AI agent situated alignment.**

---

## 🎯 What is the Statuz Protocol?

The Statuz Protocol is an **open, file-based standard** for AI agents to express their current state, ecological position, and strategic alignment needs.

It answers three questions:
- **Who am I?** (Identity & Role)
- **Where am I?** (Current State & Ecosystem Position)
- **When do I need human direction?** (SYN Triggers)

---

## 📁 Protocol Files

### Core File: `.statuz/statuz.yaml`

The primary runtime status file that every AI agent project should include.

```yaml
statuz_version: "0.1"

identity:
  agent_name: dev-agent
  project_name: my-project
  organization: my-org
  environment: development

role:
  name: coding-assistant
  responsibilities:
    - implement features
    - write tests
    - maintain code quality
  boundaries:
    - do not modify production directly
    - escalate security issues

current_state:
  stage: implementation
  task: add user authentication
  status: in_progress
  last_checkpoint: "cp-042"
  next_action: implement login endpoint

progress:
  completed:
    - created database schema
    - set up authentication middleware
  blocked_by:
    - waiting for API design review
  open_questions:
    - should we use JWT or session-based auth?

relations:
  related_agents:
    - review-agent
    - doc-agent
  related_projects:
    - shared-lib
    - auth-service
  related_files:
    - src/auth/login.ts
    - src/auth/register.ts
  related_tools:
    - claude-code
    - git

rules:
  should:
    - read .statuz/statuz.yaml at session start
    - write checkpoint after meaningful progress
    - update current_state.task when switching tasks
  should_not:
    - store secrets or API keys
    - skip tests
    - merge without review

checkpoints:
  - id: cp-042
    at: 2026-06-02T10:30:00Z
    summary: implemented login endpoint, tests passing
    next_action: implement logout endpoint
```

---

## 🌍 Four-Layer Architecture

### Layer 1: Core (Runtime Status)
**What it tracks:** Identity, current task, progress, next action.

| Field | Purpose |
|-------|---------|
| `identity` | Who is this agent? What project? |
| `role` | What are its responsibilities and boundaries? |
| `current_state` | What is it doing right now? |
| `progress` | What has been completed? What is blocked? |
| `relations` | What is connected to this project? |
| `rules` | What should/should not it do? |
| `checkpoints` | History of meaningful progress points |

### Layer 2: niche (Ecological Position)
**What it tracks:** Where this project stands in the ecosystem.

| File | Purpose |
|-------|---------|
| `niche/manifest.yaml` | Project's ecological identity and purpose |
| `niche/signals/*.yaml` | Changes detected in the ecosystem |
| `niche/assessments/*.yaml` | Impact analysis of signals |
| `niche/contexts/*.yaml` | Context records of calibration sessions |
| `niche/calibrations/*.yaml` | Calibration proposals |

**See also:** [niche Schema Reference](spec/niche/)

### Layer 3: SYN (Strategic Synchronization)
**What it tracks:** When human direction is required.

| File | Purpose |
|-------|---------|
| `niche/syn/*.yaml` | Strategic decision requests and resolutions |

### Layer 4: 66 — Arrow Maps (Global Niche Awareness)
**What it tracks:** How projects relate to each other across the ecosystem.

> **Core Principle:** Arrow Maps are designed for **global niche awareness**, not visualization. An Arrow Map's elements are **names** — project or component references (e.g., "APP A" → "APP A web", "auth-service" → "auth-db"). A name is a pointer to a project; it does not contain the project itself. The purpose of an Arrow Map is to give agents an **efficient graph for retrieval** — so they can answer "what connects to what" and "where does this project fit" without reading hundreds of files. Visual diagrams in IDE extensions or dashboards are merely **visual mappings** of the underlying Arrow Map — the YAML file is the canonical data structure.

| File/Concept | Purpose |
|-------|---------|
| Arrow Map (stored in registry, referenced by ID) | Named, versioned topology of how projects connect |
| Arrow (atomic unit) | A directional relationship between two named nodes |
| StatuNode (atomic unit) | A named project or component reference |
| `statuz arrow-map` CLI commands | Map creation, validation, progressive discovery |
| Arrow Proposal | Proposed change to the map topology, reviewed before apply |

**Design implication:** Arrow Maps grow progressively through the agent-human dialogue. They are not generated once by an automated detector and then frozen. A detector serves as a **suggestion tool** — it can propose candidate arrows from `package.json`, `docker-compose.yml`, or source code imports, but each candidate goes through the Arrow Proposal workflow (review → approve → apply) before being accepted into the map.

**Relationship to niche:** The niche manifest declares **what** a project does (its ecological position). The Arrow Map shows **how** that project connects to others. A niche's `declared_position.does_not` ("we don't manage databases") implies that in the Arrow Map, there should be a `dependency` or `information_flow` arrow pointing to an external database node, not a `responsibility` arrow claiming ownership. Niche and Arrow Map are complementary: niche = single-project boundary; Arrow Map = cross-project topology.

**See also:** [66 Overview](66-implementation/docs/66-OVERVIEW.md), [Arrow Map Schema](66-implementation/spec/arrow-map.schema.json), [66 Implementation Plan](66-implementation/PLAN.md)

### Layer 4.1: Arrow Map Cluster (Organization-Level Ecosystem)

**What it tracks:** How Arrow Maps relate to each other across an organization.

> **Purpose:** An Arrow Map Cluster enables **global niche awareness at the organization level**. It aggregates multiple Arrow Maps into a single topology view, with cross-map arrows describing relationships between projects. This is the foundation for "company universe ecosystem" understanding — agents can query the cluster to find "who owns auth" or "what depends on this service" across all projects.

| File/Concept | Purpose |
|-------|---------|
| Arrow Map Cluster (stored in registry) | Named collection of Arrow Maps + cross-map arrows |
| Cross-map Arrow | A directional relationship between nodes in different Arrow Maps |
| `statuz cluster` CLI commands | Cluster creation, validation, cross-map arrow management |

**Key features:**
- **Maps aggregation** — Multiple Arrow Maps referenced by ID and version
- **Cross-map arrows** — Arrows with `from_map`/`to_map` fields connecting nodes across projects
- **Wildcard support** — `from_map: "*"` means "all maps", enabling organization-wide patterns like "all projects depend on shared logging"
- **Description required** — Every cross-map arrow must explain why the relationship exists

**Example cross-map arrow:**
```yaml
cross_map_arrows:
  - id: "muserock→statuz-sdk"
    from_map: "muserock"
    from_node: "creative-state-agent"
    to_map: "statuz"
    to_node: "sdk-ts"
    type: "dependency"
    description: "MuseRock's creative-state-agent uses Statuz SDK-TS as the state layer for agent continuity"
```

**See also:** [Arrow Map Cluster Schema](66-implementation/spec/arrow-map-cluster.schema.json), [Cluster Example](66-implementation/examples/arrow-map-cluster-example.yaml)

---

## 🔄 The Statuz Loop

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Agent Session Start                                       │
│   ┌─────────────────────────────────────────────────┐     │
│   │ 1. READ .statuz/statuz.yaml                     │     │
│   │    → "I am dev-agent, working on auth..."      │     │
│   └─────────────────────────────────────────────────┘     │
│                          │                                 │
│                          ▼                                 │
│   ┌─────────────────────────────────────────────────┐     │
│   │ 2. EXECUTE task                                  │     │
│   │    → Implement login endpoint                    │     │
│   └─────────────────────────────────────────────────┘     │
│                          │                                 │
│                          ▼                                 │
│   ┌─────────────────────────────────────────────────┐     │
│   │ 3. WRITE checkpoint                              │     │
│   │    → "completed: login endpoint"                 │     │
│   └─────────────────────────────────────────────────┘     │
│                          │                                 │
│                          ▼                                 │
│   ┌─────────────────────────────────────────────────┐     │
│   │ 4. CHECK niche signals                           │     │
│   │    → "auth-lib changed, impact?"                 │     │
│   └─────────────────────────────────────────────────┘     │
│                          │                                 │
│                          ▼                                 │
│   ┌─────────────────────────────────────────────────┐     │
│   │ 5. EVALUATE SYN triggers                        │     │
│   │    → "Should I ask human about architecture?"   │     │
│   └─────────────────────────────────────────────────┘     │
│                          │                                 │
│                          ▼                                 │
│   Agent Session End (or Interrupted)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Schema Reference

### Core Schemas

| Schema | File | Purpose |
|--------|------|---------|
| Statuz Core | [statuz.schema.json](spec/statuz.schema.json) | Runtime status validation |
| niche Manifest | [niche-manifest.schema.json](spec/niche/niche-manifest.schema.json) | Ecological identity |
| niche Signal | [niche-signal.schema.json](spec/niche/niche-signal.schema.json) | Ecosystem change signals |
| niche Assessment | [niche-assessment.schema.json](spec/niche/niche-assessment.schema.json) | Impact analysis |
| niche Context | [niche-context.schema.json](spec/niche/niche-context.schema.json) | Calibration records |
| niche Calibration | [niche-calibration.schema.json](spec/niche/niche-calibration.schema.json) | Calibration proposals |
| niche SYN | [niche-syn.schema.json](spec/niche/niche-syn.schema.json) | Strategic requests |

---

## 🔧 Validation

### Validate a Statuz file

```bash
# Using CLI
statuz validate .statuz/statuz.yaml

# Using SDK
import { Statuz } from '@statuz/sdk-ts';
const statuz = new Statuz();
const result = await statuz.validate('.statuz/statuz.yaml');
```

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `statuz_version must be "0.1"` | Wrong version | Use `"0.1"` |
| `identity.agent_name is required` | Missing field | Add required fields |
| `current_state.status must be string` | Wrong type | Use string value |

---

## 🚀 Quick Start

### 1. Initialize a project

```bash
npm install -g @statuz/statuz
statuz init --agent "my-agent" --project "my-project"
```

### 2. Agent reads at session start

```bash
statuz resume .statuz/statuz.yaml
```

### 3. Agent writes after progress

```bash
# Manual checkpoint
statuz checkpoint --summary "implemented login" --next "implement logout"
```

### 4. Validate before committing

```bash
statuz validate .statuz/statuz.yaml
```

---

## 📖 For More Information

- **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** - How AI agents should use Statuz
- **[ADAPTERS.md](ADAPTERS.md)** - Tools and implementations
- **[TUTORIAL.md](docs/TUTORIAL.md)** - Step-by-step guide

---

## 🔄 Versioning Policy

The Statuz Protocol uses semantic versioning for schemas:

- **Major version** (1.0): Breaking changes to structure
- **Minor version** (0.2): Backward-compatible additions
- **Patch version** (0.1.1): Bug fixes, clarifications

Current version: **0.1** (stable)

---

## 🤝 Contributing to the Protocol

To propose changes to the protocol:

1. Open an issue describing the proposed change
2. Provide use cases and examples
3. Include JSON Schema updates if applicable
4. Show backward compatibility impact

---

## 📄 License

Apache-2.0
