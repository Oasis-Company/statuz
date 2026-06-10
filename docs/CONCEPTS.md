# Concepts

## Status

A compact description of the agent's present operational state.

## Identity

Who the agent is in a project or organization.

Examples:

- `dev-agent`
- `doc-agent`
- `research-agent`
- `creative-director-agent`

## Role

The responsibilities and boundaries attached to an identity.

A role is not just a name. It constrains behavior.

## Current state

The active phase, task, status, last checkpoint, and next action.

## Progress

What has been done, what remains open, and what is blocked.

## Relations

The agent's current connections to other agents, projects, tools, files, organizations, and products.

## Rules

Operational constraints that help the agent act safely and coherently.

## Checkpoint

A compact event summary used for recovery and handoff.

## Resume brief

A human-readable summary generated from Statuz at the start of a new session.

Example:

> You were implementing the Statuz API. The schema was drafted, but CLI validation was not finished. Next action: implement the validation command.

---

## Niche (Ecological Position)

A **declaration** of where the agent stands in the ecosystem.

**What niche is:**
- A living record of ecological position
- A declaration of boundaries (what I do / what I don't do)
- A statement of strategic bets
- A definition of success signals

**What niche is NOT:**
- A drift detection dashboard
- A monitoring system
- A dynamic metric

**Example:**
```yaml
declared_position:
  purpose: "Handle payment processing"
  does: ["Process transactions", "Manage state machines"]
  does_not: ["Handle authentication", "Store user profiles"]
```

**Key principle:** Niche is static until changed by SYN (human approval).

## Calibration (Drift Detection)

The **monitoring** layer that compares declared niche against observed behavior.

**What calibration is:**
- A drift detection system
- A comparison of declared vs. observed position
- A trigger for SYN escalation

**What calibration is NOT:**
- The niche itself
- A modification of boundaries
- A human decision

**Example:**
```yaml
drift_analysis:
  task_drift:
    metric: "task_alignment"
    observed: 0.32      # Actual deviation
    threshold: 0.25     # Declared tolerance
    description: "Agent spending 60% time on auth, not payment"
```

**Key principle:** Calibration detects drift but cannot modify niche. Modifications require SYN.

## SYN (Strategic Synchronization)

The **governance** layer for human escalation of strategic decisions.

**What SYN is:**
- A human escalation mechanism
- A structured decision process
- A record of accountability

**What SYN is NOT:**
- An automated calibration
- A self-approved boundary change
- A drift detection system

**Trigger:** SYN is triggered by Calibration when drift exceeds threshold, or by Agent judgment for strategic decisions.

**Example:**
```yaml
syn_request:
  type: "architectural_decision"
  summary: "Should auth be split from payment service?"
  options: [...]
  # Human decides, not automated
```

## Relationship Between Niche, Calibration, and SYN

```
┌─────────────────────────────────────────┐
│  niche (DECLARATION)                    │
│  "I am a payment service"               │
│  "I do NOT handle auth"                 │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Calibration (MONITORING)               │
│  "Observed: 60% time on auth"           │
│  "Declared: 0% time on auth"            │
│  "Drift: 0.42 > threshold 0.25"         │
│  "Trigger SYN"                          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  SYN (GOVERNANCE)                       │
│  "Should auth be split out?"            │
│  Human decides: "Yes"                   │
│  Resolution updates niche               │
└─────────────────────────────────────────┘
```

**Rule:** Only SYN can modify niche. Calibration detects but cannot change.
