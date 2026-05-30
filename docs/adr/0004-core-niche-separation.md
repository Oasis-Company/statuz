# ADR 0004: Core/niche Layering Principle

Date: 2026-05-30  
Status: Accepted

## Context

Statuz is growing beyond the original "runtime status" concept. We're adding:
- Ecological positioning (niche)
- Signal/assessment flow
- Calibration and drift detection
- Human synchronization (SYN)

Without clear layering, we risk:
- Making Core too bloated
- Raising the barrier to adoption
- Confusing users about what's essential vs optional

## Decision

Statuz maintains a **two-layer architecture** with clear separation:

---

## Layer 1: Statuz Core (Stable, Minimal, Required)

### What goes into Core

Core is the **minimal subset** that every Statuz user must understand and adopt.

Core is for **runtime status only**:
- `statuz_version`: Protocol version
- `updated_at`: Last update timestamp
- `identity`: Who am I (agent name, project name)
- `role`: My role (optional)
- `goal`: What I'm trying to achieve (optional)
- `current_state`: Status (idle, in_progress, blocked, waiting_for_user, completed)
- `progress`: How much done (0-1 or percentage)
- `relations`: Relationships to other agents (optional)
- `rules`: Constraints and boundaries (optional)
- `checkpoints`: Array of checkpoints for progress tracking

### Core principles

1. **Small enough to read at a glance**
   - A developer should understand the full schema in < 5 minutes
   - A human should be able to read and understand a `statuz.yaml` file quickly

2. **Backward compatibility guaranteed**
   - Breaking changes only at major version boundaries
   - Clear migration paths

3. **YAML-first, file-based**
   - Follows ADR 0002
   - No network dependencies required for Core

4. **Works standalone**
   - You don't need niche to use Core
   - You don't need SYN to use Core

---

## Layer 2: niche (Optional, Experimental, Standards-Track)

### What goes into niche

niche is the **ecological positioning layer** for agents who need it.

niche adds:
- `niche/manifest.yaml`: Declared position (what I say I do)
- `niche/signals/`: Environmental events (what happened)
- `niche/assessments/`: Relevance judgments (does it affect me?)
- `niche/contexts/`: Collaboration payloads (what collaborators need)
- `niche/outcomes/`: Result records (what happened)
- `niche/calibrations/`: Drift proposals (evidence-based adjustments)
- `niche/syn/`: Human synchronization requests and resolutions

### niche principles

1. **Optional**
   - Users can adopt Core without niche
   - niche is opt-in

2. **Builds on Core**
   - niche never replaces or breaks Core
   - niche references Core but doesn't require changes to it

3. **Living specification**
   - Can evolve faster than Core
   - "Working Draft" status means we can adjust based on feedback

4. **Human-in-the-loop by design**
   - SYN ensures humans stay in control of strategy
   - Calibration requires explicit approval for strategic changes

---

## Core vs niche - What Goes Where?

| Feature | Layer | Rationale |
|---------|-------|-----------|
| Current agent status | Core | Essential for every agent |
| Checkpoints | Core | Essential for task handoff |
| Ecological position declaration | niche | Optional, advanced feature |
| Signal processing | niche | Optional, advanced feature |
| Relevance assessment | niche | Optional, advanced feature |
| Calibration proposals | niche | Optional, advanced feature |
| SYN (human sync) | niche | Optional, advanced feature |
| Role | Core (optional) | Simple, fits in Core |
| Rules | Core (optional) | Simple, fits in Core |
| Relations | Core (optional) | Simple, fits in Core |

---

## Compatibility & Interaction

### How niche uses Core

niche can reference Core files:
- A `niche/assessment` can reference the current `current_state` from Core
- A `niche/context` can reference the agent's `identity` from Core
- A `niche/calibration` can reference checkpoints from Core as evidence

### Core remains unaware of niche

Core doesn't know niche exists:
- Core schema never mentions niche concepts
- Core validation never requires niche files
- Core tools work fine without niche

### Directory structure

```
.statuz/
├── statuz.yaml          ← Core (always present)
└── niche/               ← niche (optional)
    ├── manifest.yaml
    ├── signals/
    ├── assessments/
    ├── contexts/
    ├── outcomes/
    ├── calibrations/
    └── syn/
```

---

## Consequences

### Good

1. **Low barrier to adoption**
   - New users start with simple Core
   - Can learn niche later when needed

2. **Stable foundation**
   - Core changes slowly and carefully
   - Backward compatibility maintained

3. **Clear upgrade path**
   - Users can adopt niche incrementally
   - No big bang required

4. **Reduced scope creep risk**
   - "Does this belong in Core?" becomes a clear check

### Bad/Careful

1. **Some duplication**
   - Identity/position information appears in both Core and niche manifest
   - But they serve different purposes: Core = current status, niche manifest = declared position

2. **Documentation must be clear**
   - Need to explain clearly what's Core vs niche
   - Need to show both simple (Core-only) and advanced (Core+niche) examples
