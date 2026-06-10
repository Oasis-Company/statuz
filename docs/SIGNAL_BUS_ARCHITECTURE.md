# Signal Bus Architecture

> **Companion infrastructure for Statuz** — Not part of the protocol itself

## Overview

The Signal Bus provides HTTP-based transport infrastructure for multi-agent coordination. It complements the Statuz protocol by enabling:

- Agent registration and heartbeat
- Signal broadcasting and routing
- Agent discovery through Arrow Maps
- User-to-agent backflow (the missing sync loop half)

## Design Principles

1. **HTTP-first**: Simple, universal, firewall-friendly
2. **File-persistent registry**: Agent state survives restarts
3. **Arrow Map discovery**: Topological awareness drives coordination
4. **Backflow completes the loop**: Users can signal agents directly

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Signal Bus Cluster                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        HTTP API Layer                             │  │
│  │                                                                   │  │
│  │   POST /register     GET /agents     POST /signals               │  │
│  │   POST /heartbeat    GET /agents/:id  GET /signals               │  │
│  │   DELETE /agents/:id                 POST /backflow              │  │
│  │                                        GET /backflow/:id        │  │
│  │                                        GET /discover            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │                                 │                                 │  │
│  │  ┌─────────────┐   ┌────────────┼────────────┐   ┌────────────┐  │  │
│  │  │   Agent     │   │           │            │   │  Channel    │  │  │
│  │  │  Registry   │◄──┤           │            ├──►│  Manager    │  │  │
│  │  └──────┬──────┘   │           │            │   └────────────┘  │  │
│  │         │          │           │            │                   │  │
│  │         │          │    ┌──────┴──────┐     │                   │  │
│  │         │          │    │  Discovery  │     │                   │  │
│  │         │          │    │  (4-Rule)    │     │                   │  │
│  │         │          │    └──────┬──────┘     │                   │  │
│  │         │          │           │            │                   │  │
│  │         │          │           │            │                   │  │
│  │         ▼          │           ▼            │                   │  │
│  │  ┌─────────────┐   │   ┌─────────────────┐ │   ┌────────────┐  │  │
│  │  │  Backflow   │◄──┘   │   Agent         │◄┘   │  Signals   │  │  │
│  │  │  Engine     │       │   Directory     │     │  Storage   │  │  │
│  │  └─────────────┘       └─────────────────┘     └────────────┘  │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│  ┌─────────────────────────────────┼────────────────────────────────┐  │
│  │                    Persistence Layer                              │  │
│  │                                                                   │  │
│  │   agents.json     channels.json     backflow.json               │  │
│  │                                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Agent Registry

- **Purpose**: Track registered agents and their status
- **Features**:
  - In-memory Map for fast access
  - Optional JSON file persistence
  - Heartbeat timeout detection
  - Auto-status updates (online/offline)

**Data Model**:
```typescript
interface AgentRecord {
  id: string;
  name: string;
  project: string;
  status: 'online' | 'offline' | 'busy' | 'idle';
  capabilities: string[];
  arrow_maps: string[];
  last_heartbeat: string;
}
```

### 2. Channel Manager

- **Purpose**: Route signals to appropriate subscribers
- **Retention Policies**:
  - `ephemeral`: 1 minute (transient signals)
  - `short`: 5 minutes (recent signals)
  - `persistent`: No expiry (important signals)

**Default Channels**:
- `default`: General signals
- `user-backflow`: User to agent
- `agent-broadcast`: Cross-agent broadcasts

### 3. Agent Discovery (4-Rule Engine)

Priority-based discovery matching Statuz philosophy:

| Priority | Rule | Use Case |
|----------|------|----------|
| 1 | Arrow Map | Primary discovery — "Who shares my topology?" |
| 2 | Project | "Who works on the same project?" |
| 3 | Capability | "Who can do X?" |
| 4 | Static/ID | Direct lookup |

```typescript
// Primary discovery through Arrow Map
const result = discovery.discover({
  arrow_map: 'niche:backend-v1',
});
// Returns all agents sharing this Arrow Map
```

### 4. Backflow Engine

**The missing half of the sync loop.**

Statuz focuses on agent→user communication (SYN triggers). Backflow enables user→agent communication:

```typescript
// User sends directive to agent
backflow.submitDirective(
  'agent-1',
  'Switch to testing mode',
  'user@example.com'
);

// Agent polls for pending directives
const directives = backflow.poll('agent-1', { type: 'directive' });
```

**Backflow Types**:
- `directive`: High-priority command (priority 100)
- `query`: Medium-priority question (priority 50)
- `notification`: Low-priority info (priority 25)
- `escalation`: Critical issues (priority 100)

## Signal Flow

### Agent Registration Flow

```
Agent                          Signal Bus
  │                                 │
  │──── POST /register ────────────►│
  │     { agent_id, name, ... }     │
  │                                 │──► Store in Registry
  │                                 │──► Subscribe to default channel
  │◄─── { agent, channel } ─────────│
  │                                 │
  │──── POST /heartbeat ───────────►│ (every 60s)
  │     (keep alive)                │
```

