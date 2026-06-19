# Statuz Architecture: The Agent Continuity Protocol

> **English version of the core vision — what Statuz is, how it works, and why it doesn't drift.**

---

## The Core Problem

AI agents lose context. They forget. They make assumptions that don't match reality. They work on outdated information while the project moves on without them.

**Every tool today handles this poorly:**

| Tool | How it handles context | The problem |
|------|----------------------|-------------|
| Chat history | Full transcript | Noise drowns signal; agent can't find the bookmark |
| Git | Commit messages | Not agent-readable at runtime; no active notification |
| Issue Tracker | Manual updates | Nobody updates it in real-time |
| README | Static text | Goes stale immediately |
| Claude Code settings | Stored preferences | Doesn't track project state |

**Statuz is the first tool designed specifically to solve agent context loss and drift — at the protocol level.**

---

## What Statuz Is

**Statuz is a file-based protocol for agent continuity.** It answers two questions:

1. **"Where am I right now?"** — The agent reads its current state from YAML files and knows exactly where to resume.
2. **"Did reality change?"** — Automated watchers detect changes and route them through approval workflows so the agent never operates on stale assumptions.

**Three files. One automated loop. No server required.**

---

## The Three Protocol Files

### 1. `statuz.yaml` — Current State

The agent's runtime status snapshot.

```yaml
statuz_version: "0.1"
updated_at: "2026-06-15T10:00:00Z"

identity:
  agent_name: taskflow-dev
  project_name: taskflow-backend
  organization: acme

current_state:
  stage: implementation
  task: implement JWT authentication
  status: in_progress
  last_checkpoint: cp-042
  next_action: add password reset endpoint

progress:
  completed:
    - created database schema
    - set up auth middleware
  blocked_by:
    - pending: awaiting Supabase credentials (pa-003)

checkpoints:
  - id: cp-042
    at: "2026-06-15T09:30:00Z"
    summary: Implemented JWT token generation and validation
    next_action: Add password reset endpoint

relations:
  related_projects:
    - taskflow-frontend    # Known from cluster.yaml
    - taskflow-shared-lib  # Known from cluster.yaml
```

### 2. `pending-actions.yaml` — Agent ↔ Human Task Bridge

Bidirectional task coordination between agent and human.

```yaml
pending_actions_version: "1.0"
pending_actions:
  - id: pa-003
    title: Configure Supabase credentials
    assigned_to: human
    status: done
    resolution:
      resolved_at: "2026-06-14T18:00:00Z"
      resolved_by: ceaserzhao
      outcome: "Supabase project created, anon_key set in .env.local"
```

### 3. `arrow-map.yaml` / `arrow-map-cluster.yaml` — Ecosystem Topology

Named nodes + directional arrows with mandatory descriptions. The Arrow Map is **not a visualization** — it is **a retrieval-efficient graph** that lets agents answer "what connects to what" without reading hundreds of files.

```yaml
cluster_version: "1.0"
id: acme:taskflow-ecosystem
name: TaskFlow Ecosystem

maps:
  - map_id: taskflow-backend
    version: "1.0.0"
    scope: product
  - map_id: taskflow-frontend
    version: "1.2.0"
    scope: product

cross_map_arrows:
  - id: cma-001
    from_map: taskflow-frontend
    from_node: api-client
    to_map: taskflow-backend
    to_node: rest-api
    type: dependency
    description: "Frontend HTTP client calls backend REST API on /api/v1 endpoints"
```

---

## The Statuz Working Loop

