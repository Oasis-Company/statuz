<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

# Statuz

> **Memory lets an AI remember the past. Statuz lets an AI understand its present.**

Statuz is an open protocol for **AI Agent Runtime Status**. It gives AI agents a structured, persistent way to know:

- who they are;
- what role they are playing;
- what goal they are pursuing;
- what progress has already been made;
- what other agents, projects, files, tools, users, products, or organizations are related;
- what should happen next.

Statuz is not another long-term memory database. It is the missing **status layer** between memory, tools, skills, projects, and multi-agent systems.

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

## Repository status

This repository is an early 0.1 seed. It contains:

- the Statuz 0.1 draft specification;
- JSON Schema for validating status files;
- examples for single-agent, multi-agent, and creative-agent use cases;
- a tiny CLI scaffold;
- a `statuz-bootstrap` Skill draft for generating Statuz folders in AI projects.

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
