# Discovery → SYN Proposal → Approval: Full Example

This walks through the complete lifecycle of discovering a new project, generating a SYN proposal, and getting human approval.

**Scenario:** You are working on `frontend` in a mono-repo that already has `frontend` and `backend` tracked. The user mentions there is also an `analytics` service that the frontend calls. Statuz does not know about it yet.

---

## Before: Current Cluster State

### `.statuz/cluster.yaml`

```yaml
cluster_version: "1.0"
metadata:
  name: acme-commerce
  description: "ACME Commerce multi-project ecosystem"
  updated_at: "2026-06-14T17:30:00Z"

maps:
  - id: frontend
    name: "Frontend Web App"
    description: "Customer-facing web frontend"
    project_path: "./frontend"

  - id: backend
    name: "Backend API"
    description: "REST API serving the frontend"
    project_path: "./backend"

arrows:
  - from_map: frontend
    to_map: backend
    type: dependency
    description: "Frontend calls REST API for cart, checkout, and payment"
```

### What the agent sees

The cluster knows about `frontend` and `backend` and the arrow between them. But there is no `analytics` project in the cluster.

---

## Step 1: Discovery

The agent is working on the frontend and notices code like:

```typescript
// src/analytics/tracker.ts
import { AnalyticsClient } from "../../analytics/client";
```

This cross-references a project outside the current directory. The agent checks:

```bash
ls ../analytics/
# package.json
# src/
#   client.ts
#   events.ts
#   dashboard/
```

There is a real project at `../analytics/`. Let's scan it and generate a proposal.

---

## Step 2: Generate SYN Proposal

```bash
statuz agent discover ../analytics --cluster .statuz/cluster.yaml
```

**What the scanner does:**
1. Reads `../analytics/package.json`
2. Detects language: TypeScript (Node.js)
3. Detects notable files: `client.ts`, `events.ts`, dashboard/
4. Reads source imports to detect cross-project arrows
5. Finds that `frontend` imports from `analytics`
6. Writes the SYN proposal

**Output:**

```
🔍 Scanning: ../analytics
   ├─ Project type: typescript
   ├─ Frameworks: node-express
   ├─ New maps suggested: 1 (analytics)
   └─ New arrows suggested: 1 (frontend → analytics)

📝 Proposal written to: .statuz/syn/proposal-001.yaml

Next steps:
   statuz syn show-proposal .statuz/syn/proposal-001.yaml
   statuz syn approve .statuz/syn/proposal-001.yaml --principal user-name
   statuz syn reject .statuz/syn/proposal-001.yaml --principal user-name
```

---

## Step 3: The Proposal File

### `.statuz/syn/proposal-001.yaml`

```yaml
proposal_version: "1.0"
id: proposal-001
generated_at: "2026-06-15T10:00:00Z"
generated_by: statuz-agent-discover
status: pending

project:
  name: analytics
  type: typescript
  framework: node-express
  description: "Analytics service for event tracking and dashboard data"
  source_path: "../analytics"

cluster_additions:
  maps:
    - id: analytics
      name: "Analytics Service"
      description: "Event tracking and dashboard data API"
      project_path: "../analytics"

  cross_map_arrows:
    - from_map: frontend
      to_map: analytics
      type: dependency
      description: "Frontend calls analytics client for event tracking"

statuz_init:
  create_for_project: analytics
  agent_name: analytics-agent
  environment: local-dev

niche:
  declared_purpose: "Track events and serve dashboard analytics data"
  proposed_does:
    - "Event ingestion and storage"
    - "Dashboard data aggregation"
    - "Analytics client library"
  proposed_does_not:
    - "User authentication"
    - "Payment processing"
    - "Order management"
```

---

## Step 4: Present to User

The agent shows the user the proposal in human-readable form:

```
📝 SYN Proposal #001 — Analytics Service Discovery

Project: analytics (TypeScript / Node.js)
Path:    ../analytics

Proposed changes to cluster:
  + Add new map: "Analytics Service" (event tracking + dashboard data)
  + New arrow: frontend → analytics (frontend calls analytics for events)

Also proposed:
  → Create .statuz/statuz.yaml for analytics project
  → Set niche: event tracking, dashboard data, analytics client
  → Not this project's job: auth, payments, order management

Review the proposal file:
  statuz syn show-proposal .statuz/syn/proposal-001.yaml

To approve:  statuz syn approve .statuz/syn/proposal-001.yaml --principal your-name
To reject:   statuz syn reject .statuz/syn/proposal-001.yaml --principal your-name

Approve this proposal? [y/N]:
```

