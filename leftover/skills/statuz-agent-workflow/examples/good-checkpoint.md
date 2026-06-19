# Good vs Bad Checkpoints

The checkpoint is the most important construct in Statuz. It is the handoff point between one agent session and the next.

A good checkpoint answers: **What did I do? What did I decide? What should the next person do?**

A bad checkpoint gives the next agent zero useful information.

---

## The Anatomy of a Good Checkpoint

```yaml
- id: cp-007
  at: "2026-06-15T14:30:00Z"
  summary: "Implemented Stripe webhook handler. Tests passing for success and failure paths."  # What
  decision: "Failed payments do NOT retry. User must act."  # Decision
  next_action: "Test full happy path integration: cart → payment → order"  # Next
```

| Field | Purpose | Essential? |
|-------|---------|-----------|
| `summary` | What was accomplished | ✅ |
| `next_action` | What should happen next | ✅ |
| `decision` | Key decision made (if any) | Optional but very valuable |
| `at` | ISO 8601 timestamp | Auto-generated |
| `id` | cp-00N sequential | Auto-generated |

---

## Comparison: Good vs Bad

### ❌ Bad: No information

```yaml
- id: cp-007
  at: "2026-06-15T14:30:00Z"
  summary: "worked on stuff"
```

**Why it's bad:** The next agent has no idea what was done, what state things are in, or what to do next. Worse than useless — it wastes the next agent's time.

---

### ❌ Bad: Too verbose (status file becomes memory)

```yaml
- id: cp-007
  at: "2026-06-15T14:30:00Z"
  summary: |
    User asked me to implement the webhook handler for Stripe. I created
    src/payments/webhook-handler.ts. Initially I thought about using the
    `stripe.webhooks.constructEvent` helper but realized we need request
    body validation. Then I had to update the .env.example file with the
    signing secret. Also I noticed the previous handler didn't handle the
    async case properly so I refactored it to properly await... [continues for 50 lines]
  next_action: "keep going with testing"
```

**Why it's bad:** It's a chat transcript in YAML form. The next agent doesn't need a narrative. They need: "what is the state of things, and what do I do next?" Also, the `next_action` is vague.

---

### ❌ Bad: Vague next_action

```yaml
- id: cp-007
  at: "2026-06-15T14:30:00Z"
  summary: "Implemented Stripe webhook handler"
  next_action: "continue work"
```

**Why it's bad:** "continue work" gives the next agent zero guidance. They have to re-derive what "work" means from scratch.

---

### ✅ Good: Clear and action-oriented

```yaml
- id: cp-007
  at: "2026-06-15T14:30:00Z"
  summary: "Implemented Stripe webhook handler (payment_intent.succeeded and .failed). Tests passing."
  decision: "Failed payments do NOT retry automatically — user must act. Resolves open question from cp-005."
  next_action: "Write integration test for full happy path: cart → payment → order"
```

**Why it's good:**
- `summary` tells you exactly what was done and its scope
- `decision` captures an architectural choice with context (resolves prior question)
- `next_action` is specific enough that another agent could start executing immediately without reading chat history

---

### ✅ Good: Blocked state communicated clearly

```yaml
- id: cp-008
  at: "2026-06-15T16:00:00Z"
  summary: "Wrote integration test scaffold but cannot run it — backend order endpoint is not yet deployed."
  next_action: "Wait for backend to deploy /order endpoint, then re-run integration tests."
```

**Why it's good:** The next agent doesn't waste time trying to run tests that will fail. They know they are waiting on something external.

**Also, in the main status file:**
```yaml
current_state:
  status: blocked   # ← critical — tells the agent to NOT proceed without resolving this
  task: "test full happy path"
```

---

### ✅ Good: Task pivot

```yaml
- id: cp-009
  at: "2026-06-15T17:30:00Z"
  summary: "Switching from Stripe integration to cart validation per user request. Stripe webhook handler (cp-007) is done and tested."
  next_action: "Implement cart quantity > 0 and total > 0 validation before payment flow."
```

**Why it's good:** The checkpoint explicitly notes the task pivot. The next agent reading cp-009 can see: (a) Stripe work is concluded, (b) we've moved on to cart validation.

**Also updated in the main status file:**
```yaml
current_state:
  task: "cart validation before payment"  # ← updated
  last_checkpoint: cp-009
```

---

## When NOT to Write a Checkpoint

Writing too many checkpoints is as bad as writing too few. Each checkpoint should mark a meaningful boundary.

**Write a checkpoint when:**
- You complete a discrete, meaningful unit of work
- You make a decision with lasting consequences
- You discover something that changes the plan
- You are about to stop working (end of session)
- You are about to hand off to someone else
- The user asks for a status update

**Do NOT write a checkpoint for:**
- A one-line bug fix
- Fixing a typo
- Every commit you make
- Every message exchange

**Good guideline:** Aim for 1-3 checkpoints per hour of focused work. If you are writing more than that, you are probably being too granular. If you are writing less than one per 4 hours, you are probably not capturing enough context for the handoff.

---

## Writing Checkpoints via CLI vs by Hand

### Via CLI (recommended):

```bash
statuz checkpoint .statuz/statuz.yaml \
  --summary "Implemented Stripe webhook handler. Tests passing." \
  --decision "Failed payments do NOT retry automatically." \
  --next "Write integration test for full happy path."
```

Benefits:
- Auto-generates sequential `cp-00N` IDs
- Auto-updates `updated_at` timestamp
- Auto-updates `current_state.last_checkpoint`
- Schema-validated YAML

### By hand (only when CLI is unavailable):

1. Find the last checkpoint in `checkpoints[]`
2. Increment the `id` by 1 (cp-007 → cp-008)
3. Add your entry with current timestamp
4. Update `current_state.last_checkpoint` to your new id
5. Update `updated_at` to now
6. **Run `statuz validate .statuz/statuz.yaml` to confirm**

Never edit by hand without validating afterward.
