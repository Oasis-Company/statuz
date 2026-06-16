# Full Session Example: A Day in the Life of a Statuz-Aware Agent

This example walks through a complete agent session. It shows the before state, the work, and the after state.

---

## Before: Starting State

### `.statuz/statuz.yaml` (before)

```yaml
statuz_version: "0.1"
updated_at: "2026-06-14T17:30:00Z"

identity:
  agent_name: frontend-dev
  project_name: checkout-ui
  environment: local-dev

role:
  name: implementation-assistant
  responsibilities:
    - "Implement checkout flow features"
    - "Maintain code quality"
    - "Write tests"
  boundaries:
    - "Do not deploy to production without approval"
    - "Do not modify shared-auth library — coordinate with backend team"

current_state:
  stage: implementation
  task: "refactor payment flow to support Stripe"
  status: in_progress
  last_checkpoint: cp-002
  next_action: "Implement Stripe webhook handler for payment confirmation"

progress:
  completed:
    - "Extracted payment gateway abstraction"
    - "Added Stripe SDK to dependencies"
  blocked_by: []
  open_questions:
    - "Should failed payments retry automatically?"

relations:
  related_agents: ["backend-api", "qa-bot"]
  related_projects: ["payment-service", "shared-auth"]
  related_files: ["src/payments/gateway.ts", "src/checkout/flow.ts"]
  related_tools: ["git", "node", "statuz"]

rules:
  should:
    - "read statuz.yaml at session start"
    - "write checkpoint after meaningful progress"
    - "update current_state.task when switching tasks"
  should_not:
    - "store secrets"
    - "skip tests"

checkpoints:
  - id: cp-001
    at: "2026-06-14T10:00:00Z"
    summary: "Started payment flow refactor. Extracted gateway abstraction."
    next_action: "Integrate Stripe SDK"
  - id: cp-002
    at: "2026-06-14T17:30:00Z"
    summary: "Stripe SDK integrated. Basic payment intent flow working."
    next_action: "Implement Stripe webhook handler for payment confirmation"
```

### `statuz resume` output

```
=== Statuz Resume ===
Agent:    frontend-dev
Project:  checkout-ui
Env:      local-dev

Status:   in_progress
Stage:    implementation
Task:     refactor payment flow to support Stripe
Last CP:  Stripe SDK integrated. Basic payment intent flow working.
Next:     Implement Stripe webhook handler for payment confirmation
```

### What the agent understands from this

1. I am `frontend-dev` working on `checkout-ui`
2. I was implementing a Stripe webhook handler
3. The gateway abstraction and SDK integration are done
4. There is an open question about retry behavior
5. I should NOT modify shared-auth
6. I should write a checkpoint after meaningful progress

---

## During Work

### Step 1: Read the resume (automatic at session start)

```bash
statuz resume .statuz/statuz.yaml
```

Agent sees: "Implement Stripe webhook handler for payment confirmation."

### Step 2: Work

Agent implements:
- `src/payments/webhook-handler.ts` — handles `payment_intent.succeeded` and `payment_intent.failed`
- `src/payments/webhook-handler.test.ts` — tests for success and failure cases
- Updates `src/checkout/flow.ts` — routes payment status updates through the handler

After testing, the agent determines that failed payments should NOT retry automatically (the user needs to see the error and decide). This answers the `open_questions` item.

### Step 3: Write checkpoint

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Implemented Stripe webhook handler with success and failure paths. Tests passing." \
  --decision "Failed payments do NOT retry automatically — user must act. This resolves open question about retry behavior." \
  --next "Implement order state machine update on successful payment"
```

### Step 4: Task switch — user asks to also work on cart validation

After the checkpoint, the user says: "Also, could you add cart validation before payment? We've seen users trying to check out with empty carts."

This is a different task. The agent SHOULD update `current_state.task`:

```yaml
# In statuz.yaml, updated by the agent
current_state:
  stage: implementation
  task: "add cart validation before payment"
  status: in_progress
  last_checkpoint: cp-003
  next_action: "Add cart total > 0 and item-validity checks in checkout flow"
```

The agent then implements cart validation and writes another checkpoint:

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Added cart validation. Empty cart or zero-total carts now blocked with clear error message." \
  --next "Test the full happy path: cart → payment → order"
```

### Step 5: Cross-project awareness

While working, the agent notices that the frontend now depends on the backend's `order` endpoint to create orders after payment.

```bash
# Check the cluster
statuz cluster show .statuz/cluster.yaml
```

