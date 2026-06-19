# Statuz Protocol Repository

> **Memory lets an AI remember the past. Statuz lets an AI understand where it stands, what matters now, and when human direction must be renewed.**

---

## 📚 Documentation Map

| Document | Description |
|----------|-------------|
| **README.md** | You are here - repository overview |
| **[SPEC.md](SPEC.md)** | Core protocol specification - the open standard |
| **[ADAPTERS.md](ADAPTERS.md)** | External adapters - npm packages, IDEs, Claude Code |
| **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** | Complete user journey for Claude Code users |

---

## 🏗️ Repository Structure

```
statuz/
├── 📋 SPEC.md                          # Core Protocol Specification
├── 📋 ADAPTERS.md                       # External Adapters Guide
├── 📋 CLAUDE_CODE_INTEGRATION.md        # Claude Code User Journey
│
├── spec/                               # Protocol specifications
│   ├── statuz.schema.json             # Core schema
│   └── niche/                          # niche layer schemas
│
├── packages/                           # Implementation packages
│   ├── statuz/                        # Super package (CLI + SDK + MCP)
│   ├── cli/                           # Command line interface
│   ├── sdk-ts/                        # TypeScript SDK
│   ├── sdk-py/                        # Python SDK (coming)
│   ├── mcp-server/                    # MCP Server implementation
│   ├── coordination/                  # Coordination Pool (MVP)
│   └── vscode-extension/              # VS Code Extension
│
├── examples/                           # Example implementations
│   ├── single-agent/                  # Single agent example
│   ├── multi-agent/                  # Multi-agent example
│   └── niche/                         # niche ecosystem example
│
└── docs/                              # Additional documentation
    ├── TUTORIAL.md                    # Getting started tutorial
    ├── RECIPES.md                     # Common usage patterns
    └── MIGRATION.md                   # Migration guides
```

---

## 🎯 Two-Layer Architecture

Statuz is organized into two distinct layers:

### 1. 🏛️ Core Protocol (SPEC.md)
**The open standard for AI agent situated alignment.**

- **Protocol definition** - JSON Schemas, YAML formats
- **Semantic specifications** - What each field means
- **Validation rules** - How to verify compliance
- **Versioning policy** - How the standard evolves

### 2. 🔌 External Adapters (ADAPTERS.md)
**The tools that make the protocol useful.**

- **npm packages** - CLI, SDK, MCP Server
- **IDE Extensions** - VS Code, JetBrains
- **AI Tool Integrations** - Claude Code, GitHub Copilot
- **Cloud Services** - Coordination Pool

---

## 🚀 Quick Links

### For AI Agent Users (Claude Code, etc.)
- **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** - Complete user journey
- **[TUTORIAL.md](docs/TUTORIAL.md)** - 10-minute quick start

### For Developers
- **[SPEC.md](SPEC.md)** - Protocol specification
- **[ADAPTERS.md](ADAPTERS.md)** - Implementation guide
- **[RECIPES.md](docs/RECIPES.md)** - Common patterns

### For Protocol Contributors
- **[SPEC.md](SPEC.md)** - Start with the protocol
- [JSON Schemas](spec/) - Technical specifications
- [examples/](examples/) - Reference implementations

---

## 📦 Current Package Status

| Package | Version | Status | Registry |
|---------|---------|--------|----------|
| @statuz/statuz | 0.5.1 | ✅ Stable | [npm](https://www.npmjs.com/package/@statuz/statuz) |
| @statuz/cli | 0.5.1 | ✅ Stable | [npm](https://www.npmjs.com/package/@statuz/cli) |
| @statuz/sdk-ts | 0.5.0 | ✅ Stable | [npm](https://www.npmjs.com/package/@statuz/sdk-ts) |
| @statuz/mcp-server | 0.5.0 | ✅ Stable | [npm](https://www.npmjs.com/package/@statuz/mcp-server) |
| statuz-vscode | 0.5.0 | ✅ Stable | [Open VSX](https://open-vsx.org/extension/statuz/statuz-vscode) |
| @statuz/coordination | 0.1.0 | 🧪 MVP | Local only |

---

## 🤝 Contributing

This repository contains two types of contributions:

1. **Protocol Contributions** - Changes to SPEC.md, schemas, or semantic definitions
2. **Adapter Contributions** - Changes to packages, tools, or integrations

Please see each document for contribution guidelines.

---

## 📄 License

Apache-2.0