This is the heartbeat of the entire system. Every component connects into this loop.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WATCHER (Scheduled)                                                 │   │
│  │  - Scans filesystem periodically                                       │   │
│  │  - Detects: new directories, changed files, missing .statuz/          │   │
│  │  - Maintains: list of known projects in cluster.yaml                 │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │ triggers                                   │
│                               ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  AGENT RUNNER (Task Executor)                                         │   │
│  │                                                                       │   │
│  │  On trigger:                                                          │   │
│  │    1. scan-new-project <path> → read directory, package.json,       │   │
│  │                                        imports                        │   │
│  │    2. niche Engine → analyze position from Arrow Map + code          │   │
│  │    3. Generate Arrow Map proposal (what nodes/arrows to add)        │   │
│  │    4. Write to SYN queue (.statuz/syn/PROPOSAL-ID.yaml)             │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                           │
│                               ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SYN PROPOSAL SYSTEM                                                  │   │
│  │                                                                       │   │
│  │  Every structural change goes through SYN:                           │   │
│  │    - New project added to cluster → SYN proposal                     │   │
│  │    - Arrow added to map → SYN proposal                               │   │
│  │    - Niche manifest changed → SYN proposal                           │   │
│  │                                                                       │   │
│  │  Proposals are: CREATED → PENDING_APPROVAL → APPROVED/REJECTED     │   │
│  │                                                                       │   │
│  │  User sees the proposal, reviews the change, then approves or rejects │   │
│  │                                                                       │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │ on approval                               │
│                               ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  WRITE LAYER (Filesystem)                                             │   │
│  │                                                                       │   │
│  │  On SYN approval:                                                    │   │
│  │    - cluster.yaml → cross_map_arrows updated                         │   │
│  │    - project/.statuz/statuz.yaml → initialized                        │   │
│  │    - project/.statuz/arrow-map.yaml → initialized                     │   │
│  │    - project/.statuz/niche.yaml → position document injected          │   │
│  │                                                                       │   │
│  │  These writes are atomic and versioned.                               │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                           │
│                               ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SEARCH INDEX (Cross-Project Query)                                  │   │
│  │                                                                       │   │
│  │  All files re-indexed after write.                                   │   │
│  │  Agents can now query:                                               │   │
│  │    - "What projects are in this ecosystem?"                           │   │
│  │    - "What does taskflow-mobile depend on?"                          │   │
│  │    - "Who owns the auth layer?"                                       │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                           │
│                               ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  NEXT AGENT SESSION (Human mentions a project)                       │   │
│  │                                                                       │   │
│  │  Agent reads:                                                         │   │
│  │    - statuz.yaml → current state + last checkpoint                   │   │
│  │    - arrow-map.yaml → project topology                               │   │
│  │    - cluster.yaml → ecosystem view                                   │   │
│  │    - pending-actions.yaml → what needs human attention               │   │
│  │                                                                       │   │
│  │  → Agent is fully situated without reading any chat history          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## End-to-End Example: Building TaskFlow, Then Adding Mobile

### Day 1: User starts TaskFlow backend

```
User: "Help me build a task management SaaS called TaskFlow"

Agent:
  statuz init --agent taskflow-dev --project taskflow-backend --org acme
  statuz arrow-map init --name "TaskFlow Backend"
  statuz cluster init --id acme:taskflow-ecosystem --name "TaskFlow Ecosystem"
  (creates initial topology)
```

### Day 5: User creates taskflow-frontend

```
User: (creates ./taskflow-frontend directory manually, in IDE)

Watcher (periodic scan):
  → Detects new directory: ./taskflow-frontend
  → No .statuz/ inside → marks as "undiscovered project"
  → Triggers: statuz agent discover ./taskflow-frontend
```

### Day 5: Agent runs discovery

