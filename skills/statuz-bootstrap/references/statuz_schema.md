# Statuz Core Schema Quick Reference

> **Authoritative source:** `spec/statuz.schema.json`
> 
> This is a condensed reference. Always validate with `statuz validate <file>`.
>
> **Version:** `statuz_version: "0.1"` (the only valid value for 0.1)

---

## File location

```
.statuz/
  statuz.yaml   ← This is the only file created by `statuz init`
```

Do not invent additional files unless you have a specific need for them.

> **Design Philosophy:** One source of truth. Splitting into multiple files adds synchronization cost. Only split when genuinely needed — e.g., `cluster.yaml` for cross-project topology, `niche-manifest.yaml` for ecological position.

---

## Required fields (schema-enforced)

| Field | Type | Value |
|-------|------|-------|
| `statuz_version` | string | **Must be `"0.1"`** |
| `identity.agent_name` | string | Who is this agent? e.g. `"frontend-dev" |
| `identity.project_name` | string | What project? e.g. `"checkout-ui"` |
| `current_state.status` | string | `idle` \| `in_progress` \| `blocked` \| `done` |

**Minimal valid file:

```yaml
statuz_version: "0.1"
identity:
  agent_name: dev-agent
  project_name: my-project
current_state:
  status: idle
```

---

## Recommended fields

### `updated_at`

When status last changed. Use ISO 8601.

```yaml
updated_at: "2026-06-15T14:30:00Z
```

### `identity` (extended)

```yaml
identity:
  agent_name: frontend-dev      # ✅ required
  project_name: checkout-ui    # ✅ required
  agent_id: "agent-001     # optional — useful for multi-agent coordination
  organization: acme-corp      # optional
  environment: local-dev      # optional — local-dev / staging / production
```

### `role`

```yaml
role:
  name: implementation-assistant
  responsibilities:
    - implement features in TypeScript
    - maintain code quality
    - explain tradeoffs
  boundaries:
    - do not deploy to production without approval
    - do not store secrets
```

### `goal`

```yaml
goal:
  primary: Ship checkout flow refactoring
  secondary:
    - reduce API latency under 100ms
    - maintain >95% test coverage
```

### `current_state` (extended)

```yaml
current_state:
  stage: implementation
  task: refactor checkout flow
  status: in_progress
  last_checkpoint: cp-003
  next_action: integrate payment provider
```

Valid `status` values: `idle`, `in_progress`, `blocked`, `done`

### `progress`

```yaml
progress:
  completed:
    - extracted payment gateway abstraction
    - wrote unit tests for CartService
  blocked_by:
    - waiting for API key from ops team
  open_questions:
    - should we support guest checkout or require account?
```

### `relations`

```yaml
relations:
  related_agents:
    - backend-dev
    - qa-bot
  related_projects:
    - payment-service
  related_files:
    - src/checkout/flow.ts
    - src/checkout/payments.ts
  related_tools:
    - git
    - node
    - statuz
```

### `rules`

```yaml
rules:
  should:
    - read statuz.yaml at session start
    - write checkpoint after meaningful progress
    - update current_state.task when switching tasks
  should_not:
    - store secrets
    - deploy without approval
    - skip tests
```

### `checkpoints`

An append-only log of meaningful events. Each checkpoint should be compact and self-contained.

```yaml
checkpoints:
  - id: cp-001
    at: "2026-06-15T10:00:00Z
    summary: Initialized Statuz for checkout-ui project
    next_action: Define checkout flow architecture
  - id: cp-002
    at: "2026-06-15T11:30:00Z
    summary: Decided on clean architecture with presentation/domain/data layers
    decision: chose TypeScript with Zod for validation
    next_action: extract payment gateway abstraction
```

**Guidelines for good checkpoints:

- Keep each checkpoint under ~3 lines
- Always include `next_action` — this is the handoff value
- Append, never replace — the log is immutable in spirit
- Update `current_state.last_checkpoint` to reference the latest cp-id

---

## Validation

Always validate after editing by hand:

```bash
statuz validate .statuz/statuz.yaml
```

If you edit by hand — always validate. Schema-enforced fields will catch missing or malformed fields before they confuse the next agent.

---

## Beyond core: Related schemas

Once your project grows beyond a single agent, you may need:

| File | Schema | Purpose |
|------|--------|---------|
| `.statuz/statuz.yaml` | `spec/statuz.schema.json` | Runtime status (this file) |
| `.statuz/niche-manifest.yaml` | `spec/niche/niche-manifest.schema.json` | Ecological position (what do I do / not do) |
| `.statuz/cluster.yaml` | `spec/cluster.schema.json` | Cross-project topology (Arrow Map cluster) |
| `.statuz/syn/proposal-*.yaml` | `spec/syn-proposal.schema.json` | SYN proposal for human approval |

**See `skills/statuz-agent-workflow/` for guidance on when and how to use these.
