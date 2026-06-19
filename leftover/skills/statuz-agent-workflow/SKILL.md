---
name: statuz-agent-workflow
description: The daily workflow for AI agents using Statuz — read status, work, write checkpoints, manage ecosystem.
version: 1.0.0
license: Apache-2.0
---

# Statuz Agent Workflow Skill

## When to activate

This skill should be active **whenever an AI agent is working on a Statuz-enabled project**. It defines:

1. What to do at the **start of a session**
2. What to do when the **task changes**
3. What to do after **meaningful progress**
4. What to do at the **end of a session**
5. When to escalate to **SYN (human approval)**
6. How to maintain **cross-project awareness**

> **Design Philosophy #5:** Statuz is a protocol, not a tool. Using Statuz means following a discipline — read at session start, write checkpoints after progress, keep status truthful. The discipline is what makes handoffs work.

---

## The Standard Cycle

```
  ┌─────────────────────────────────────────────────────┐
  │  1. READ STATUS (start of session)                  │
  │     $ statuz resume .statuz/statuz.yaml              │
  │     → understand who you are, what was happening,    │
  │       what comes next                                │
  └────────────────────────┬────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────┐
  │  2. WORK (do the thing the user asked for)           │
  │     → If task changes from statuz:                   │
  │       Update current_state.task in file             │
  │       → If task is truly new direction, consider:    │
  │         new checkpoint                               │
  │     → If you discover a new project/arrow:           │
  │       Generate SYN proposal (see references)         │
  └────────────────────────┬────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────┐
  │  3. WRITE CHECKPOINT (after meaningful progress)     │
  │     $ statuz checkpoint .statuz/statuz.yaml \        │
  │       --summary "Implemented login endpoint" \       │
  │       --next "Implement logout endpoint"             │
  │     → This appends cp-00N to checkpoints[]           │
  │     → Run validate to confirm                        │
  └────────────────────────┬────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────┐
  │  4. HEALTH CHECK (periodically)                      │
  │     $ statuz status-keeper run                       │
  │     → Verifies files exist, checkpoints are fresh,   │
  │       schemas valid, cluster topology coherent       │
  └────────────────────────┬────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────┐
  │  5. END OF SESSION (before stopping)                 │
  │     → Ensure current_state.status reflects reality   │
  │     → Ensure next_action is clear                    │
  │     → Final statuz resume produces clean output      │
  └─────────────────────────────────────────────────────┘
```

---

## 1. Start of session

**First action when opening a project:**

```bash
statuz resume .statuz/statuz.yaml
```

**What to look for:**

| Field | If it says... | You should... |
|-------|---------------|---------------|
| `status: blocked` | ...a specific blocker | Ask user to unblock before starting |
| `status: in_progress` but `task` is unclear | Ambiguous task | Ask user to clarify — do NOT guess |
| `next_action` is vague | "continue work" | Ask user what "continue" means |
| `checkpoints[]` is empty | No prior work | Confirm you are starting from scratch |

**If status is stale (older than 2 weeks with no checkpoints), say:**

> "The last checkpoint was from `[date]`. The task is `[task]` and the next action is `[next_action]`. Is this still current, or should we re-plan?"

> **Design Philosophy #6:** A stale status is worse than no status. If the status file says "implement login" but the login has been live in production for a month, the status is actively misleading. Update it.

---

## 2. During work: When the task changes

**Any time you switch to meaningfully different work, update `statuz.yaml` in place:**

- Change `current_state.task` to reflect what you are now doing
- Update `current_state.stage` if the phase changed (design → implementation → testing)
- Update `current_state.next_action` to what comes after what you're doing
- Update `updated_at`
- If the change is big enough, append a checkpoint:

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Pivoted from login to payment integration" \
  --decision "After discussing with user, decided to implement Stripe integration before completing login UI" \
  --next "Implement Stripe webhook handler"