---

## Step 5: User Approves

User runs:
```bash
statuz syn approve .statuz/syn/proposal-001.yaml --principal sarah
```

**What happens:**
1. `cluster.yaml` is updated with:
   - New `analytics` entry under `maps`
   - New `frontend → analytics` arrow under `arrows`
2. `../analytics/.statuz/statuz.yaml` is created with:
   - `identity.agent_name: analytics-agent`
   - `identity.project_name: analytics`
   - `current_state.status: idle`
   - `next_action: "Define first task for analytics project"`
3. The proposal file is updated: `status: approved`
4. Schema validation runs on all modified files

**Output:**
```
✅ Proposal approved by sarah.
   ├─ cluster.yaml updated — added map: analytics
   ├─ cluster.yaml updated — added arrow: frontend → analytics
   └─ .statuz/ created at: ../analytics/
```

---

## Step 6: After State

### Updated `.statuz/cluster.yaml`

```yaml
cluster_version: "1.0"
metadata:
  name: acme-commerce
  description: "ACME Commerce multi-project ecosystem"
  updated_at: "2026-06-15T10:05:00Z"

maps:
  - id: frontend
    name: "Frontend Web App"
    description: "Customer-facing web frontend"
    project_path: "./frontend"

  - id: backend
    name: "Backend API"
    description: "REST API serving the frontend"
    project_path: "./backend"

  - id: analytics
    name: "Analytics Service"
    description: "Event tracking and dashboard data API"
    project_path: "../analytics"

arrows:
  - from_map: frontend
    to_map: backend
    type: dependency
    description: "Frontend calls REST API for cart, checkout, and payment"

  - from_map: frontend
    to_map: analytics
    type: dependency
    description: "Frontend calls analytics client for event tracking"
```

### New `../analytics/.statuz/statuz.yaml`

```yaml
statuz_version: "0.1"
updated_at: "2026-06-15T10:05:00Z"

identity:
  agent_name: analytics-agent
  project_name: analytics
  environment: local-dev

role:
  name: analytics-service-developer
  responsibilities:
    - "event tracking"
    - "dashboard data API"
  boundaries:
    - "do not handle user authentication"
    - "do not handle payment processing"
    - "do not handle order management"

current_state:
  stage: planning
  task: "define first task for analytics project"
  status: idle
  next_action: "ask user what to build first"

checkpoints:
  - id: cp-001
    at: "2026-06-15T10:05:00Z"
    summary: "Initialized Statuz for analytics project. Discovered by agent working on frontend."
    next_action: "Define first task for analytics project"
```

---

## Step 7: What if the user rejects?

If the user runs:
```bash
statuz syn reject .statuz/syn/proposal-001.yaml --principal sarah
```

**What happens:**
1. The proposal file is updated: `status: rejected`
2. `cluster.yaml` is NOT modified
3. No `.statuz/` is created for the analytics project
4. Output tells the agent the rejection

**Output:**
```
❌ Proposal rejected by sarah.
   cluster.yaml and .statuz/ left unchanged.
   The agent should not create or track analytics project in Statuz.
```

The agent respects this. It may later propose again if the situation changes (e.g., the project scope expands and the analytics dependency becomes critical), but it MUST NOT bypass the SYN gate.

---

## Why This Workflow Matters

1. **Agents can discover and propose, but cannot act alone.** The human remains in control.
2. **The cluster is a single source of truth for project topology.** Every agent working on any project in the cluster sees the same topology.
3. **Arrow Map = names + relationships.** The agent reading cluster.yaml now knows: "There are 3 projects: frontend, backend, analytics. Frontend depends on both backend and analytics."
4. **Cross-project awareness.** If the backend team later changes their API in a way that breaks frontend's calls, the agent working on frontend knows who to talk to.
5. **No duplicate tracking.** Without this system, each agent would independently discover (or fail to discover) the analytics project, creating inconsistent understanding across agents.
