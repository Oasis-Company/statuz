# The Four-Layer Model

Statuz defines four layers of situated alignment. Each layer has a clear responsibility. Each layer is optional but recommended for anything beyond a single-agent project.

---

## Layer 1: Core — Runtime Status

**Answers:** Who am I? What am I doing? What comes next?

**File:** `.statuz/statuz.yaml`

**Schema:** `spec/statuz.schema.json`

**Commands:** `init`, `validate`, `resume`, `checkpoint`

**Purpose:** The minimal layer. Every Statuz project has this. Provides the agent with a reliable sense of its current operational state.

**Who modifies it:** The agent itself writes checkpoints and updates state. No human approval is needed for routine updates.

**Example:**
```yaml
statuz_version: "0.1"
identity:
  agent_name: frontend-dev
  project_name: checkout-ui
current_state:
  task: refactor payment flow
  status: in_progress
  next_action: implement Stripe webhook handler
checkpoints:
  - id: cp-001
    at: "2026-06-15T12:00:00Z"
    summary: "Started payment flow work"
    next_action: "Implement Stripe webhook handler"
```

---

## Layer 2: Niche — Ecological Position

**Answers:** What do I do? What do I NOT do? Where are my boundaries?

**File:** `.statuz/niche-manifest.yaml`

**Schema:** `spec/niche/niche-manifest.schema.json`

**Commands:** `niche show`, calibration `check`

**Purpose:** Declares the project's ecological niche. Static-ish. Does NOT change on every code commit.

**Who modifies it:** ONLY via SYN (human approval). Agents detect drift but cannot change it.

**Example:**
```yaml
niche_version: "1.0"
declared_position:
  purpose: "Handle checkout flow and payment processing"
  does:
    - "Cart management"
    - "Payment gateway integration"
    - "Order state machine"
  does_not:
    - "User authentication"
    - "Inventory management"
    - "Product catalog"
drift_threshold: 0.2
```

---

## Layer 3: SYN — Human Synchronization

**Answers:** Does this change require human approval?

**Files:** `.statuz/syn/proposal-*.yaml` (proposals), `.statuz/syn/requests/*.yaml` (requests), `.statuz/syn/resolutions/*.yaml` (resolutions)

**Schemas:** `spec/syn-proposal.schema.json`, `spec/niche/niche-syn.schema.json`

**Commands:** `syn request`, `syn show-proposal`, `syn approve`, `syn reject`

**Purpose:** Governance layer. Triggers when:
1. Calibration detects drift exceeding threshold
2. Agent detects architectural decision needed
3. New project discovery requiring cluster update

**Who modifies it:** Humans approve or reject. Agents propose and generate proposals.

**Key principle:** Only SYN can modify niche.

---

## Layer 4: Arrow Map — Topological Relationships

**Answers:** How do projects relate to each other? Who calls whom? What depends on what?

**Files per project:** `.statuz/arrow-map.yaml` (project-level topology)
**Cross-project:** `.statuz/cluster.yaml` (cluster-level topology — names of projects and cross-project arrows)

**Schemas:** `spec/arrow-map.schema.json`, `spec/cluster.schema.json`

**Commands:** `arrow-map init`, `arrow-map node-add`, `arrow-map arrow-add`, `cluster init`, `cluster show`, `cluster validate`

**Purpose:** Enables agent awareness of the global ecological position. Without Arrow Map, the agent only knows its own project. With Arrow Map + cluster, agents understand the ecosystem.

**Key principle:** Arrow Map is a graph of NAMES, not a dashboard or monitoring system. Each node is a project name. Each arrow is a relationship name. The purpose is to enable quick agent understanding of the ecosystem topology for better project understanding and the agent's role within it.

**Example cluster.yaml:**
```yaml
cluster_version: "1.0"
metadata:
  name: acme-commerce
  description: "ACME Commerce Ecosystem
  updated_at: "2026-06-15T12:00:00Z"
maps:
  - id: frontend
    name: "Frontend Web App"
    description: "Customer-facing web frontend"
    project_path: "./frontend"
  - id: backend
    name: "Backend API"
    description: "REST API serving the frontend"
    project_path: "./backend"
  - id: shared-auth
    name: "Shared Auth Library"
    description: "Authentication and authorization"
    project_path: "./shared-auth"
arrows:
  - from_map: frontend
    to_map: backend
    type: dependency
    description: "Frontend calls REST API"
  - from_map: frontend
    to_map: shared-auth
    type: dependency
    description: "Uses shared auth for login"
  - from_map: backend
    to_map: shared-auth
    type: dependency
    description: "Validates tokens against auth lib"
```

---

## How the layers fit together

```
                            ┌─────────────────────────────────────────────────┐
                            │  SYN (Governance)                         │
                            │  Humans approve strategic changes            │
                            │  Agent proposes                          │
                            │  Only SYN can modify niche               │
                            └────────────────────┬────────────────────────┘
                                                 │
  ┌────────────────────────┐                 │                ┌────────────────────────┐
  │  Core (Status)     │                 │                │  Arrow Map          │
  │  Who am I?         │◀──────────────────────────│  Topology             │
  │  What doing?        │                 │                │  Project relations    │
  │  Next?               │                 │                │  Cluster            │
  └────────────────────────┘                 │                └────────────────────────┘
                                                 │
                            ┌────────────────────┴────────────────────────┐
                            │  Niche (Position)                       │
                            │  What do I do / not do?                 │
                            │  Static-ish, SYN changes                      │
                            │  Calibration detects drift              │
                            └─────────────────────────────────────────────┘
```

**The flow:**
1. **Agent starts** → reads Core (statuz.yaml) → knows what to do
2. **Agent works** → writes checkpoints in Core
3. **Calibration runs** → compares Core checkpoint summaries against Niche declared does/does_not → detects drift
4. **If drift > threshold** → triggers SYN proposal for human approval
5. **Human approves/rejects** → SYN resolution updates Niche (if approved)
6. **New project discovered** → Agent generates SYN proposal with cluster + Arrow Map additions
7. **Human approves** → cluster updates + .statuz created for new project

**Key insight:** Each layer has a clear owner and a clear responsibility. The layers do not duplicate each other. Crossing layer boundaries requires SYN (human approval).

---

## What each layer is NOT

| Layer | What it IS NOT |
|-------|--------------|
| Core | NOT a chat history, NOT a to-do list, NOT a knowledge base |
| Niche | NOT a project description, NOT a README, NOT documentation |
| SYN | NOT automated approval, NOT a voting system, NOT a CI/CD gate |
| Arrow Map | NOT a monitoring dashboard, NOT a dependency graph (though it contains dependencies), NOT a service discovery mechanism |
| Cluster | NOT a deployment topology, NOT an infrastructure diagram |

This matters because it is easy to start putting "that thing that doesn't fit anywhere else" into a status file. Resist. Each layer has a precise purpose, and if something doesn't fit any layer, it probably belongs in your actual documentation, your project management tool, or your source code — not in Statuz.
