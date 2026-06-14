# Pending Actions

> **Status: Planned** — Schema defined, implementation pending (Phase A of execution plan)
>
> Version: 1.0  
> Schema: `spec/pending-actions.schema.json`  
> ADR: `docs/adr/0006-pending-actions.md`

---

## Overview

**Pending Actions** is a bidirectional, human-writable action tracker. It solves the **information asymmetry problem** between AI agents and their human collaborators:

> The agent asks the human to do something.  
> The human does it (or doesn't).  
> The agent has no way to know.  
> The agent makes wrong assumptions and produces wrong results.

Pending Actions gives both sides a **shared, inspectable, writable** record of what the human needs to do before the agent can continue.

---

## Position in Statuz Architecture

```
┌─────────────────────────────────────────────┐
│ Statuz Core                                 │
│                                             │
│  .statuz/statuz.yaml       Runtime status   │
│  .statuz/pending-actions.yaml  ← NEW        │
│                                             │
├─────────────────────────────────────────────┤
│ Statuz niche                                │
│                                             │
│  .statuz/niche/manifest.yaml                │
│  .statuz/niche/signals/                     │
│  .statuz/niche/assessments/                 │
│  .statuz/niche/calibrations/                │
│  .statuz/niche/syn-requests/                │
└─────────────────────────────────────────────┘
```

Pending Actions is a **Core** object, not niche. It does not describe ecological position — it describes **what the human hasn't done yet that the agent is waiting for**.

---

## File Format

```yaml
# .statuz/pending-actions.yaml
pending_actions_version: "1.0"
updated_at: "2026-06-03T11:45:00Z"

pending_actions:
  - id: "pa-001"
    title: "Generate Supabase service_role key"
    description: >
      Go to Supabase Dashboard → Project Settings → API.
      Copy the `service_role` key. Do NOT use the anon key.
      Save it somewhere the agent can reference.
    requested_by: agent
    assigned_to: human
    status: done
    priority: critical
    created_at: "2026-06-03T11:30:00Z"
    deadline: "2026-06-03T18:00:00Z"
    human_notes: "Done. Key is in .env as SUPABASE_SERVICE_ROLE_KEY"
    agent_blocked_on:
      - "Cannot initialize Supabase admin client"
      - "All row-level-security bypass tests blocked"
    resolution:
      resolved_at: "2026-06-03T11:45:00Z"
      resolved_by: "chkev"
      outcome: "service_role key generated and stored in .env"
      notes: "Token starts with eyJh..."

  - id: "pa-002"
    title: "Review and approve user_role enum migration"
    description: >
      The proposed migration adds 'moderator' and 'viewer' roles.
      Check if this aligns with the product spec before approving.
    requested_by: agent
    assigned_to: human
    status: blocked
    priority: high
    created_at: "2026-06-03T12:00:00Z"
    human_notes: "Blocked — need product team input on 'moderator' permissions"
    agent_blocked_on:
      - "Database migration pending approval"

  - id: "pa-003"
    title: "Create Google Play signing key for Thoth app"
    requested_by: human
    assigned_to: agent
    status: in_progress
    priority: high
    created_at: "2026-06-03T13:00:00Z"
    human_notes: "Agent is working on this now"
```

---

## Field Reference

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pending_actions_version` | `string` | Yes | Must be `"1.0"` |
| `updated_at` | `datetime` | Yes | ISO 8601 timestamp of last modification |
| `pending_actions` | `array` | Yes | Ordered list of actions |

### Action Fields

| Field | Type | Required | Who Writes | Description |
|-------|------|----------|------------|-------------|
| `id` | `string` | Yes | Agent | Unique ID, format `pa-NNN` |
| `title` | `string` | Yes | Agent | Short actionable title |
| `description` | `string` | No | Agent | Detailed instructions |
| `requested_by` | `enum` | Yes | Agent | `agent` or `human` |
| `assigned_to` | `enum` | Yes | Agent | `human` or `agent` |
| `status` | `enum` | Yes | **Human** | One of: `pending`, `in_progress`, `done`, `blocked`, `cancelled` |
| `priority` | `enum` | No | Agent | `critical`, `high`, `medium`, `low` (default: `medium`) |
| `created_at` | `datetime` | Yes | Agent | Creation timestamp |
| `deadline` | `datetime` | No | Agent | Optional deadline |
| `human_notes` | `string` | No | **Human** | Free-form notes. Agent MUST read these. |
| `agent_blocked_on` | `string[]` | No | Agent | What the agent cannot do until resolved |
| `resolution` | `object` | No | **Human** | Filled when `status` changes to `done` or `cancelled` |

### Resolution Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resolved_at` | `datetime` | Yes | When resolved |
| `resolved_by` | `string` | Yes | Who resolved it |
| `outcome` | `string` | Yes | What happened — the key, path, confirmation |
| `notes` | `string` | No | Additional context |

---

## Agent Behavior Contract

Every agent interacting with a Statuz-enabled project MUST follow this contract:

### 1. Read Before Proceeding

```
BEFORE the agent:
  - Initializes any external service client
  - Accesses any API key, token, or credential
  - Makes any statement containing "assuming", "if you've already", "once you've"
  - Begins a task that depends on human setup

THE AGENT MUST:
  1. Read .statuz/pending-actions.yaml
  2. Find any action where:
     a. status is "pending" or "in_progress" or "blocked"
     b. The action is listed in agent_blocked_on (or matches the current task)
  3. Report: "I'm blocked on {pa-XXX}: {title}. Current status: {status}."
  4. STOP. Do not proceed. Do not assume.
```

### 2. Write When Blocked

```
WHEN the agent discovers it needs something only the human can provide:
  1. Create a new pending action with:
     - Clear, specific title
     - Step-by-step description
     - All relevant agent_blocked_on items
     - Appropriate priority (critical if task is completely blocked)
  2. Write the file
  3. Tell the human: "I've created pending action {pa-XXX}. It's blocking {X tasks}."
```

### 3. Read Human Notes

```
WHEN the agent reads the pending-actions file:
  - ALWAYS read human_notes on every action
  - If human_notes contains questions, answer them
  - If human_notes contains corrections, acknowledge and apply
  - If human_notes says "blocked because X", ask the human about X
```

### 4. Detect Staleness

```
PERIODICALLY (every session start or major milestone):
  - Check for actions where:
    a. status is "pending" or "in_progress"
    b. created_at is more than 24 hours ago
    c. No human_notes update in 24 hours
  - Prompt the human: "pa-XXX has been pending for {N} hours. Still planned?"
  - Do NOT auto-cancel. Let the human decide.
```

---

## Comparison: Pending Actions vs. Other Mechanisms

| Aspect | Pending Actions | open_questions | SYN |
|--------|----------------|----------------|-----|
| **Type of need** | Operational task | Conversational question | Strategic decision |
| **Who acts** | Human does something | Human answers | Human decides |
| **Agent blocked?** | Yes (specific tasks) | Maybe | Maybe (direction unclear) |
| **Who writes** | Both (agent creates, human updates status) | Agent writes, human reads | Agent proposes, human resolves |
| **Lifecycle** | pending → done (action complete) | asked → answered (question resolved) | requested → accepted/rejected (decision made) |
| **Structured output?** | Yes (resolution.outcome) | No (free text) | Yes (resolution object) |
| **Fits in Core?** | ✅ Yes | ✅ Yes | niche layer |

---

## Examples

### Example 1: Supabase Token Blocking

```yaml
# Agent creates this when it realizes it can't initialize Supabase
pending_actions:
  - id: "pa-001"
    title: "Generate Supabase service_role key"
    description: >
      Go to https://supabase.com/dashboard/project/{ref}/settings/api
      Copy the `service_role` key. Save it to .env as SUPABASE_SERVICE_ROLE_KEY.
    requested_by: agent
    assigned_to: human
    status: pending
    priority: critical
    created_at: "2026-06-03T14:00:00Z"
    agent_blocked_on:
      - "Supabase admin client initialization"
      - "All database write operations"
      - "All RLS bypass operations"
      - "Integration test suite"
```

```yaml
# Human updates after completing
pending_actions:
  - id: "pa-001"
    title: "Generate Supabase service_role key"
    status: done
    human_notes: "Done. Key is in .env as SUPABASE_SERVICE_ROLE_KEY"
    resolution:
      resolved_at: "2026-06-03T14:15:00Z"
      resolved_by: "chkev"
      outcome: "service_role key generated and added to .env"
```

### Example 2: Multi-Step Dependency Chain

```yaml
pending_actions:
  - id: "pa-010"
    title: "Create Google Cloud project for Thoth backend"
    status: done
    resolution:
      outcome: "Project created: thoth-backend-prod (ID: thoth-123456)"
    # ...
    
  - id: "pa-011"
    title: "Enable Firebase Authentication in Google Cloud project"
    status: in_progress
    human_notes: "Following the Firebase console wizard now"
    agent_blocked_on:
      - "User authentication module"
      - "Dream storage integration"
    depends_on: "pa-010"  # This can't start until pa-010 is done

  - id: "pa-012"
    title: "Configure Firebase security rules"
    status: pending
    agent_blocked_on:
      - "Firebase security deployment"
    depends_on: "pa-011"
```

---

## VS Code Integration (Planned)

The VS Code extension (Phase A of execution plan) will provide:

- **Pending Actions tree view** in the niche status panel
- **Status toggle buttons**: one-click to move between `pending` → `in_progress` → `done`
- **Badge counter** on the status bar showing unresolved critical actions
- **Inline editing** of `human_notes` directly in the tree view
- **Auto-refresh** when the YAML file changes on disk

---

## CLI Commands (Planned)

```bash
# List all pending actions
statuz pending list

# Filter by status
statuz pending list --status pending
statuz pending list --status critical

# Mark an action as done
statuz pending done pa-001 --outcome "Key generated"

# Mark an action as blocked with a note
statuz pending block pa-002 --note "Waiting for product team"

# Create a new pending action
statuz pending create \
  --title "Generate API key for SendGrid" \
  --description "Go to SendGrid dashboard → API Keys → Create" \
  --priority high
```

---

## Non-Goals

Pending Actions is NOT:

- A task manager or issue tracker — use GitHub Issues, Linear, or Jira for those
- A replacement for `checkpoints` — checkpoints record agent progress, not human tasks
- A replacement for `SYN` — SYN handles strategic decisions requiring human governance
- A secret store — never put tokens, passwords, or API keys in pending actions
- A notification system — it's a file-based protocol; notifications are the UI layer's job

---

## Compatibility

- **Statuz 0.1 → 1.0**: Pending Actions is a new, optional file. Agents that don't know about it can still read `statuz.yaml`.
- **Schema version**: `pending_actions_version: "1.0"` is independent from `statuz_version: "0.1"`.
- **Extension rules**: Readers MUST preserve unknown top-level fields. Writers MUST NOT delete unknown fields.

---

*Status: Planned. See `docs/adr/0006-pending-actions.md` for the architectural decision record.*