```
Agent (triggered by Watcher):
  1. Scans ./taskflow-frontend:
       - package.json: React + Vite
       - src/api/: calls /api/v1/* endpoints
       - uses @auth/react for authentication

  2. niche Engine analyzes:
       - "This is a frontend SPA"
       - "Shares auth layer with backend"
       - "Makes REST calls to backend API"
       - → Generates niche manifest draft: "frontend client for TaskFlow"

  3. Generates SYN proposal:

      .statuz/syn/PROPOSAL-001.yaml:
        type: new_project_discovered
        project_path: ./taskflow-frontend
        suggested_cluster_addition:
          - map_id: taskflow-frontend
            version: "0.1.0"
            scope: product
        suggested_arrows:
          - from_map: taskflow-frontend
            from_node: api-client
            to_map: taskflow-backend
            to_node: rest-api
            type: dependency
            description: "Frontend HTTP client calls backend REST API on /api/v1"
          - from_map: taskflow-frontend
            from_node: auth-hook
            to_map: taskflow-backend
            to_node: auth-service
            type: dependency
            description: "Frontend uses @auth/react, which delegates to backend auth endpoints"
        suggested_statuz:
          project_path: ./taskflow-frontend/.statuz
          agent_name: taskflow-frontend-dev
          project_name: taskflow-frontend
          current_state:
            stage: initialization
            next_action: establish API client structure

  4. Notifies user via SYN queue
```

### Day 5: User reviews and approves

```
User:
  statuz syn show 001

  → Display:
      New project discovered: taskflow-frontend
      Arrow: frontend/api-client → backend/rest-api
      Arrow: frontend/auth-hook → backend/auth-service
      Niche: React SPA, frontend client for TaskFlow
      Statuz will be initialized at: ./taskflow-frontend/.statuz/

  statuz syn approve 001
  → Agent executes approved writes:
      - cluster.yaml updated with taskflow-frontend
      - ./taskflow-frontend/.statuz/ created
      - statuz.yaml initialized with agent name and context
      - arrow-map.yaml initialized referencing parent cluster
      - niche.yaml injected with position document
```

### Day 6: User mentions "taskflow-mobile" in conversation

```
User: "Now I want to add a mobile version"

Agent (reads statuz files first):
  statuz.yaml → "I am taskflow-dev, working on TaskFlow backend"
  cluster.yaml → "I see taskflow-frontend and taskflow-backend are in the same ecosystem"
  arrow-map.yaml → "frontend calls backend REST API"

Agent:
  → Already knows the ecosystem. Does NOT need to explore from scratch.
  → Immediately understands: mobile should share the same API client layer
  → Suggests: statuz agent discover ./taskflow-mobile
  → Proceeds with discovery workflow...
```

---

## How Statuz Prevents Drift

Drift = Agent's mental model diverges from reality. Statuz prevents it at every layer.

### Layer 1: Every Session Starts from a Checkpoint

```
statuz resume .statuz/statuz.yaml
```

Agent always knows: "I am here. Last checkpoint was cp-042. Next action is X."

→ No need to scroll through chat history to find where you left off.

### Layer 2: Checkpoints Are the Agent's Bookmarks

```
statuz checkpoint --summary "Implemented JWT auth" --next "Add password reset"
```

If context overflows, agent reads statuz.yaml and resumes from the bookmark.

→ Not "start from zero", but "resume from bookmark."

### Layer 3: SYN Proposals Gate All Structural Changes

**The rule: Agent cannot modify Arrow Map, Cluster, or niche without user approval.**

```
Agent wants to add an arrow: frontend → new-service
  → Generated as SYN proposal
  → User reviews and approves
  → Written to cluster.yaml

Agent wants to change niche manifest
  → Generated as SYN proposal
  → User reviews and approves
  → Written to niche.yaml
```

→ Agent never changes architecture based on incorrect assumptions.
→ Every structural change has a human signature.

### Layer 4: niche Engine Detects Drift Actively

The niche is not a static manifest — it is a **computation engine** that:

1. Reads the Arrow Map (what the topology says)
2. Reads the project code (what the code actually does)
3. Compares the two
4. If they diverge → generates a calibration SYN proposal

```
niche Engine:
  Arrow Map says: frontend/api-client → backend/rest-api
  Code shows:    frontend/api-client → backend/v2/ (new API!)

  → Drift detected
  → SYN proposal: "Arrow Map is stale. Update arrow to point to /v2/?"
  → User approves
  → Arrow Map updated
```

→ Drift is caught automatically, not left for the agent to discover.

### Layer 5: Watcher Detects Project Changes