### Signal Broadcasting Flow

```
Agent A                         Signal Bus                       Agent B
  │                                 │                                 │
  │──── POST /signals ─────────────►│                                 │
  │     { type, payload, ... }      │                                 │
  │                                 │──► Store in channel              │
  │                                 │──► Broadcast to subscribers ─────►│
  │                                 │                                 │
```

### Discovery Flow

```
Agent                           Signal Bus
  │                                 │
  │──── GET /discover ─────────────►│
  │     ?arrow_map=niche:v1         │
  │                                 │──► Query Registry
  │                                 │──► Match by Arrow Map
  │◄─── { agents: [...] } ──────────│
  │                                 │
```

### Backflow Flow

```
User                            Signal Bus                       Agent
  │                                 │                                 │
  │──── POST /backflow ────────────►│                                 │
  │     { agent_id, type, content } │                                 │
  │                                 │──► Store in agent queue          │
  │◄─── { id, priority } ──────────│                                 │
  │                                 │                                 │
  │                                 │◄─── GET /backflow/:id ───────────│
  │                                 │     (poll for signals)          │
  │                                 │──► Return pending signals        │
  │                                 │                                 │
```

## HTTP API Reference

### Registration

```
POST /register
{
  "agent_id": "agent-1",
  "name": "Backend Agent",
  "project": "api-service",
  "capabilities": ["database", "api"],
  "arrow_maps": ["niche:backend-v1"]
}

Response: 201 Created
{
  "registered": true,
  "agent": { ... },
  "channel": "default"
}
```

### Signals

```
POST /signals
{
  "type": "task_update",
  "source": "agent-1",
  "payload": { "task": "build API", "status": "done" },
  "channel": "default"
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "sig-123456",
    "timestamp": "2026-06-08T10:00:00Z",
    ...
  }
}
```

### Discovery

```
GET /discover?arrow_map=niche:backend-v1

Response: 200 OK
{
  "success": true,
  "data": {
    "agents": [
      { "id": "agent-1", "name": "Backend Agent", ... },
      { "id": "agent-2", "name": "DB Agent", ... }
    ],
    "method": "arrow_map",
    "query": { "arrow_map": "niche:backend-v1" }
  }
}
```

### Backflow

```
POST /backflow
{
  "agent_id": "agent-1",
  "type": "directive",
  "content": "Switch to testing mode",
  "from": "user@example.com",
  "priority": 100
}

Response: 201 Created
{
  "success": true,
  "data": {
    "id": "backflow-789",
    "agent_id": "agent-1",
    "priority": 100,
    ...
  }
}
```

## CLI Usage

```bash
# Start a local signal bus (in production)
# Note: This is the server component, not part of CLI

# From a connected agent:
statuz bus health              # Check server status
statuz bus agents              # List all agents
statuz bus agents --status online

statuz bus register --id my-agent --name "My Agent" --project my-project

statuz bus discover --arrow-map niche:v1
statuz bus discover --project backend
statuz bus discover --capability coding

statuz bus signal --type update --source my-agent --channel default

statuz bus backflow --agent my-agent --type directive --content "Do X" --from user
```

## Integration with SDK

```typescript
import { CoordinationClient } from '@statuz/sdk-ts';

const client = new CoordinationClient({
  baseUrl: 'http://localhost:7373',
});

// Register and start heartbeat
await client.register({
  agent_id: 'my-agent',
  name: 'My Agent',
  project: 'my-project',
  capabilities: ['coding'],
  arrow_maps: ['niche:v1'],
});

// Send signals
await client.sendSignal({
  type: 'task_complete',
  source: 'my-agent',
  payload: { task: 'build feature X' },
});

// Poll user directives
const directives = await client.pollUserSignals();
for (const directive of directives) {
  console.log(`Directive from ${directive.from}: ${directive.content}`);
}
```

## Limitations & Future Work

### Phase 1 (Current)
- HTTP-only transport
- Single-server deployment
- In-memory signal storage
- Basic discovery

### Phase 2 (Planned)
- WebSocket support for real-time
- Multi-server clustering
- Persistent signal storage (PostgreSQL)
- Pattern-based discovery

### Phase 3 (Future)
- A2A protocol compatibility
- Signal encryption
- Load balancing
- Service mesh integration

## Glossary

| Term | Definition |
|------|------------|
| Signal | Message sent through a channel |
| Backflow | User-to-agent signal (completes sync loop) |
| Arrow Map | Topological description of agent relationships |
| Discovery | Finding agents based on criteria |
| Heartbeat | Periodic signal to indicate agent is alive |
| Channel | Named pipe for signal routing |
| Registry | Agent directory with status tracking |

## Related Documents

- [Statuz Protocol Specification](../SPEC.md)
- [66 Manifesto](../66%20Manifesto.md)
- [SDK TypeScript](../packages/sdk-ts/README.md)
- [CLI Documentation](../packages/cli/README.md)
