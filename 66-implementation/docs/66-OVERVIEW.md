# 66 Overview: The Topological Shift

> **Status:** Design Phase  
> **Version:** 0.1.0-draft  
> **Last Updated:** 2026-06-06

---

## What is 66?

66 is not a version number. It is a **phase**.

Statuz began as a protocol for runtime status. Then it grew a layer for ecological positioning (niche). Now it is growing a third layer — one that sees organizations not as collections of objects, but as **topologies of relationships**.

This document describes that layer.

---

## The Four Layers

66 is not a replacement for niche. It is a **new abstraction layer** that sits above niche and Core, providing a topological view of the entire system.

```
┌─────────────────────────────────────────┐
│              66 (Arrow Maps)             │
│     Reusable, executable topologies      │
│     — The topological abstraction        │
├─────────────────────────────────────────┤
│              niche (1.0)                 │
│     Ecological positioning & signals     │
│     — The ecological abstraction         │
├─────────────────────────────────────────┤
│              Core (0.1)                  │
│     Runtime status & checkpoints         │
│     — The operational abstraction        │
├─────────────────────────────────────────┤
│           Project Files                  │
│     Code, configs, documentation         │
│     — The concrete reality               │
└─────────────────────────────────────────┘
```

### Layer 0: Project Files (Concrete Reality)

The actual files in your repository — code, configuration, documentation. This is what exists.

### Layer 1: Core (Operational Abstraction)

- **File:** `.statuz/statuz.yaml`
- **Answers:** Who am I? What am I doing? What is my current state?
- **Status:** Stable
- **Abstraction:** Lifts concrete project files into operational status

### Layer 2: niche (Ecological Abstraction)

- **Files:** `.statuz/niche/manifest.yaml`, `signals/`, `assessments/`, `contexts/`, `outcomes/`, `calibrations/`, `syn/`
- **Answers:** Where do I stand in the ecosystem? What changes affect me? When do I need human direction?
- **Status:** Working Draft
- **Abstraction:** Lifts operational status into ecological positioning

### Layer 3: 66 (Topological Abstraction) — NEW

- **Files:** Arrow Maps (stored independently, referenced by ID)
- **Answers:** What is the invisible architecture beneath my activity? What relationships make me possible? Can this topology be reused elsewhere?
- **Status:** Early Design (this document)
- **Abstraction:** Lifts ecological positioning into reusable topological patterns

**Key insight:** Each layer abstracts the one below it. 66 does not replace niche or Core — it **sees them from above** as nodes in a larger topology.



---

## Why "66"?

From the Manifesto:

> *Everything seeks a niche.*  
> *Every niche forms a topology.*  
> *Every topology can be mapped.*  
> *Every map can be shared.*  
> *Every shared map can evolve.*  
> *Statuz exists to make that evolution visible.*

66 is the principle that **relationships precede objects**. It is the shift from asking "What do we have?" to asking "How does it hold together?"

---

## Core Abstractions

### 1. Arrow

An Arrow is the atomic unit of 66. It is a directed edge with:

- **Source** — The originating StatuNode
- **Target** — The receiving StatuNode
- **Type** — The semantic meaning of the relationship
- **Properties** — Type-specific metadata
- **Weight** — Optional strength indicator
- **Temporal bounds** — When this arrow is active

Arrows are not passive annotations. They are **executable** — a `dependency` arrow means "if the target disappears, the source breaks." A `validation` arrow means "the source must approve changes to the target."

### 2. StatuNode

A StatuNode is any entity that participates in a topology. Types include:

| Type | Description | Example |
|------|-------------|---------|
| `project` | A bounded effort with deliverables | "Statuz CLI" |
| `component` | A subsystem or module | "Validation Engine" |
| `file` | A specific file or document | `statuz.schema.json` |
| `agent` | An AI system operating with Statuz | "Documentation Agent" |
| `person` | A human participant | "Alice (Tech Lead)" |
| `knowledge` | A body of understanding | "Arrow Map Design Patterns" |
| `resource` | A consumable asset | "AWS Compute Budget" |

Nodes have **identity** and **properties**, but their meaning emerges from their **connections**.

### 3. Arrow Map

An Arrow Map is a named, versioned collection of nodes and arrows. It is:

- **Portable** — Can be referenced by ID across projects
- **Instantiable** — Can be deployed to create a concrete topology
- **Comparable** — Can be diffed against other maps
- **Evolvable** — Has version history and migration paths

An Arrow Map is to organizational structure what a container image is to software deployment: a **reproducible blueprint**.

---

## Key Design Decisions

### Decision 1: Arrow Maps are Project-Independent

**An Arrow Map is not a project file. It is a shared, reusable topology definition.**

Arrow Maps live in a **global registry** (or local cache), not inside `.statuz/`. A project **references** an Arrow Map by ID and version:

```yaml
# .statuz/statuz.yaml
arrow_map:
  map_id: "niche:microservice-backend-v1"
  version: "1.0.0"
  instance_id: "my-project-backend"
```

This design enables:
- **Reusability:** Same topology across multiple projects
- **Evolution:** Update the map without breaking existing references
- **Comparison:** See how different projects instantiate the same niche
- **Sharing:** Publish maps to a registry (like container images)

