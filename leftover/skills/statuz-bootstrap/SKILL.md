---
name: statuz-bootstrap
description: Initialize Statuz — the runtime status protocol for AI agents. Use when a project needs a status layer.
version: 1.0.0
license: Apache-2.0
---

# Statuz Bootstrap Skill

## When to activate

Activate this skill when:

- The user wants to initialize Statuz for a new or existing project.
- An agent needs to know who it is, what it is doing, and what comes next.
- The project lacks a `.statuz/statuz.yaml` file.

**Do NOT** activate this skill to store chat transcripts, long-term memory, or secrets.

> **Design Philosophy #1:** Statuz is runtime status, not memory. Status describes the present operational state. Memory stores the past. Keep status small enough to read at session start.

---

## Purpose

The goal of bootstrap is to create exactly **one file** that gives any AI agent a reliable sense of position:

```
.statuz/
  statuz.yaml    ← Core runtime status
```

This file answers:

| Field | Answers |
|-------|---------|
| `identity` | Who am I? What project am I working on? |
| `role` | What are my responsibilities and boundaries? |
| `current_state` | What am I doing now? What's the next action? |
| `progress` | What is done, what is blocked, what is open? |
| `relations` | Who and what am I connected to? |
| `rules` | What operational constraints should I follow? |
| `checkpoints` | What are key decision points for recovery? |

> **Design Philosophy #2:** Small enough to survive. The entire `.statuz/statuz.yaml` should be readable in under 10 seconds. If your status file needs a scrollbar, you are doing it wrong.

---

## Workflow

### Step 1: Detect project context

Before generating anything, determine:

1. **Project name** — directory name or user-provided
2. **Agent role** — what the agent will do (implementation, docs, research, etc.)
3. **Environment** — local-dev, staging, production, etc.

**How:** If the project is complex enough to need ecosystem-level awareness, run:

```bash
statuz agent discover ./path-to-project
```

This scans for `package.json`, imports, directory structure, and generates a SYN proposal for adding this project to a cluster. **Only use this for multi-project ecosystems.**

For simple single-project bootstrap, skip to Step 2.

### Step 2: Generate `.statuz/statuz.yaml`

Use the Statuz CLI — do NOT write raw YAML by hand unless the CLI is unavailable:

```bash
# Option A: Interactive (recommended for first-time use)
statuz init --agent your-agent-name --project your-project-name

# Option B: With organization and environment
statuz init --agent frontend-dev --project checkout-ui \
  --out .statuz/statuz.yaml

# Option C: Default (uses directory name as project)
statuz init
```

This creates **one file**:

```
.statuz/
  statuz.yaml   ← Core runtime status (statuz_version, identity, current_state, etc.)
```

**There is no `checkpoints.log`.** Checkpoints live inside `statuz.yaml` as entries under the `checkpoints` array.

**There is no `agents/` directory.** The agent identity lives in `statuz.yaml` under the `identity` field.

> **Design Philosophy #3:** One source of truth. Everything about the current runtime state lives in `statuz.yaml`. Split files only when you genuinely have cross-project concerns (cluster.yaml for topology, niche.yaml for ecological position).

### Step 3: Validate

Before considering bootstrap complete:

```bash
statuz validate .statuz/statuz.yaml
```

You should see: `Valid statuz file: .statuz/statuz.yaml`

### Step 4: Create a resume briefing

Verify the file produces a readable brief:

```bash
statuz resume .statuz/statuz.yaml
```

Output should fit on one screen:

```
=== Statuz Resume ===
Agent:    frontend-dev
Project:  checkout-ui
Env:      local-dev

Status:   idle
Stage:    initialization
Task:     initialize Statuz
Next:     define the agent's current goal
```

### Step 5: Commit decision

Ask the user:

> `statuz.yaml` has been created. It will be read at the start of future sessions to give the agent context. Should we commit `.statuz/` to version control? (Yes/No, and why?)

Default recommendation: **commit `.statuz/statuz.yaml`** if this is a shared project, so all agents working on it see the same status.

---

## Required fields in `statuz.yaml`

The schema (`spec/statuz.schema.json`) requires:

| Field | Required | Purpose |
|-------|----------|---------|
| `statuz_version` | ✅ | Protocol version ("0.1") |
| `identity.agent_name` | ✅ | Who this agent is |
| `identity.project_name` | ✅ | What project it belongs to |
| `current_state.status` | ✅ | idle / in_progress / blocked / done |

Optional but strongly recommended:

| Field | Purpose |
|-------|---------|
| `updated_at` | When status last changed (ISO 8601) |
| `role.name`, `responsibilities`, `boundaries` | Agent scope and constraints |
| `current_state.stage`, `task`, `next_action` | Current work context |
| `progress.completed`, `blocked_by`, `open_questions` | What is done / stuck / unknown |
| `relations.related_agents`, `related_projects`, `related_files`, `related_tools` | Ecosystem context |
| `rules.should`, `should_not` | Operational constraints |
| `checkpoints[]` | Event log for recovery |

---

## What NOT to put in Statuz

**❌ Never store:**
- Full chat transcripts ("User asked me to refactor auth. I replied...")
- API keys, passwords, tokens, or any secrets
- Large code snippets or full diffs
- Long-term knowledge or documentation (that belongs in your docs, not status)
- Personal preferences or user data unrelated to the task

**✅ What belongs:**
- Task summary: "refactoring auth middleware"
- Decision: "chose JWT over session-based auth"
- Progress: "middleware done, routes next"
- Blockers: "waiting for database schema from backend team"
- Next action: "implement login endpoint"

> **Design Philosophy #4:** Statuz is a status protocol, not a knowledge base. If you are tempted to paste paragraphs into a checkpoint, stop. Write a summary instead. Link to your actual documentation.

---

## Rules

1. **Do not overwrite `statuz.yaml` without asking.** If the file already exists, update it in place (append checkpoints, update `current_state`) — do not regenerate.
2. **No secrets ever.** Even in comments.
3. **Keep status compact.** A good checkpoint is 1-2 lines.
4. **Update `current_state.task` when the task changes.** This is the single most important field for handoffs.
5. **Update `updated_at` on every change.**
6. **Append checkpoints, do not replace them.** They form a log of meaningful events.

---

## Next step after bootstrap

Once `statuz.yaml` exists, the agent should:

1. **Read `statuz resume` at the start of every session** — know where things stand
2. **Update `current_state.task` when switching tasks** — keep the status truthful
3. **Run `statuz checkpoint --summary "..." --next "..."` after meaningful progress** — each checkpoint marks a recovery point
4. **Run `statuz validate` after editing by hand** — catch mistakes early

For multi-project ecosystems, see `skills/statuz-agent-workflow/` which covers cluster management, Arrow Maps, niche manifests, and SYN governance.
