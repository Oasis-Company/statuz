# @statuz/sdk-ts

TypeScript SDK for the Statuz AI Agent Runtime Status Protocol.

> **Statuz is a Runtime that keeps users, agents, projects, and niches in continuous Reality Synchronization.**

## Overview

This SDK provides TypeScript/JavaScript utilities for working with Statuz files and coordinating with the Signal Bus. It supports all four layers of the Statuz architecture:

- **Core** — Runtime status (who am I, what am I doing)
- **niche** — Ecological position declaration (what I do/don't do)
- **SYN** — Human governance (strategic decisions)
- **Arrow Map** — Topological relationships (who connects to whom)

## Installation

```bash
npm install @statuz/sdk-ts
```

## Quick Start

### Core: Read and Write Status

```typescript
import { Statuz } from "@statuz/sdk-ts";

// Load from file
const statuz = await Statuz.fromFile(".statuz/statuz.yaml");

// Update state
statuz.currentState.status = "in_progress";
statuz.currentState.task = "Implementing auth flow";

// Save back
await statuz.save();
```

### Niche: Declare Position

```typescript
import { NicheManifest } from "@statuz/sdk-ts";

// Load niche declaration
const niche = await NicheManifest.fromFile(".statuz/niche.yaml");

// Read declared boundaries
console.log(niche.declaredPosition.does);      // ["Process transactions", ...]
console.log(niche.declaredPosition.doesNot);   // ["Handle authentication", ...]

// Validate against schema
const result = niche.validate();
console.log(result.valid);  // true
```

### Arrow Map: Manage Topology

```typescript
import { ArrowMap } from "@statuz/sdk-ts";

// Load topology
const map = await ArrowMap.fromFile(".statuz/arrow-map.yaml");

// Query relationships
const dependencies = map.arrows.from("api-gateway").where({ type: "dependency" });

// Add new relationship
map.arrows.add({
  source: "api-gateway",
  target: "new-service",
  type: "dependency",
});

await map.save();
```

### Signal Bus: Coordinate with Other Agents

```typescript
import { CoordinationClient } from "@statuz/sdk-ts";

const client = new CoordinationClient({
  baseUrl: "http://localhost:7373",
});

// Register and start heartbeat
await client.register({
  agent_id: "my-agent",
  name: "My Agent",
  project: "my-project",
  capabilities: ["coding", "testing"],
});

// Send signal to another agent
await client.sendSignal({
  type: "task_complete",
  source: "my-agent",
  target: "frontend-agent",
  payload: { task: "API contract ready" },
});

// Poll for user directives
const directives = await client.pollUserSignals();
for (const directive of directives) {
  console.log(`User says: ${directive.content}`);
}
```

## API Reference

### Core Types

| Class | Purpose |
|-------|---------|
| `Statuz` | Core runtime status read/write |
| `Identity` | Agent identity |
| `CurrentState` | Current task and status |
| `Progress` | Completed and blocked items |
| `Checkpoint` | Event summaries |

### Niche Types

| Class | Purpose |
|-------|---------|
| `NicheManifest` | Ecological position declaration |
| `NicheSignal` | Environmental event |
| `NicheAssessment` | Relevance judgment |
| `NicheContext` | Collaboration payload |
| `NicheOutcome` | Result record |
| `NicheCalibration` | Drift proposal (declared vs. observed) |

### SYN Types

| Class | Purpose |
|-------|---------|
| `SynRequest` | Human escalation request |
| `SynResolution` | Human decision record |

### Arrow Map Types

| Class | Purpose |
|-------|---------|
| `ArrowMap` | Topology container |
| `StatuNode` | Node in topology |
| `Arrow` | Directed relationship |

### Signal Bus Types

| Class | Purpose |
|-------|---------|
| `CoordinationClient` | SDK wrapper for Signal Bus |
| `SignalBusClient` | Low-level HTTP client |

## Architecture

```
┌─────────────────────────────────────────┐
│         @statuz/sdk-ts                  │
├─────────────────────────────────────────┤
│  Core  │  Niche  │  SYN  │  Arrow Map  │
│  (YAML │  (YAML  │  (YAML│  (YAML      │
│   read/│   read/ │  read/│   read/     │
│   write)│  write)│ write)│  write)     │
├─────────────────────────────────────────┤
│      CoordinationClient                 │
│      (Signal Bus integration)           │
└─────────────────────────────────────────┘
```

## License

Apache-2.0