Storage locations:
- **Global Registry:** `https://statuz.org/maps/` (public niche atlas)
- **Organization Registry:** Private registry for internal topologies
- **Local Cache:** `~/.statuz/maps/` (cached copies)
- **Project Override:** `.statuz/arrow-maps/` (project-specific extensions only)

### Decision 2: StatuNodes are Extensible

**The 7 built-in node types are a starting point, not a limitation.**

Custom node types follow the pattern `domain:type`:

```yaml
nodes:
  - id: "payment-service"
    type: "microservice:service"  # Custom domain type
    properties:
      service_mesh: "istio"
      circuit_breaker: true

  - id: "backend-team"
    type: "org:team"  # Custom organizational type
    properties:
      squad_size: 5
      reporting_line: "engineering"
```

The schema allows any string for `type`. Built-in types have predefined property structures, but custom types can define their own. This makes 66 adaptable to any domain.

### Decision 3: Arrows are Typed and Executable

Every arrow type has defined semantics:

- What does it mean when this arrow exists?
- What happens when the arrow is broken?
- What happens when the arrow is missing?

This makes Arrow Maps **actionable**, not just descriptive.

### Decision 4: Discovery Before Management

The system should discover arrows, not just store them. A **Detector** continuously asks:

- What depends on this?
- What creates value here?
- What consumes value here?
- What happens if this disappears?
- Who validates this?
- Which arrow is missing?

The purpose is **revelation**, not management.

### Decision 5: Minimal Disclosure

Arrow Maps follow the same minimal disclosure principle as niche:

- A node contains only what is needed for topology
- An arrow contains only what is needed for its type
- A map contains only the nodes and arrows relevant to its scope

---

## Integration with Existing Layers

### Core → 66

The `relations` field in `statuz.yaml` (agent_graph) is the seed of an Arrow Map. 66 formalizes and extends this:

```yaml
# statuz.yaml (existing)
relations:
  agent_graph:
    - from: "doc-agent"
      to: "dev-agent"
      type: "dependency"

# arrow-map.yaml (66) — stored in registry, referenced by project
arrows:
  - id: "arrow-001"
    source: "statuz:node:doc-agent"
    target: "statuz:node:dev-agent"
    type: "dependency"
    properties:
      reason: "Documentation depends on API signatures from dev-agent"
      criticality: "high"
```

### niche → 66

The niche manifest declares **what** an agent does. The Arrow Map shows **how** it connects to everything else:

```yaml
# niche/manifest.yaml (existing)
declared_position:
  does:
    - "Write and maintain documentation"
    - "Validate API documentation accuracy"

# Arrow Map (66) — stored in registry, referenced by project
nodes:
  - id: "doc-agent"
    type: "agent"
    properties:
      role: "Documentation Agent"
arrows:
  - source: "doc-agent"
    target: "api-spec"
    type: "validation"
  - source: "dev-agent"
    target: "doc-agent"
    type: "information_flow"
```

---

## Implementation Phases

### Phase 1: Schema Foundation

- Define `arrow.schema.json`
- Define `statu-node.schema.json`
- Define `arrow-map.schema.json`
- Create example YAML files
- **Status:** ✅ COMPLETED

### Phase 2: CLI Integration

- `statuz arrow-map init` — Create a new Arrow Map
- `statuz arrow-map validate` — Validate an Arrow Map
- `statuz arrow-map detect` — Run the detector to discover arrows
- `statuz arrow-map instantiate <map-id>` — Instantiate a map in current project (future)
- **Status:** ✅ CLI MVP COMPLETED

### Phase 3: Runtime Engine

- Arrow Map loader and resolver
- Arrow type semantic engine
- Dependency propagation
- Validation chain execution
- Missing arrow detection

### Phase 4: Visualization

- VS Code Extension: Arrow Map viewer
- Interactive topology exploration
- Arrow creation and editing
- Real-time sync with statuz.yaml

### Phase 5: Niche Genome

- Arrow Map registry / atlas
- Topology pattern recognition
- Niche template marketplace
- Cross-project topology comparison

---

## Open Questions

### Answered

1. ✅ **Arrow Map Storage:** Maps are stored in a global/local registry, referenced by ID. Projects do not own maps.
2. ✅ **Node Identity:** Simple IDs with namespace resolution. URIs optional for cross-registry references.
3. ✅ **StatuNode Extensibility:** Custom types allowed via `domain:type` pattern. Built-in types are conventions, not constraints.

### Still Open

4. **Circular Dependencies:** How should the engine handle circular arrow chains? (Flag? Allow? Break?)
5. **Arrow Weights:** Should weights be numeric (0.0–1.0) or categorical (critical/high/medium/low)? (Current: both supported)
6. **Temporal Arrows:** How do we model time-bound relationships (e.g., "this dependency exists only during Q3")?
7. **Multi-Map Composition:** How do we resolve conflicts when two extended maps define the same node differently?
8. **Custom Arrow Types:** Should users be able to define new arrow types beyond the 7 built-in ones?

---

## References

- [66 Manifesto](../66%20Manifesto.md) — The foundational vision
- [NICHE_MANIFEST.md](../docs/NICHE_MANIFEST.md) — The niche technical charter
- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) — The four implementation levels
- [SPEC.md](../SPEC.md) — The core protocol specification

---

> *"Traditional software organizes objects. Statuz organizes relationships."*
>
> — 66 Manifesto
