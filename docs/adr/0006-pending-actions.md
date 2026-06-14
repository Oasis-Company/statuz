# ADR 0006: Pending Actions — Bidirectional Human-Agent Action Tracker

**Status:** Proposed  
**Date:** 2026-06-03  
**Authors:** Statuz Core Team

---

## Context

Current Statuz protocol mechanisms are **agent-to-human** or **agent-to-file** only:

| Mechanism | Direction | Purpose |
|-----------|-----------|---------|
| `checkpoints` | Agent → File | Record agent progress |
| `open_questions` | Agent → Human | Pose a question |
| `SYN` | Agent → Human | Request strategic decision |

None of these provide a **human → agent** feedback channel for tactical, operational tasks. This creates a real-world failure mode:

1. Agent says "go to Supabase Dashboard and generate a service_role key"
2. Human does it (or doesn't, or does it partially)
3. Agent has **no way to know** the current status
4. Agent proceeds with assumptions, produces wrong results

The gap is not about strategy (SYN) or memory — it's about **operational information asymmetry** between agent and human during collaborative workflows.

---

## Decision

We will introduce a new Core-level object: **`Pending Actions`**.

### Core Principles

1. **Bidirectional**: Both agent and human can read and write.
2. **Human-writable by design**: A human can open the YAML file and change `status: pending` to `status: done` without any tool.
3. **Agent-mandatory reading**: Agent MUST read this file before making assumptions about external service state, token availability, or any prerequisite that requires human action.
4. **Minimal disclosure**: Actions describe what is needed, not what exists. No secrets, tokens, or credentials are stored here.
5. **Belongs to Core**: Not niche, not SYN. This is fundamental agent-human collaboration infrastructure.

### File Location

```
.statuz/pending-actions.yaml
```

Same directory as `statuz.yaml`. No nesting, no subdirectory — immediate accessibility for both humans and agents.

### Lifecycle

```
Agent creates action (status: pending)
    ↓
Human sees it (via VS Code panel, CLI, or opening the file)
    ↓
Human marks as in_progress (optional)
    ↓
Human completes and marks as done (writes resolution.outcome)
    ↓
Agent reads the file, sees status: done, reads resolution.outcome
    ↓
Agent proceeds knowing the human has completed the prerequisite
```

---

## Consequences

### Positive

- Eliminates a common class of agent hallucination (assuming human actions are complete)
- Human retains full control — the file is a plain YAML they can edit
- Agent has clear contract: "check pending actions before using external services"
- Fits Statuz Core philosophy: lightweight, file-based, human-readable

### Negative

- Adds one more file that agents must manage
- Agent must be explicitly programmed to check this file (not automatic)
- Potential for stale actions if human forgets to mark them done

### Mitigations

- Agent SHOULD check for stale pending actions and prompt the human
- VS Code extension will surface pending actions visually (see Phase A of execution plan)
- `deadline` field allows agent to detect urgently-blocked actions

### Relation to Existing Mechanisms

This is **not** a replacement for:
- `checkpoints` — which record agent progress
- `open_questions` — which are conversational, not action-tracked
- `SYN` — which handles strategic decisions, not operational tasks

This is a **net-new category** filling a genuine gap.

---

## Status Note

This ADR and its accompanying schema are **Planned**. Implementation will occur during Phase A of the execution plan (VS Code Extension), as the primary UI for pending actions will be the VS Code niche status panel.

### Planned Implementation Artifacts

- [ ] `spec/pending-actions.schema.json` — ✅ Schema written (this ADR)
- [ ] `docs/PENDING_ACTIONS.md` — ✅ Specification document written
- [ ] VS Code: Pending Actions tree view
- [ ] VS Code: Status toggle buttons (pending → in_progress → done)
- [ ] CLI: `statuz pending list` command
- [ ] CLI: `statuz pending done <id>` command
- [ ] Agent behavior contract: mandatory read-before-proceed rule
- [ ] Conformance fixtures: valid and invalid pending-actions files
