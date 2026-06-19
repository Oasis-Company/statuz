# Statuz CLI Cheat Sheet

All commands, one page.

---

## Core: Runtime Status

### `statuz init`
Create a new status file.

```bash
statuz init --agent frontend-dev --project checkout-ui
```

Options:
- `--agent <name>` — agent name (default: dev-agent)
- `--project <name>` — project name (default: directory name)
- `--out <path>` — output path (default: .statuz/statuz.yaml)
- `--gitignore` — generate a .gitignore for .statuz directory

Creates:
```
.statuz/
  statuz.yaml
```

---

### `statuz validate`
Validate a Statuz file against its schema.

```bash
# auto-detect file type from contents
statuz validate .statuz/statuz.yaml

# force a specific schema type
statuz validate .statuz/statuz.yaml --type statuz
```

Valid types: `statuz`, `niche`, `arrow-map`, `cluster`, `syn-proposal`

Exit code: 0 = valid, 1 = invalid

**Always run this after editing a Statuz file by hand.**

---

### `statuz resume`
Print a human-readable summary from a status file.

```bash
statuz resume .statuz/statuz.yaml
```

Output:
```
=== Statuz Resume ===
Agent:    frontend-dev
Project:  checkout-ui
Env:      local-dev

Status:   in_progress
Stage:    implementation
Task:     refactor checkout flow
Last CP:  extracted payment gateway abstraction
Next:     implement Stripe adapter
```

---

### `statuz checkpoint`
Append a checkpoint. The most important command after resume.

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Implemented Stripe adapter. Tests passing." \
  --decision "Chose webhook-first architecture" \
  --next "Handle payment success callback"
```

Options:
- `--summary <text>` — Brief summary (required)
- `--decision <text>` — Key decision made (optional)
- `--evidence <items...>` — Supporting evidence (optional)
- `--next <action>` — What comes next (optional but STRONGLY RECOMMENDED)

This auto-increments cp-00N counter. It also updates:
- `current_state.last_checkpoint` to the new cp-id
- `updated_at` to now

---

## Agent: Project Discovery

### `statuz agent discover`
Scan a project, infer its type and dependencies, generate a SYN proposal.

```bash
# scan a project and create a SYN proposal
statuz agent discover ./path-to-project

# with an existing cluster reference
statuz agent discover ./new-project --cluster ../cluster.yaml
```

This:
1. Scans the project directory
2. Detects language (TypeScript, Python, Go, Rust)
3. Infers framework and notable files and dependencies
4. Detects cross-project arrows from imports
5. Writes a SYN proposal to `.statuz/syn/proposal-xxx.yaml`
6. Prints instructions for the user to approve or reject

After discover, the user must approve with syn approve` to actually create cluster + statuz.

---

### `statuz agent scan`
Show scanner output (debug only, not normally needed).

```bash
statuz agent scan ./path-to-project
```

---

## SYN: Human Synchronization

### `statuz syn show-proposal`
Display a SYN proposal.

```bash
statuz syn show-proposal .statuz/syn/proposal-xxx.yaml
```

---

### `statuz syn approve`
Apply a SYN proposal. Requires `--principal <name> to record who approved.

```bash
statuz syn approve .statuz/syn/proposal-xxx.yaml --principal user-name
```

This:
1. Updates cluster.yaml with the new maps and arrows
2. Creates .statuz/statuz.yaml for approved projects
3. Records approval in the proposal file
4. Marks proposal as approved

---

### `statuz syn reject`
Reject a SYN proposal.

```bash
statuz syn reject .statuz/syn/proposal-xxx.yaml --principal user-name
```

This:
1. Records rejection
2. Leaves cluster.yaml and .statuz untouched

---

### `statuz syn request`
Create a SYN request for human decision with multiple options.

```bash
statuz syn request \
  --source frontend-dev \
  --summary "Should we split auth into its own service?" \
  --option "Keep auth in main service|simpler deployment" \
  --option "Extract auth service|cleaner separation" \
  --recommendation "Extract auth service for better long-term"
