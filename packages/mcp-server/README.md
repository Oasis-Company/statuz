# @statuz/mcp-server

Model Context Protocol (MCP) server for the Statuz AI Agent Runtime Status Protocol.

## Overview

This MCP server enables AI agents to interact with Statuz files through the Model Context Protocol. It provides tools for reading, writing, validating, and updating agent status information — tested and verified against live Statuz files.

**Status**: ✅ Production-ready for Statuz core operations and niche files

- Build: ✅ passes (`tsc`)
- Tests: ✅ 46/46 passing (12 security + 34 end-to-end tool integration)
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

### Niche SYN (Human Sync) Tools

The SYN layer bridges the gap between agents and humans. Use SYN requests to:

- Ask a human to perform an action that agents cannot do themselves (e.g., running SQL in a dashboard, approving a deployment, confirming a design choice).
- Resume interrupted work — any agent can call `statuz_niche_syn_request_list_pending` to discover what human decisions are still outstanding.
- Record the final decision — a `syn_resolution` file captures the outcome so the entire team has visibility.

The server validates SYN files against `spec/niche/niche-syn.schema.json`.

| Tool | Description | Required Parameters |
|------|-------------|-------------------|
| `statuz_niche_syn_request_create` | Create a SYN request — ask a human for a decision or action | `filePath`, `summary`, `priority`, `source`, `options`, `recommendation` |
| `statuz_niche_syn_request_read` | Read a SYN request file | `filePath` |
| `statuz_niche_syn_request_validate` | Validate a SYN request against the schema | `filePath` |
| `statuz_niche_syn_request_list_pending` | List unresolved SYN requests in a directory, sorted by priority | `directory` |
| `statuz_niche_syn_resolution_create` | Create a SYN resolution — mark a request as decided | `filePath`, `synRequestId`, `decision`, `decisionSummary`, `rationale`, `principal` |
| `statuz_niche_syn_resolution_read` | Read a SYN resolution file | `filePath` |

### Typical Workflow

1. Agent needs a human action → calls `statuz_niche_syn_request_create` with options and a recommendation. Also embeds relevant context (SQL snippet, URL, instructions).
2. Agent pauses related work or continues on independent tasks.
3. Human performs the action (run SQL in dashboard, etc.) and tells the agent.
4. Agent calls `statuz_niche_syn_resolution_create` to record the decision, outcome, and next steps.
5. Next time any agent starts, it calls `statuz_niche_syn_request_list_pending` to see if there are unresolved requests — if none, it resumes normal work.

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