```

**DO NOT:**
- Create a new `statuz.yaml`
- Delete old checkpoints
- Leave the status with a stale `task` while working on something else

> **Design Philosophy #7:** The status file must be **truthful**. If the agent is working on payment integration, `current_state.task` must say "payment integration". A lying status file creates disorienting handoffs.

---

## 3. After meaningful progress: Write a checkpoint

A "checkpoint" is a compact event summary. It is the single most valuable thing for the next agent picking up the work.

**When to write a checkpoint:**

- After a decision with lasting consequences ("chose JWT over session-based auth")
- After completing a discrete, meaningful unit of work ("wrote unit tests for CartService")
- After discovering something that changes the plan ("found that the API we planned to use is deprecated")
- Before pausing or handing off

**When NOT to write a checkpoint:**

- After every small code change (one line fix, typo correction)
- After each message in a chat
- When the "progress" is just thinking or research without concrete output

**How:**

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Extracted payment gateway abstraction. Tests pass." \
  --next "Implement Stripe adapter"
```

See `examples/good-checkpoint.md` for before/after examples.

---

## 4. Cross-project awareness: The cluster

If your project is part of a multi-project ecosystem, there should be a `cluster.yaml`.

**What a cluster is:** A topology map of projects and how they relate. It is NOT a dashboard or monitoring system. It is a compact graph of names.

```
  project-a (frontend) ────calls───▶ project-b (backend API)
                                 │
                                 └──┐
                                    ▼
                         project-c (shared auth lib)
```

**When you should care about the cluster:**

1. **You start working on a new project** — check if it is in the cluster. If not, consider `statuz agent discover` to generate a SYN proposal.
2. **A project you depend on changes** — its status may affect your work.
3. **You are about to modify a shared boundary** — if you are changing an API that other projects call, you need to know who they are.

**How:**

```bash
# Check if cluster exists
statuz cluster show

# See your project's arrows
statuz cluster validate
```

See `examples/discovery-example.md` for a full discover → proposal → approve flow.

---

## 5. When to escalate to SYN

SYN = "Strategic Synchronization" = human approval required.

**Trigger SYN when:**

| Situation | Example | Action |
|-----------|---------|--------|
| **Ecological position change** | You realize "this project should also handle email" but the niche manifest says it shouldn't | Generate SYN proposal to modify niche |
| **New project discovered** | User mentions "oh and there's also the analytics service that needs to connect" | `statuz agent discover ./analytics` → show proposal to user |
| **New arrow needed** | You realize project A now calls project B, but the Arrow Map doesn't reflect this | Generate SYN proposal for new arrow |
| **Architectural decision** | You need to choose between fundamentally different approaches | Write SYN request with options |
| **Calibration drift** | `statuz calibration` reports drift exceeding threshold | escalate |

**Do NOT SYN for:**

- Everyday implementation decisions
- Routine bug fixes
- Task execution that matches the declared niche

See `references/when-to-use-syn.md` for the complete decision tree.

---

## 6. End of session

Before you stop working on the project, do a clean handoff:

1. **Check truthfulness:** Does `current_state.task` match what you were actually doing?
2. **Check next_action:** Is it specific enough that another agent could pick it up without reading the chat history?
   - ❌ Bad: "continue"
   - ❌ Bad: "keep going"
   - ✅ Good: "Implement payment success callback handler"
3. **Check status:** Set to `blocked` if something is blocking, `done` if complete, `in_progress` if mid-task
4. **Run health check:** `statuz status-keeper run`
5. **Final resume check:** `statuz resume .statuz/statuz.yaml` — would this make sense to someone seeing it for the first time?

If you cannot cleanly answer "yes" to #5, the status file needs work.

---

## References

| File | Purpose |
|------|---------|
| `references/design-philosophy.md` | The 7 core principles — read before editing status |
| `references/cli-cheatsheet.md` | All Statuz commands on one page |
| `references/four-layer-model.md` | Core / niche / SYN / Arrow Map explained |
| `references/when-to-use-syn.md` | Decision tree for when to escalate |
| `examples/session-template.md` | A full annotated session showing status evolution |
| `examples/good-checkpoint.md` | Good vs bad checkpoints — side by side |
| `examples/discovery-example.md` | Full discover → SYN proposal → approve flow |