```
Watcher (runs every 30s):
  - New directory found? → trigger discovery
  - package.json changed? → trigger Arrow Map check
  - .statuz/ directory missing? → warning + SYN alert
```

→ Agent doesn't need to ask. Changes are pushed to it.

---

## Why Statuz Is Unique

| What it does | How it compares |
|-------------|----------------|
| Agent restores context from last checkpoint | Chat history is noise; statuz.yaml is signal |
| Agent knows current state | Issue trackers go stale; statuz.yaml is updated at every checkpoint |
| Agent detects project changes | Git doesn't notify; Watcher pushes changes |
| Agent doesn't change architecture on assumptions | No gate in other tools; SYN enforces approval |
| Cross-project awareness | No equivalent in Git, Issues, or README |
| Zero server required | Everything is YAML files |

---

## Component Inventory

| Component | Role | File-based | Automated | AI-powered |
|-----------|------|-----------|----------|------------|
| **statuz.yaml** | Runtime state | ✅ | — | — |
| **pending-actions.yaml** | Task bridge | ✅ | — | — |
| **arrow-map.yaml** | Project topology | ✅ | — | — |
| **cluster.yaml** | Ecosystem topology | ✅ | — | — |
| **Watcher** | Change detection | — | ✅ | — |
| **SYN Engine** | Proposal/approval workflow | ✅ | ✅ | — |
| **niche Engine** | Position analysis + drift detection | ✅ | ✅ | ✅ |
| **Search Index** | Cross-project query | — | ✅ | ✅ |
| **Model Router** | Route tasks to optimal model | — | — | ✅ |

---

## Model API Router

Different tasks need different models. The Model Router abstracts this away:

| Task | Recommended Model | Why |
|------|----------------|-----|
| **niche analysis** | Claude (strong reasoning) | Infers ecological position from code + topology |
| **Arrow Map inference** | GPT-4o (fast, good at structure) | Detects patterns in package.json, imports |
| **Drift detection** | Claude (strong analysis) | Compares Arrow Map with code, finds contradictions |
| **Status check** | O3-mini (cheap, fast) | Validates YAML files, runs checks |
| **Search query** | O3-mini (cheap) | Simple retrieval from index |

The Model Router is a **pluggable interface** — swap providers without changing business logic.

---

## File Locations

```
.statuz/                          # Per-project directory
├── statuz.yaml                   # Runtime state
├── pending-actions.yaml          # Agent ↔ Human tasks
├── arrow-map.yaml               # Local topology (optional)
├── niche/
│   ├── manifest.yaml             # Ecological position
│   ├── signals/                  # Detected changes
│   ├── assessments/              # Impact analysis
│   ├── calibrations/             # Drift proposals
│   └── contexts/                 # Calibration history
└── syn/                         # Proposal queue
    ├── PROPOSAL-001.yaml         # Pending approval
    ├── PROPOSAL-002.yaml
    └── ...

.statuz/                          # Root/ecosystem level (in parent repo)
├── cluster.yaml                  # Arrow Map Cluster
├── config.yaml                   # Watcher interval, model preferences
└── index/                        # Search index (generated)
```

---

## What Statuz Is NOT

- **Not a project management tool** — It doesn't manage sprints, tickets, or deadlines. It tracks agent state.
- **Not a code generator** — It doesn't create projects or write code. It records context.
- **Not a notebook** — It's not for free-form notes. Every field has a schema.
- **Not a memory layer** — Status is not memory. Checkpoints are bookmarks, not diaries.

---

## Priority Phases

### Phase 0.1: Working Loop (minimum viable)
1. `statuz agent discover <path>` — manual trigger discovery
2. SYN proposal system — propose → approve → write
3. Basic niche Engine — read Arrow Map + code, generate position

### Phase 0.2: Automation
4. Watcher — periodic filesystem scan
5. Search Index — cross-project query
6. Model Router — pluggable AI provider

### Phase 0.3: Ecosystem
7. Drift detection calibration loop
8. Multi-model coordination
9. IDE extension integration