```

---

## Arrow Map: Topology

### `statuz arrow-map init`
Create an Arrow Map for a project.

```bash
statuz arrow-map init --project my-project
```

---

### `statuz arrow-map show`
Display an Arrow Map.

```bash
statuz arrow-map show .statuz/arrow-map.yaml
```

---

### `statuz arrow-map validate`
Validate an Arrow Map against its schema.

```bash
statuz arrow-map validate .statuz/arrow-map.yaml
```

---

### `statuz arrow-map node-add`
Add a node to an Arrow Map.

```bash
statuz arrow-map node-add .statuz/arrow-map.yaml \
  --id frontend \
  --name "Frontend project" \
  --status active \
  --description "Serves UI to end users"
```

---

### `statuz arrow-map arrow-add`
Add an arrow (relationship) between two nodes.

```bash
statuz arrow-map arrow-add .statuz/arrow-map.yaml \
  --from frontend \
  --to backend \
  --type dependency \
  --description "calls REST API"
```

---

## Arrow Map: Proposals

### `statuz arrow-map proposal-create`
Create a SYN proposal for an arrow map changes.

```bash
statuz arrow-map proposal-create \
  --description "Add analytics service and arrow from frontend" \
  --from-node frontend \
  --to-node backend \
  --from-type dependency \
  --from-description "calls REST API"
```

---

## Cluster: Cross-project Topology

### `statuz cluster init`
Create a cluster.yaml for multi-project coordination.

```bash
statuz cluster init
```

---

### `statuz cluster show`
Display the cluster.

```bash
statuz cluster show .statuz/cluster.yaml
```

---

### `statuz cluster validate`
Validate the cluster against its schema.

```bash
statuz cluster validate .statuz/cluster.yaml
```

---

## Status Keeper: Health Checks

### `statuz status-keeper run`
Run all configured health checks.

```bash
statuz status-keeper run
```

Checks:
- statuz.yaml exists and is valid
- checkpoints are reasonably fresh
- arrow-map.yaml exists and valid
- cluster.yaml coherent
- niche-manifest.yaml consistent with current state
- schema versions are current

### `statuz status-keeper show-report`
Show the last health report.

```bash
statuz status-keeper show-report
```

---

## Niche: Ecological Position

### `statuz niche show`
Display a niche manifest.

```bash
statuz niche show .statuz/niche-manifest.yaml
```

---

## Pending Actions: Agent ↔ Human Task Tracking

### `statuz pending-actions add`
Create a task for the human or agent to do.

```bash
statuz pending-actions add \
  --title "Install dependencies" \
  --description "Run npm install in packages/cli" \
  --assigned-to human \
  --priority high
```

### `statuz pending-actions list`
List all pending actions.

```bash
statuz pending-actions list
```

### `statuz pending-actions update-status`
Mark action in_progress or done.

```bash
statuz pending-actions update-status pa-003 --status in_progress
```

---

## Lease Manager: Responsibility Holding

### `statuz lease take`
Take responsibility for a project or component.

```bash
statuz lease take --scope "project:checkout-ui" --holder frontend-dev --ttl 3600
```

### `statuz lease release`
Release a lease.

```bash
statuz lease release --scope "project:checkout-ui"
```

---

## Calibration: Drift Detection

### `statuz calibration check`
Compare declared niche against observed checkpoint behavior.

```bash
statuz calibration check --niche .statuz/niche-manifest.yaml --statuz .statuz/statuz.yaml
```

---

## Bus: Signal Bus

### `statuz bus send`
Send a signal to other agents.

```bash
statuz bus send --type task_completed --source frontend-dev --summary "Checkout flow deployed"
```

---

## Signal Types

| Signal Type | Purpose |
|--------------|---------|
| `idle` | Not currently working |
| `in_progress` | Actively working |
| `blocked` | Blocked, waiting for something |
| `done` | Task complete |
