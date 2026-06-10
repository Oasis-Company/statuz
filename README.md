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

**Statuz is a Runtime that keeps users, agents, projects, and niches in continuous Reality Synchronization.**

Statuz is the **situated alignment ecosystem for AI agents and their human principals**. It provides an open, verifiable, extensible stack for expressing:
- who the agent is and what role it is playing;
- what the agent is currently doing;
- what progress has already been made;
- **what other agents, projects, files, tools, users, products, or organizations are related;
- **where the agent stands in the ecosystem;
- **what changes in the environment affect the agent;
- when the agent needs to request human direction for strategic decisions.

Statuz is not another long-term memory database. It is the missing **situated alignment layer** between memory, tools, skills, projects, and multi-agent systems.

---

## 🌟 Our Secret Weapon: Ecological Positioning (niche)

**This is what makes Statuz unique.**

Most agent tools focus on "what to do next." Statuz focuses on **where you stand in relation to everything else.**

```
┌───────────────────────────────────────────────────────────────────┐
│  Your Project Ecosystem                                          │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐    │
│  │  Project A   │ ◀──▶ │  Project B   │ ◀──▶ │  Project C   │    │
│  │ (frontend)   │      │  (backend)   │      │  (shared lib)│    │
│  └──────┬───────┘      └───────┬──────┘      └──────┬───────┘    │
│         │                      │                     │            │
│         └──────────────────────┼─────────────────────┘            │
│                                │                                  │
│                                ▼                                  │
│                  ┌──────────────────────┐                        │
│                  │  Statuz niche Layer  │                        │
│                  │  - Who's related?    │                        │
│                  │  - How do they connect?│                       │
│                  │  - What's changed?   │                        │
│                  └──────────────────────┘                        │
└───────────────────────────────────────────────────────────────────┘
```

