# @statuz/signal-bus

**Signal Bus companion infrastructure for Statuz.**

HTTP-based signal transport, agent registry, discovery, and backflow management.

> **Note**: This is NOT part of the Statuz protocol. It's companion infrastructure for signal transport and multi-agent coordination.

## Installation

```bash
npm install @statuz/signal-bus
```

## Quick Start

### Start a Signal Bus Server

```typescript
import { SignalBusServer } from '@statuz/signal-bus';

const server = new SignalBusServer({ port: 7373 });
await server.start();

console.log('Signal Bus running at http://localhost:7373');
```

### Use the Client

```typescript
import { SignalBusClient } from '@statuz/signal-bus';

const client = new SignalBusClient({ baseUrl: 'http://localhost:7373' });

// Register an agent
const agent = await client.register({
  agent_id: 'my-agent',
  name: 'My Agent',
  project: 'my-project',
  capabilities: ['coding', 'testing'],
  arrow_maps: ['niche:v1'],
});

// Send a signal
await client.sendSignal({
  type: 'task_update',
  source: 'my-agent',
  payload: { status: 'completed', task: 'build feature X' },
  channel: 'default',
});

// Discover agents
const teammates = await client.discover({
  arrow_map: 'niche:v1',
});
```

### Use with CLI

```bash
# Check health
statuz bus health

# List agents
statuz bus agents

# Register an agent
statuz bus register --id my-agent --name "My Agent" --project my-project --capabilities coding testing

# Discover agents
statuz bus discover --arrow-map niche:v1

# Send a signal
statuz bus signal --type task_update --source my-agent --channel default --payload '{"status":"done"}'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Signal Bus Server                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Agent     │  │  Channel    │  │  Backflow   │        │
│  │  Registry   │  │  Manager    │  │   Engine    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          │                                  │
│  ┌─────────────────────────────────────────────────────────┤
│  │              Agent Discovery (4-Rule Engine)             │
│  │  1. Arrow Map (primary)  2. Project  3. Capability     │
│  └─────────────────────────────────────────────────────────┤
│                        HTTP API                             │
│  POST /register  GET /agents  POST /signals  POST /backflow│
└─────────────────────────────────────────────────────────────┘
```

## Core Concepts

### Agent Registry

In-memory Map + optional JSON file persistence for agent directory.

```typescript
const registry = new AgentRegistry({
  persistence_path: './data/registry.json',
  heartbeat_timeout_ms: 5 * 60 * 1000, // 5 minutes
});

registry.register({
  agent_id: 'agent-1',
  name: 'Agent One',
  project: 'backend',
  capabilities: ['api', 'database'],
  arrow_maps: ['niche:v1'],
});
```

### Channel Manager

Broadcast/unicast/multicast with retention policies.

```typescript
const channels = new ChannelManager();

// Default channels: default, user-backflow, agent-broadcast
channels.createChannel({
  name: 'my-channel',
  retention: 'short',
  retention_ms: 5 * 60 * 1000,
  publish_roles: ['agent'],
  subscribe_roles: ['agent'],
});

channels.publish('my-channel', signal);
channels.broadcast('my-channel', signal); // To all subscribers
```

### Agent Discovery (4-Rule Engine)

1. **Arrow Map** (primary) - Find agents sharing an Arrow Map
2. **Project** - Find agents in the same project
3. **Capability** - Find agents with specific capabilities
4. **Static/ID** - Direct lookup by agent ID

```typescript
const discovery = new AgentDiscovery(registry);

// Primary: Discover by Arrow Map
const result = discovery.discover({
  arrow_map: 'niche:backend-v1',
});

// Find related agents
const related = discovery.findRelatedAgents('agent-1');
```

### Backflow Engine

User to agent signal submission and polling. This completes the sync loop.

```typescript
const backflow = new BackflowEngine();

// User submits directive
backflow.submitDirective('agent-1', 'Switch to testing mode', 'user@example.com');

// Agent polls for signals
const signals = backflow.poll('agent-1');
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health status |
| `/register` | POST | Register new agent |
| `/heartbeat/{id}` | POST | Keep agent alive |
| `/agents` | GET | List agents |
| `/agents/{id}` | GET | Get agent by ID |
| `/agents/{id}` | DELETE | Unregister agent |
| `/signals` | POST | Send signal |
| `/signals` | GET | Get signals |
| `/discover` | GET | Discover agents |
| `/backflow` | POST | Submit user signal |
| `/backflow/{id}` | GET | Poll agent signals |

## CLI Commands

```bash
# Health check
statuz bus health

# List agents
statuz bus agents [--status online]

# Register agent
statuz bus register --id my-agent --name "My Agent" --project my-project

# Discover agents
statuz bus discover --arrow-map niche:v1
statuz bus discover --project backend
statuz bus discover --capability coding

# Send signal
statuz bus signal --type update --source my-agent --channel default

# User to agent signal
statuz bus backflow --agent my-agent --type directive --content "Do X" --from user@example.com
```

## License

Apache-2.0
