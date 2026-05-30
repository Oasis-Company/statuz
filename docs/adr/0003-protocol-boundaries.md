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

## Consequences

1. **Statuz remains focused**
   - Doesn't bloat with transport concerns
   - Doesn't re-invent MCP or A2A

2. **Clear integration points**
   - MCP for local access
   - A2A for cross-agent transport
   - Statuz for the semantics

3. **Implementation flexibility**
   - MCP servers can provide Statuz tools without needing to understand niche deeply
   - A2A can carry Statuz objects without needing to parse them

4. **Future-proofing**
   - If MCP or A2A evolve, Statuz semantics stay stable
   - Can adopt new transports without changing core protocol