If the cluster shows `frontend → backend` dependency already exists, no action needed. If it doesn't show the `order` relationship clearly:

```bash
# Propose an arrow update via SYN
statuz syn request \
  --source frontend-dev \
  --summary "Frontend now calls backend /order endpoint after payment success" \
  --option "Add frontend→backend(order) arrow|captures the relationship" \
  --recommendation "Add arrow — the frontend now depends on order creation"
```

---

## After: End of Session State

### `.statuz/statuz.yaml` (after)

```yaml
statuz_version: "0.1"
updated_at: "2026-06-15T16:00:00Z"

identity:
  agent_name: frontend-dev
  project_name: checkout-ui
  environment: local-dev

role:
  name: implementation-assistant
  responsibilities:
    - "Implement checkout flow features"
    - "Maintain code quality"
    - "Write tests"
  boundaries:
    - "Do not deploy to production without approval"
    - "Do not modify shared-auth library — coordinate with backend team"

current_state:
  stage: implementation
  task: "test full happy path: cart → payment → order"
  status: in_progress
  last_checkpoint: cp-004
  next_action: "Run integration test for end-to-end checkout flow"

progress:
  completed:
    - "Extracted payment gateway abstraction"
    - "Added Stripe SDK to dependencies"
    - "Implemented Stripe webhook handler"
    - "Added cart validation (empty cart, zero total blocked)"
  blocked_by: []
  open_questions: []  # ← resolved by cp-003 decision

relations:
  related_agents: ["backend-api", "qa-bot"]
  related_projects: ["payment-service", "shared-auth"]
  related_files: ["src/payments/gateway.ts", "src/payments/webhook-handler.ts", "src/checkout/flow.ts"]
  related_tools: ["git", "node", "statuz"]

rules:
  should:
    - "read statuz.yaml at session start"
    - "write checkpoint after meaningful progress"
    - "update current_state.task when switching tasks"
  should_not:
    - "store secrets"
    - "skip tests"

checkpoints:
  - id: cp-001
    at: "2026-06-14T10:00:00Z"
    summary: "Started payment flow refactor. Extracted gateway abstraction."
    next_action: "Integrate Stripe SDK"
  - id: cp-002
    at: "2026-06-14T17:30:00Z"
    summary: "Stripe SDK integrated. Basic payment intent flow working."
    next_action: "Implement Stripe webhook handler for payment confirmation"
  - id: cp-003
    at: "2026-06-15T11:30:00Z"
    summary: "Implemented Stripe webhook handler with success and failure paths. Tests passing."
    decision: "Failed payments do NOT retry automatically — user must act. This resolves open question about retry behavior."
    next_action: "Implement order state machine update on successful payment"
  - id: cp-004
    at: "2026-06-15T15:00:00Z"
    summary: "Added cart validation. Empty cart or zero-total carts now blocked with clear error message."
    next_action: "Test the full happy path: cart → payment → order"
```

### Final health check

```bash
statuz status-keeper run
```

Expected:
```
✅ statuz.yaml: valid
✅ checkpoints: 4 (reasonably fresh)
✅ arrow-map.yaml: valid
✅ cluster.yaml: coherent
✅ niche-manifest.yaml: in sync with current work
```

### Final resume check

```bash
statuz resume .statuz/statuz.yaml
```

```
=== Statuz Resume ===
Agent:    frontend-dev
Project:  checkout-ui
Env:      local-dev

Status:   in_progress
Stage:    implementation
Task:     test full happy path: cart → payment → order
Last CP:  Added cart validation. Empty cart or zero-total carts now blocked with clear error message.
Next:     Test the full happy path: cart → payment → order
```

---

## What the NEXT agent sees

The next agent starting on this project runs `statuz resume` and immediately knows:
1. Stripe integration is done
2. Cart validation is done
3. The focus is now on integration testing the full flow
4. What the first test scenario should cover

Without Statuz, the next agent would need to read chat history, scan commit messages, and infer the state from diffs. With Statuz, the state is explicit and structured.

---

## What was recorded vs what was NOT recorded

**In statuz.yaml (compact status):**
- Task: "test full happy path: cart → payment → order"
- Decision: "Failed payments do NOT retry automatically"
- Progress summary: list of completed items
- Next action: specific enough to execute

**NOT in statuz.yaml (belongs elsewhere):**
- Full chat transcript
- Code diffs
- Test output
- Stripe API key
- Documentation for the webhook (that belongs in README.md or inline code comments)
- Design rationale for the gateway abstraction pattern (that belongs in design documents, not status)

The status file stays small and focused.