**The niche layer tracks:**
- 🔗 **Project relationships** (what depends on what, who collaborates with whom)
- 🔄 **Environment changes** (what's shifting in the ecosystem)
- 📊 **Impact assessment** (which changes actually affect this agent)
- 🎯 **Calibration triggers** (when it's time to reconsider boundaries)

---

<p align="center">
  <img src="https://img.shields.io/badge/🚀%20Get%20Started%20Now!-blue?style=for-the-badge" alt="Get Started Now!">
</p>

---

## ⚡ Quick Start (30 seconds)

### Option 1: VS Code Extension (Recommended)

Search for **"Statuz"** in the VS Code Marketplace or install from [Open VSX](https://open-vsx.org/extension/statuz/statuz-vscode).

### Option 2: Install via npm

```bash
npm install -g @statuz/statuz
```

Then use it:

```bash
# Initialize
statuz init --agent dev-agent --project my-ai-project

# Validate
statuz validate .statuz/statuz.yaml

# Resume
statuz resume .statuz/statuz.yaml
```

### Option 3: Install only what you need

```bash
# Only CLI
npm install -g @statuz/cli

# Only SDK
npm install @statuz/sdk-ts

# Only MCP Server
npm install @statuz/mcp-server
```

---

## 🏗️ Four-Layer Architecture

Statuz defines four layers of situated alignment—building from concrete runtime to reusable topology:

```
┌───────────────────────────────────────────────────────────────┐
│  🔮  66 (Arrow Maps)                                           │
│  Reusable, executable topologies — What is the invisible       │
│  architecture that makes me possible?                          │
├───────────────────────────────────────────────────────────────┤
│  🔄  SYN (Human Governance & Strategic Synchronization)       │
│  When must I request human direction? How do I present        │
│  strategic options with evidence? How do I record decisions?  │
├───────────────────────────────────────────────────────────────┤
│  🌍  niche (Ecological Position & Long-Term Calibration)      │
│  Where do I stand in the ecosystem? What changes affect me?   │
│  Should I recalibrate? Who should I collaborate with?         │
├───────────────────────────────────────────────────────────────┤
│  ⚡  Statuz Core (Runtime Status)                             │
│  Who am I? What am I doing? What progress have I made?        │
│  What should happen next?                                     │
└───────────────────────────────────────────────────────────────┘
```

| Layer | Purpose | Status |
|-------|---------|--------|
| **Statuz Core** | Compact runtime status | ✅ Stable (0.5.0) |
| **niche** | Ecological position & long-term calibration | ⚙️ Working Draft (0.5.0) |
| **SYN** | Human governance for strategic decisions | ⚙️ Working Draft (0.5.0) |
| **66** | Topological abstraction with Arrow Maps | 🔧 Implementation (0.1.0-draft) |

---

## 📖 Four Typical Use Cases (Including Our Secret Weapon)

### Use Case 1: Core Runtime Status (Resume after Interruption)

```
┌─────────────────────────────────────────────────────────┐
│  Agent gets interrupted (context switch, model switch)   │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Statuz Core YAML file saved beside project     │    │
│  │  - identity: dev-agent                          │    │
│  │  - task: implementing API layer                 │    │
│  │  - checkpoint: test failed at controller        │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Resume: statuz resume → picks up exactly       │    │
│  │  where it left off, with full context           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Use Case 2: niche Ecological Positioning (Our Secret Weapon 🌟)

```
┌─────────────────────────────────────────────────────────┐
│  You have 3 related projects: Frontend ↔ Backend ↔ Shared Library  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  VCS changes in Shared Library → niche signal emitted  │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Assessment: "Shared Library API changed →       │    │
│  │  affects both Frontend & Backend → impact 80%  │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Calibration proposal generated with evidence   │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  All agents in Frontend/Backend get notified, sync up  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Use Case 3: niche Multi-Project Relationships (The Real Power 🔥)

```
┌───────────────────────────────────────────────────────────────────┐
│  Project Graph (e.g., MuseRock + Statuz + oasis-cli  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Statuz tracks: "I'm used by MuseRock, depends on oasis-cli"│  │
│  │  - statuz.yaml for statuz.yaml          │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  When oasis-cli changes → Statuz detects: "Affects MuseRock?" │  │
│  │  because they use my validation features"  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Smart collaboration triggered → all related agents get calibrated  │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Use Case 4: SYN Strategic Synchronization (Human Governance)

```
┌─────────────────────────────────────────────────────────┐
│  Threshold crossed → SYN request initiated               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  VS Code Extension shows: "Strategic decision   │    │
│  │  needed—boundaries, position, or authority"     │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Human reviews evidence → makes decision        │    │
│  └─────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Resolution recorded, accountability tracked    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 The Core Idea (in one diagram)

```
┌─────────────────────────────────────────────────────────────┐
│                    Statuz in one sentence                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Who am  │  │   Where am   │  │  When do I need       │  │
│  │   I?     │  │     I?       │  │  human direction?     │  │
│  └────┬─────┘  └───────┬──────┘  └───────────┬───────────┘  │
│       │                │                      │               │
│       v                v                      v               │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Core    │  │    niche     │  │        SYN            │  │
│  │          │  │              │  │                       │  │
│  │  ⚡      │  │   🌍         │  │        🔄             │  │
│  └──────────┘  └──────────────┘  └───────────────────────┘  │
│                                                               │
│                 = Complete Situated Alignment                 │
└─────────────────────────────────────────────────────────────┘
```

Statuz focuses on **six primitives** in the Core layer, **plus ecological relationship tracking:**

| Primitive | Question answered |
|---|---|
| `identity` | Who am I? |
| `role` | What am I responsible for? |
| `goal` | What am I trying to achieve? |
| `progress` | How far have I gone? |
| `relations` | **What projects, agents, tools, users, and files are connected to this state?** |
| `next_action` | What is the next most useful move? |

---

## 🚫 What Statuz is NOT

Statuz is **not**:
- a vector database;
- a replacement for MCP;
- a replacement for Agent Skills;
- a full project management system;
- a chat transcript archive;
- a knowledge graph pretending to be memory.

Statuz is the compact runtime state that tells the agent **where it stands.**

---

## 📦 The Statuz Ecosystem

```
┌─────────────────────────────────────────────────────────────┐
│                    Statuz Ecosystem                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝  Protocol Layer                                   │  │
│  │  - SPEC.md (Core specification)                      │  │
│  │  - JSON Schemas (validation)                         │  │
│  │  - niche & SYN schemas                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🛠️  Tool Layer                                       │  │
│  │  - CLI (npm: @statuz/cli)                            │  │
│  │  - TypeScript SDK (npm: @statuz/sdk-ts)              │  │
│  │  - Python SDK (pip: coming soon)                     │  │
│  │  - MCP Server (npm: @statuz/mcp-server)              │  │
│  │  - VS Code Extension (Open VSX: statuz.statuz-vscode)│  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📚  Knowledge Layer                                  │  │
│  │  - Examples (single-agent, multi-agent, niche)       │  │
│  │  - ADRs (architecture decisions)                     │  │
│  │  - Best practices documentation                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🚀  Distribution Layer                               │  │
│  │  - npm packages (published)                          │  │
│  │  - Open VSX (published)                              │  │
│  │  - VS Code Marketplace (coming soon)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Repository Status

### ✅ Statuz Core (0.5.0 - Stable)
The core runtime status layer that answers: who am I, what am I doing, where am I, and what's next.

**Current implementation:**
- CLI 0.5.0 - `statuz init`, `statuz validate`, `statuz resume`
- TypeScript SDK 0.5.0 - programmatic access to Statuz files
- MCP Server 0.5.0 - Model Context Protocol integration
- VS Code Extension 0.5.0 - in-editor validation and tree view

### 🌟 Statuz niche (0.5.0 - Working Draft)
**Our secret weapon!** The ecological positioning and long-term calibration layer that answers: where do I stand in the ecosystem, what changes affect me, and when do I need to recalibrate.

**Status:** Working draft. Schemas and documentation are complete; production tooling (VS Code) is available.

### ⚙️ Statuz SYN (0.5.0 - Working Draft)
The human governance interface for strategic synchronization requests when position, boundaries, or authority require renewal.

**Status:** Working draft. Schemas and documentation are complete; VS Code webview tooling is available.

---

## 💡 Example: A Statuz File

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
  related_projects:
    - statuz
    - oasis-cli
  related_files:
    - apps/api/src/memory
    - apps/web/src/stores

rules:
  should_not:
    - overwrite the existing memory system
    - interrupt the user during focus mode
```

---

## 🧭 Philosophy

AI agents do not only need more context. They need better **self-location** and **ecological awareness.**

A good agent should be able to say:
> I am the coding assistant for this project. I am currently implementing the API layer. I stopped because a test failed. The related documentation agent should be notified. The next action is to inspect the controller contract. Also, I see that oasis-cli changed—does that affect what I'm doing?

That sentence is Statuz.

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| **[ROOT_README.md](ROOT_README.md)** | Repository overview with architecture and package status |
| **[SPEC.md](SPEC.md)** | Core Protocol specification (Core, niche, SYN layers) |
| **[ADAPTERS.md](ADAPTERS.md)** | External Adapters guide (CLI, SDK, MCP, VS Code, Cloud) |
| **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** | Complete user journey for Claude Code agents |
| **[ROADMAP.md](ROADMAP.md)** | Development plan and staged priorities |
| **[examples/](examples/)** | Ready-to-use Statuz file templates |
| **[docs/](docs/)** | Architecture decisions and smoke tests |
| **[66-implementation/](66-implementation/)** | Topological layer (Arrow Maps) implementation |

---

## 🤝 Contributors

This project is maintained by:
- **ceaserzhao** ([@zbbsdsb](https://github.com/zbbsdsb)) from **Oasis Company**

---

## 📄 License

Apache-2.0.
