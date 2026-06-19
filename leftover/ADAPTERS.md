# Statuz External Adapters

> **Tools and implementations that bring the Statuz Protocol to life.**

---

## 🎯 What are External Adapters?

External Adapters are the **tools, libraries, and integrations** that make the Statuz Protocol useful in real workflows. They include:

- **npm packages** - CLI, SDKs, MCP Server
- **IDE Extensions** - VS Code, JetBrains
- **AI Tool Integrations** - Claude Code, GitHub Copilot
- **Cloud Services** - Coordination Pool

---

## 📦 npm Packages

### Super Package (Recommended)

```bash
npm install -g @statuz/statuz
```

Includes everything: CLI + TypeScript SDK + MCP Server + beautiful animations.

### Individual Packages

| Package | Install | Use Case |
|---------|---------|----------|
| **@statuz/statuz** | `npm install -g @statuz/statuz` | Everything in one |
| **@statuz/cli** | `npm install -g @statuz/cli` | CLI only |
| **@statuz/sdk-ts** | `npm install @statuz/sdk-ts` | TypeScript projects |
| **@statuz/mcp-server** | `npm install @statuz/mcp-server` | MCP integration |

---

## 🖥️ IDE Extensions

### VS Code Extension

**Install:** Search "Statuz" in VS Code Marketplace or install from [Open VSX](https://open-vsx.org/extension/statuz/statuz-vscode)

**Features:**
- ✅ Automatic validation of `.statuz/*.yaml` files
- ✅ Real-time schema diagnostics
- ✅ Niche Explorer tree view
- ✅ SYN Decision WebView
- ✅ Status bar integration

**Commands:**
- `Statuz: Initialize Statuz` - Create `.statuz/statuz.yaml`
- `Statuz: Validate All Files` - Validate all Statuz files
- `Statuz: Resume from Statuz` - Show current status
- `Statuz: Initialize Niche` - Create niche layer

---

## 🤖 AI Tool Integrations

### Claude Code Integration

**Status:** 🧪 In Development

**How it works:**
1. Claude Code reads `.statuz/statuz.yaml` at session start
2. Claude Code writes checkpoints after milestones
3. Claude Code checks niche signals automatically
4. Claude Code triggers SYN requests when needed

**See:** [CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)

### GitHub Copilot Integration

**Status:** 🔮 Planned

**How it will work:**
- Read project context from `.statuz/statuz.yaml`
- Suggest relevant code based on current_state
- Warn when changes might conflict with related projects

---

## ☁️ Cloud Services

### Coordination Pool

**Status:** 🧪 MVP (Available)

**Purpose:** Enable cross-project communication and ecosystem awareness.

**Features:**
- Signal Hub - Broadcast and receive ecosystem changes
- SYN Queue - Human review workflow for strategic decisions
- Ecosystem View - See all projects and their relationships

**Deploy:**
```bash
cd packages/coordination
docker-compose up -d
```

**API Endpoints:**
```
POST /api/v1/signals      - Send a signal
GET  /api/v1/signals      - Get signals
POST /api/v1/syn/requests - Create SYN request
GET  /api/v1/syn/requests - Get SYN requests
PATCH /api/v1/syn/requests/:id - Update SYN status
```

**See:** [packages/coordination/README.md](packages/coordination/README.md)

---

## 🛠️ Development Tools

### MCP Server

The Model Context Protocol Server enables AI models to interact with Statuz.

**Install:**
```bash
npm install @statuz/mcp-server
```

**Configure in Claude Desktop:**
```json
{
  "mcpServers": {
    "statuz": {
      "command": "npx",
      "args": ["@statuz/mcp-server"]
    }
  }
}
```

**Available Tools:**
- `statuz_read` - Read and parse statuz.yaml
- `statuz_validate` - Validate against schema
- `statuz_checkpoint` - Write a checkpoint
- `statuz_resume` - Get human-readable status

---

## 📁 Package Architecture

```
packages/
├── statuz/                 # Super package
│   ├── src/index.ts        # Entry point
│   └── package.json        # 0.5.1
│
├── cli/                   # Command line interface
│   ├── src/index.ts        # CLI commands
│   └── package.json        # 0.5.1
│
├── sdk-ts/                # TypeScript SDK
│   ├── src/index.ts        # Public API
│   ├── src/types.ts        # TypeScript types
│   └── package.json        # 0.5.0
│
├── mcp-server/            # MCP Server
│   ├── src/index.ts        # MCP handlers
│   └── package.json        # 0.5.0
│
├── coordination/           # Coordination Pool
│   ├── src/
│   │   ├── index.ts        # Express app
│   │   ├── routes/         # API routes
│   │   └── storage/        # File-based storage
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json        # 0.1.0
│
└── vscode-extension/       # VS Code Extension
    ├── src/
    │   ├── extension.ts    # Entry point
    │   ├── commands/       # VS Code commands
    │   ├── providers/      # Tree view providers
    │   └── views/          # WebViews
    ├── package.json        # 0.5.0
    └── statuz-vscode-0.5.0.vsix
```

---

## 🔧 Building from Source

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (for Coordination Pool)

### Build All Packages

```bash
# Install dependencies
npm install

# Build all packages
npm run build --workspaces

# Run tests
npm test --workspaces
```

### Build Individual Packages

```bash
# CLI
cd packages/cli
npm run build

# SDK
cd packages/sdk-ts
npm run build

# Coordination Pool
cd packages/coordination
npm run build
```

---

## 📦 Publishing Packages

### npm Publishing

```bash
# Login to npm
npm login

# Publish packages (in order)
cd packages/sdk-ts && npm publish --access public
cd packages/cli && npm publish --access public
cd packages/mcp-server && npm publish --access public
cd packages/statuz && npm publish --access public
```

**See:** [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md)

### VS Code Extension Publishing

**Open VSX (Recommended):**
```bash
cd packages/vscode-extension
npx ovsx publish statuz-vscode-0.5.0.vsix --pat <your-token>
```

**VS Code Marketplace:**
```bash
cd packages/vscode-extension
npx vsce publish --pat <your-token>
```

**See:** [packages/vscode-extension/VSCE_PUBLISHING_GUIDE.md](packages/vscode-extension/VSCE_PUBLISHING_GUIDE.md)

---

## 🔮 Future Adapters

| Adapter | Status | Description |
|---------|--------|-------------|
| Python SDK | 🔮 Planned | `@statuz/sdk-py` |
| JetBrains Plugin | 🔮 Planned | IDE integration for JetBrains IDEs |
| GitHub Actions | 🔮 Planned | CI/CD integration |
| Slack Bot | 🔮 Planned | SYN notifications via Slack |
| Web Dashboard | 🔮 Planned | Visual ecosystem dashboard |

---

## 🤝 Contributing Adapters

To create a new Statuz adapter:

1. **Read the protocol** - [SPEC.md](SPEC.md)
2. **Follow the patterns** - See existing implementations
3. **Include tests** - Unit + integration tests
4. **Document usage** - README + examples
5. **Publish to registry** - npm, VS Code Marketplace, etc.

---

## 📖 For More Information

- **[SPEC.md](SPEC.md)** - Core protocol specification
- **[CLAUDE_CODE_INTEGRATION.md](CLAUDE_CODE_INTEGRATION.md)** - AI tool integration
- **[packages/*/README.md](packages/)** - Individual package documentation

---

## 📄 License

Apache-2.0
