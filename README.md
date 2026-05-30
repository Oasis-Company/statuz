<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@statuz/statuz">
    <img alt="npm" src="https://img.shields.io/npm/v/@statuz/statuz?style=flat-square&color=blue">
  </a>
  <a href="https://www.npmjs.com/package/@statuz/statuz">
    <img alt="npm" src="https://img.shields.io/npm/dt/@statuz/statuz?style=flat-square&color=green">
  </a>
  <a href="https://open-vsx.org/extension/statuz/statuz-vscode">
    <img alt="Open VSX" src="https://img.shields.io/badge/Open%20VSX-v0.5.0-blue?style=flat-square">
  </a>
  <a href="https://github.com/statuz-protocol/statuz/blob/main/LICENSE">
    <img alt="GitHub license" src="https://img.shields.io/github/license/statuz-protocol/statuz?style=flat-square&color=orange">
  </a>
</p>

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

This repository contains the **Statuz ecosystem** (protocol + tools + best practices):

### ✅ Statuz Core (0.5.0 - Stable)
The core runtime status layer that answers: who am I, what am I doing, where am I, and what's next.

**Current implementation:**
- CLI 0.5.0 - `statuz init`, `statuz validate`, `statuz resume`
- TypeScript SDK 0.5.0 - programmatic access to Statuz files
- MCP Server 0.5.0 - Model Context Protocol integration
- VS Code Extension 0.5.0 - in-editor validation and tree view

### ⚙️ Statuz niche (0.5.0 - Working Draft)
The ecological positioning and long-term calibration layer that answers: where do I stand in the ecosystem, what changes affect me, and when do I need to recalibrate?

**Status:** Working draft. Schemas and documentation are complete; production tooling (VS Code) is available.

### ⚙️ Statuz SYN (0.5.0 - Working Draft)
The human governance interface for strategic synchronization requests when position, boundaries, or authority require renewal.

**Status:** Working draft. Schemas and documentation are complete; VS Code webview tooling is available.

## Three-Layer Architecture

Statuz defines three layers of situated alignment (all required):

| Layer | Purpose | Status |
|-------|---------|--------|
| **Statuz Core** | Compact runtime status | Stable (0.5.0) |
| **niche** | Ecological position & long-term calibration | Working Draft (0.5.0) |
| **SYN** | Human governance for strategic decisions | Working Draft (0.5.0) |

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

### VS Code Extension (Recommended)
Search for **"Statuz"** in the VS Code Marketplace or install from [Open VSX](https://open-vsx.org/extension/statuz/statuz-vscode).

### CLI Installation
Install the super package that includes everything:

```bash
npm install -g @statuz/statuz
```

Or install just what you need:

```bash
# Only CLI
npm install -g @statuz/cli

# Only SDK
npm install @statuz/sdk-ts

# Only MCP Server
npm install @statuz/mcp-server
```

### Using the CLI
Create a status file:

```bash
statuz init --agent dev-agent --project my-ai-project
```

Validate a status file:

```bash
statuz validate .statuz/statuz.yaml
```

Resume from a status file:

```bash
statuz resume .statuz/statuz.yaml
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

## Contributors

This project is maintained by:

- **ceaserzhao** ([@zbbsdsb](https://github.com/zbbsdsb)) from **Oasis Company**

## License

Apache-2.0.
