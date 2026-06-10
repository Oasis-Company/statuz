# ADR 0003: Protocol Boundaries - Statuz vs MCP vs A2A

Date: 2026-05-30  
Status: Accepted

## Context

As Statuz evolves, it needs to clearly define its position relative to other emerging protocols:

1. **MCP (Model Context Protocol)**: A protocol for tools and local state access
2. **A2A (Agent-to-Agent)**: A future protocol for cross-agent communication and task handoff
3. **Statuz**: A protocol for situated alignment and agent runtime status

Without clear boundaries, Statuz could be mistaken for:
- A replacement for MCP
- A replacement for A2A
- A transport protocol
- A messaging protocol

## Decision

Statuz defines **semantics, not transport**. It focuses on **what to communicate, not how to communicate it**.

### What Statuz IS

1. **Situated Alignment Semantics**
   - Defines what "ecological position" means
   - Defines what a "signal", "assessment", "context", "outcome", and "calibration" are
   - Defines how SYN (human synchronization) requests should be structured

2. **YAML-First File Format**
   - Human-readable, machine-verifiable
   - Persistent, version-controllable
   - Follows ADR 0002

3. **Shared Reference Point**
   - Agents can read/write Statuz files to understand their position
   - Agents can exchange niche context objects to collaborate

### What Statuz IS NOT

1. **NOT a Transport Protocol**
   - Does not define how messages move between agents
   - Does not define network protocols
   - Does not define message queues or event buses

2. **NOT a Replacement for MCP**
   - MCP provides tool access and local file operations
   - Statuz can be accessed through MCP tools (read statuz, write checkpoint, etc.)
   - MCP is complementary, not competitive

3. **NOT a Replacement for A2A**
   - A2A (when defined) will handle cross-agent communication and task handoff
   - Statuz can be the payload carried by A2A
   - A2A transports niche context, Statuz defines what niche context means

### How Statuz Works WITH MCP

MCP is the **local access layer** for Statuz:
- MCP tools can read `statuz.yaml` files
- MCP tools can write checkpoints and update status
- MCP tools can validate Statuz files
- MCP provides the "how", Statuz provides the "what"

**Example flow:**
```
Agent ── MCP ──> Read statuz.yaml (local file)
Agent <───┘
   │
   └── Uses Statuz semantics to understand current position
```

### How Statuz Works WITH A2A (Future)

A2A is the **cross-agent transport layer** for Statuz:
- A2A will move niche context objects between agents
- A2A will handle task handoff semantics
- Statuz defines what the niche context actually means

**Example flow:**
```
Agent A ── A2A ──> Send niche context to Agent B
Agent A <───┘
   │
   └── Statuz defines what "niche context" is and why it's relevant
```

## Hard Rules (Non-Negotiable)

The following rules are **project hard constraints**. They override any feature request, deadline pressure, or individual preference. Violating these rules requires an ADR amendment approved by the project principal.

### Rule 1: Statuz Is NOT a Transport Protocol — EVER

**Statement:** Statuz will never implement message transport, network protocols, message queues, or event buses.

**Rationale:** Transport is a solved problem with dedicated protocols. Statuz's value is in semantics. Building transport would bloat the protocol, dilute focus, and compete with better-funded efforts.

**Enforcement:**
- No transport-related code in `packages/sdk-ts` core
- No message queue implementations in protocol packages
- Signal Bus (`packages/signal-bus`) is explicitly a **companion infrastructure**, not part of the Statuz protocol
- Any PR adding transport logic to core packages is rejected automatically

### Rule 2: Statuz Is NOT a Replacement for MCP

**Statement:** Statuz will never replace, duplicate, or compete with MCP (Model Context Protocol).

**Rationale:** MCP provides tool access and local file operations. Statuz provides runtime status semantics. They are complementary layers.

**Enforcement:**
- MCP tools in `packages/mcp-server` are the **only** MCP integration point
- No MCP server implementation in other packages
- No MCP protocol re-implementation in Statuz code
- Statuz can be accessed **through** MCP, never **instead of** MCP

### Rule 3: Statuz Is NOT a Replacement for A2A — A2A Compatibility Is RESERVED, Not Implemented

**Statement:** Statuz will never implement the A2A (Agent-to-Agent) protocol. A2A compatibility fields (`a2a_compatible`, `a2a_agent_card`) are **reserved placeholders only** and must remain dormant until A2A reaches stable 1.0.

**Rationale:**
- A2A is not yet mature (no stable 1.0 as of 2026-06-10)
- Implementing against a moving target guarantees rework
- Statuz's niche/SYN/Arrow Map subsystems are at 15-40% usability — these are the priority
- Signal Bus already provides HTTP/JSON for cross-agent communication

**Enforcement:**
- `a2a_compatible` and `a2a_agent_card` fields may exist in types/schemas but must not be used in any logic
- No A2A protocol implementation in any package
- No A2A task handshake, agent card serving, or task negotiation code
- A2A integration may only be reconsidered after ALL subsystems reach >80% usability AND A2A 1.0 is published
- Any PR implementing A2A protocol logic is rejected automatically

### Rule 4: Priority Hierarchy Is Immutable

**Statement:** Subsystem usability takes absolute priority over protocol compatibility features.

**Current priority order (highest to lowest):**
1. Core 0.1 stability (current: ~90%)
2. Signal Bus infrastructure (current: ~60%)
3. Arrow Map usability (current: ~40%)
4. niche usability (current: ~15%)
5. SYN usability (current: ~20%)
6. VS Code extension polish
7. **A2A compatibility (FROZEN until further notice)**

**Enforcement:**
- No work on priority N+1 until priority N reaches >80% usability
- Usability measured by the Production Readiness Plan checklist tiers
- Any request to bump A2A above frozen priority requires project principal approval

## Consequences

1. **Statuz remains focused**
   - Doesn't bloat with transport concerns
   - Doesn't re-invent MCP or A2A

2. **Clear integration points**
   - MCP for local access
   - A2A for cross-agent transport (future, when mature)
   - Statuz for the semantics

3. **Implementation flexibility**
   - MCP servers can provide Statuz tools without needing to understand niche deeply
   - A2A can carry Statuz objects without needing to parse them (when implemented externally)

4. **Future-proofing**
   - If MCP or A2A evolve, Statuz semantics stay stable
   - Can adopt new transports without changing core protocol
   - Hard rules prevent scope creep during pressure
