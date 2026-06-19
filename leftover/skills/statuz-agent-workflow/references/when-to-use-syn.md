# When to Escalate to SYN

SYN = "Strategic Synchronization" = a human being needs to decide.

**The golden rule:** If in doubt, propose. The cost of asking is low. The cost of getting it wrong is high.

---

## The Decision Tree

```
  Is this change...
  │
  ├─▶ Everyday implementation detail (fixing a bug, adding a feature already in scope)
  │     │
  │     └─▶ NO SYN NEEDED. Work, write checkpoint, continue.
  │
  ├─▶ Changing the project's niche or boundaries?
  │     │
  │     └─▶ YES — SYN proposal to modify niche-manifest.yaml
  │
  ├─▶ Adding a new project to the cluster?
  │     │
  │     └─▶ YES — statuz agent discover → SYN proposal
  │
  ├─▶ Adding an arrow (relationship) to the Arrow Map?
  │     │
  │     └─▶ YES — SYN proposal for arrow-map modification
  │
  ├─▶ Architectural decision with multiple valid options and lasting consequences?
  │     │
  │     └─▶ YES — SYN request with options and pros/cons
  │
  ├─▶ Calibration drift detected above threshold?
  │     │
  │     └─▶ YES — escalate to SYN (auto-triggered by calibration engine)
  │
  └─▶ Something that affects another team's project?
        │
        └─▶ YES — SYN proposal (they may not appreciate you changing their boundaries)
```

---

## Detailed Triggers

### Trigger 1: Niche boundary crossing

**When:** You discover the project needs to do something outside its declared `does_not` list.

**Example:**
- Niche manifest says: "does_not: user authentication"
- You are implementing: "Add JWT token validation in frontend"
- This crosses the boundary: This is user authentication functionality

**What to do:**
```bash
# 1. Note the drift:
# "Current work involves authentication — niche declares does_not include auth"

# 2. Generate SYN proposal:
statuz syn request \
  --source frontend-dev \
  --summary "Need to implement JWT validation but niche says does_not:auth" \
  --option "Expand niche to include auth|simpler but expands scope" \
  --option "Delegate auth to auth-service|keeps niche clean but adds dependency" \
  --recommendation "Delegate auth to auth-service for cleaner separation" \
  --evidence-window "Niche manifest says auth is out of scope but implementation requires it"
```

---

### Trigger 2: New project discovery

**When:** The user mentions, or you discover, a project that is not in the cluster.

**Example:**
- You are working on `frontend`
- User says: "And by the way there's also the analytics service that frontend calls"
- `cluster.yaml` has no `analytics` entry
- Arrow Map has no `analytics→` arrow

**What to do:**
```bash
statuz agent discover ./analytics --cluster ../cluster.yaml
# This generates a SYN proposal at .statuz/syn/proposal-xxx.yaml
# Then present to user:
# "I found analytics service. Should we add it to the cluster?"
# User approves → cluster.yaml updated + .statuz/statuz.yaml created for analytics
```

See `examples/discovery-example.md` for a full walkthrough.

---

### Trigger 3: New arrow (relationship)

**When:** You discover that project A now depends on project B, but this relationship is not reflected in either project's Arrow Map or in the cluster.

**Example:**
- Frontend starts calling an analytics endpoint that didn't exist before
- `cluster.yaml` has no `frontend→analytics` arrow
- `frontend/arrow-map.yaml` has no `analytics` dependency node

**What to do:**
```bash
statuz syn request \
  --source frontend-dev \
  --summary "Frontend now calls analytics service" \
  --option "Add analytics→frontend arrow|reflects reality" \
  --recommendation "Add arrow to capture the relationship" \
  --calibration-id cal-003
```

---

### Trigger 4: Architectural decision

**When:** Multiple valid approaches exist and the choice has lasting consequences.

**Example:**
- "Use REST vs GraphQL for new API
- "Store state in database vs in-memory cache"
- "Split service into two vs keep monolithic"

**What to do:**
```bash
statuz syn request \
  --source frontend-dev \
  --summary "Design decision: REST vs GraphQL for new order status API" \
  --option "REST|simpler, well-understood, less tooling needed" \
  --option "GraphQL|more flexible for future query patterns, more complex" \
  --recommendation "REST for now — simpler, sufficient for use case"
```

---

### Trigger 5: Calibration drift

**When:** `statuz calibration check` reports drift exceeding the declared threshold.

**This is auto-triggered by the calibration engine. You do NOT manually propose.

**What happens:**
1. Calibration engine reads niche-manifest.yaml
2. Analyzes checkpoint summaries against does/does_not
3. Computes drift score
4. If drift > threshold: generates SYN proposal

---

## What NOT to SYN

### ❌ Everyday implementation decisions
"Should this variable be named `cart` or `shoppingCart`?" → NO SYN. Just pick one. Write checkpoint.

### ❌ Bug fixes
"Fix NPE in payment handler" → NO SYN. Fix bug. Write checkpoint mentioning the fix.

### ❌ Code quality work
"Refactor for better testability" → NO SYN. Do it.

### ❌ Task execution matching declared niche
Everything inside the niche's `does` list → NO SYN.

### ❌ Documentation improvements
"Write README for the API" → NO SYN.

---

## The SYN proposal format

A good SYN proposal contains:

1. **What:** A one-line summary of what is proposed
2. **Why:** Why this is needed (evidence, context)
3. **Options:** The possible decisions (for requests)
4. **Recommendation:** Your recommendation (for requests)
5. **Impact:** What will change if approved (for proposals)

For discover-generated proposals, the format is already structured for you.

---

## After SYN: What changes

### If approved:
- cluster.yaml updates: new maps + arrows
- New projects get `.statuz/statuz.yaml` initialized
- niche-manifest.yaml updates (for niche changes)
- All affected files validated

### If rejected:
- Nothing changes in the cluster or statuz files
- The proposal is marked as rejected
- The agent continues with the previous scope

The agent must respect the rejection. It may generate a new proposal with different reasoning, but cannot bypass the human decision.

---

## Rule of Thumb

**When you find yourself wondering "should I SYN this?" — ask:**

> If another agent working on a different project would care about this decision → SYN it.

> If this decision would surprise the maintainers of related projects → SYN it.

> If this decision changes what "this project does" → SYN it.

> Otherwise → write checkpoint and keep going.
