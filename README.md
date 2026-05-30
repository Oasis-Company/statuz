<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

# Statuz

> **Memory lets an AI remember the past. Statuz lets an AI understand where it stands, what matters now, and when human direction must be renewed.**

Statuz is the **situated alignment ecosystem for AI agents and their human principals**. It provides an open, verifiable, extensible stack for expressing:

- who the agent is and what role it is playing;
- what the agent is currently doing;
- what progress has already been made;
- what other agents, projects, files, tools, users, products, or organizations are related;
- where the agent stands in the ecosystem;
- what changes in the environment affect the agent;
- when the agent needs to request human direction for strategic decisions.

Statuz is not another long-term memory database. It is the missing **situated alignment layer** between memory, tools, skills, projects, and multi-agent systems.

## Why Statuz exists

Modern AI systems can call tools, use MCP servers, load skills, search memory, and generate code. But after enough time, context switching, model switching, task interruption, or project handoff, an agent often loses the simplest thing:

> What am I doing right now, and why?

Statuz solves that by defining a small status object that can live beside any AI project.

```yaml
statuz_version: "0.1"

identity:
  agent_name: dev-agent
  project_name: MuseRock
  organization: Oasis Company

role:
  name: implementation-assistant
  responsibilities:
    - implement features
    - preserve existing architecture
    - explain tradeoffs

current_state:
  stage: implementation
  task: add Statuz Layer
  status: in_progress
  last_checkpoint: designed the first API shape
  next_action: create statuz service module

relations:
  related_agents:
    - doc-agent
    - qa-agent
  related_files:
    - apps/api/src/memory
    - apps/web/src/stores

rules:
  should_not:
    - overwrite the existing memory system
    - interrupt the user during focus mode
```

## The core idea

Statuz focuses on six primitives:

| Primitive | Question answered |
|---|---|
| `identity` | Who am I? |
| `role` | What am I responsible for? |
| `goal` | What am I trying to achieve? |
| `progress` | How far have I gone? |
| `relations` | What projects, agents, tools, users, and files are connected to this state? |
| `next_action` | What is the next most useful move? |

## What Statuz is not

Statuz is **not**:

- a vector database;
- a replacement for MCP;
- a replacement for Agent Skills;
- a full project management system;
- a chat transcript archive;
- a knowledge graph pretending to be memory.

Statuz is the compact runtime state that tells the agent where it stands.

## Repository Status

This repository contains the **Statuz ecosystem** (protocol + tools + best practices) in various stages of maturity:

### Statuz Core (Stable)
The core runtime status layer that answers: who am I, what am I doing, where am I, and what's next.

**Current implementation:**
- CLI 0.2.0 - `statuz init`, `statuz validate`, `statuz resume`
- TypeScript SDK 0.3.0 - programmatic access to Statuz files
- Python SDK 0.3.0 - Python implementation
- MCP Server 0.4.0 - Model Context Protocol integration

### Statuz niche (Working Draft)
The ecological positioning and long-term calibration layer that answers: where do I stand in the ecosystem, what changes affect me, and when do I need to recalibrate?

**Status:** Working draft. Schemas and documentation are complete; production tooling is in progress.

### Statuz SYN (Working Draft)
The human governance interface for strategic synchronization requests when position, boundaries, or authority require renewal.

**Status:** Working draft. Schemas and documentation are complete; production tooling is in progress.

## Three-Layer Architecture

Statuz defines three layers of situated alignment (all required):

| Layer | Purpose | Status |
|-------|---------|--------|
| **Statuz Core** | Compact runtime status | Stable (0.1) |
| **niche** | Ecological position & long-term calibration | Working Draft |
| **SYN** | Human governance for strategic decisions | Working Draft |

### Statuz Core
The minimal situation layer. It answers:
- Who am I?
- What am I doing?
- What is my current state?
- What progress have I made?
- What should happen next?

### Statuz niche
The ecological positioning layer. It answers:
- Where do I stand in the ecosystem?
- What changes are happening around me?
- What changes actually affect me?
- Should I take action? Why?
- Who should I collaborate with?

### Statuz SYN
The human synchronization layer. It answers:
- When must I request human direction?
- How do I present strategic options with evidence?
- How do I record decisions and track accountability?

Learn more about the architecture in [docs/NICHE_MANIFEST.md](docs/NICHE_MANIFEST.md).

## What's in this repository

This repository contains:

- the Statuz 0.1 Core specification;
- JSON Schema for validating status files;
- examples for single-agent, multi-agent, and creative-agent use cases;
- CLI tools for status management;
- TypeScript and Python SDKs;
- MCP Server for local agent integration;
- niche and SYN schemas + examples;

## Quick start

Create a status file:

```bash
mkdir -p .statuz
cp examples/basic/statuz.yaml .statuz/statuz.yaml
```

Validate it with the CLI scaffold:

```bash
cd packages/cli
npm install
npm run build
node dist/index.js validate ../../examples/basic/statuz.yaml
```

Generate a fresh project status file:

```bash
node dist/index.js init --agent dev-agent --project my-ai-project
```

## Suggested repository name

Recommended GitHub repository:

```text
Oasis-Company/statuz
```

Alternative names:

- `statuz-protocol`
- `agent-statuz`
- `runtime-statuz`

The recommended name is short, memorable, and protocol-friendly.

## Philosophy

AI agents do not only need more context. They need better **self-location**.

A good agent should be able to say:

> I am the coding assistant for this project. I am currently implementing the API layer. I stopped because a test failed. The related documentation agent should be notified. The next action is to inspect the controller contract.

That sentence is Statuz.

## License

Apache-2.0.
