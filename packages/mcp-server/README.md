# @statuz/mcp-server

Model Context Protocol (MCP) server for the Statuz AI Agent Runtime Status Protocol.

## Overview

This MCP server enables AI agents to interact with Statuz files through the Model Context Protocol. It provides tools for reading, writing, validating, and updating agent status information — tested and verified against live Statuz files.

**Status**: ✅ Production-ready for Statuz core operations and niche files

- Build: ✅ passes (`tsc`)
- Tests: ✅ 39/39 passing (12 security + 27 end-to-end tool integration)
- Smoke test: ✅ 9/9 live JSON-RPC tool calls verified

## Installation

```bash
npm install @statuz/mcp-server
```

If you're building from source:

```bash
cd packages/mcp-server
npm install
npm run build
```

## Usage

Start the MCP server on stdio transport:

```bash
statuz-mcp
```

Or run directly from source:

```bash
cd packages/mcp-server
npm run build
node dist/index.js
```

### As an MCP server configuration

In tools that support MCP server configuration (Claude Desktop, etc.), add:

```json
{
  "mcpServers": {
    "statuz": {
      "command": "npx",
      "args": ["-y", "@statuz/mcp-server"]
    }
  }
}
```

## Available Tools

### Core Statuz Tools

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| `statuz_init` | Initialize a new Statuz YAML file | — |
| `statuz_read` | Read and parse a Statuz YAML file | — |
| `statuz_validate` | Validate a Statuz YAML file against the schema | `path` |
| `statuz_checkpoint` | Append a checkpoint with summary to a Statuz file | `summary` |
| `statuz_update_status` | Update fields in the `current_state` section | — |
| `statuz_update` | Update any field using dot-notation path (e.g. `current_state.status`) | `path`, `field`, `value` |
| `statuz_resume` | Get a human-readable resume summary of a Statuz file | `path` |
| `statuz_get_resume_brief` | Alternate resume summary interface (filePath param instead of path) | — |

### Niche Layer Tools

Niche files are independent from `statuz.yaml` — they declare the project's ecological position, collaboration context, and ecosystem signals. The server validates them against `spec/niche/*.schema.json` if present, otherwise against a built-in fallback schema.

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| `statuz_niche_manifest_init` | Create a niche manifest YAML declaring project position | `projectName`, `purpose` |
| `statuz_niche_manifest_read` | Read a niche manifest YAML file | `filePath` |
| `statuz_niche_manifest_validate` | Validate a niche manifest against its schema | `filePath` |
| `statuz_niche_manifest_summary` | Get a brief human-readable summary of a manifest | `filePath` |
| `statuz_niche_context_write` | Write a niche collaboration context file between agents | `filePath`, `fromAgent`, `toAgent`, `summary`, `requestedAction` |
| `statuz_niche_context_read` | Read a niche context file | `filePath` |
| `statuz_niche_context_validate` | Validate a niche context file | `filePath` |
| `statuz_niche_signal_write` | Write a niche signal YAML (ecosystem event) | `filePath`, `type`, `source`, `summary` |
| `statuz_niche_signal_read` | Read a niche signal file | `filePath` |
| `statuz_niche_signal_validate` | Validate a niche signal file | `filePath` |

All file paths are validated against a configurable allowed-roots list to prevent unauthorized file access.

## Development

```bash
cd packages/mcp-server
npm install
npm run build
npm test
```

## License

Apache-2.0
