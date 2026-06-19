# Statuz MCP Server

The Statuz MCP Server enables AI agents to read and update their runtime status through the Model Context Protocol (MCP). It provides five core tools for managing agent state throughout a session.

## Overview

The MCP Server acts as a bridge between MCP-compatible clients (such as Claude Desktop, Cursor, or VS Code) and the Statuz protocol. It uses the [MCP SDK](https://github.com/modelcontextprotocol/sdk) with stdio transport for secure, local communication.

### Features

- **Read** agent status files in YAML format
- **Checkpoint** progress at meaningful moments
- **Resume** quickly with human-readable status summaries
- **Update** current state fields
- **Initialize** new Statuz files for fresh projects

### Default Path

By default, the server looks for Statuz files at `.statuz/statuz.yaml` relative to the current working directory.

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or pnpm

### Build from Source

```bash
cd packages/mcp-server
npm install
npm run build
```

The compiled server will be available at `dist/index.js`.

### Verify the Build

```bash
node dist/index.js
```

You should see `statuz-mcp v0.4.0 started on stdio` if the build succeeded.

## Configuration

### Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "statuz": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Replace `/absolute/path/to/` with the actual absolute path to your Statuz repository.

### VS Code (with Cline or similar extensions)

Add to your VS Code settings (`.vscode/settings.json`):

```json
{
  "cline.mcp.servers": {
    "statuz": {
      "command": "node",
      "args": ["${workspaceFolder}/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor

Add to Cursor settings (`.cursor/settings.json` or through the UI):

```json
{
  "mcpServers": {
    "statuz": {
      "command": "node",
      "args": ["/path/to/statuz/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Custom Statuz Path

By default, tools that read or write Statuz files use `.statuz/statuz.yaml`. Some tools accept an optional `filePath` parameter to override this:

```json
{
  "filePath": "custom/path/to/my-project.yaml"
}
```

## Tools Reference

### statuz_init

Creates a new Statuz file with default values.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | No | Path for the new file (default: `.statuz/statuz.yaml`) |
| `agentName` | string | No | Name of the agent (default: `dev-agent`) |
| `projectName` | string | No | Name of the project (default: `example-project`) |

**Example Request:**

```json
{
  "name": "statuz_init",
  "arguments": {
    "agentName": "my-dev-agent",
    "projectName": "my-awesome-project",
    "filePath": ".statuz/statuz.yaml"
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "message": "Created .statuz/statuz.yaml",
    "agentName": "my-dev-agent",
    "projectName": "my-awesome-project",
    "document": {
      "statuz_version": "0.1",
      "updated_at": "2026-05-28T10:30:00.000Z",
      "identity": {
        "agent_name": "my-dev-agent",
        "project_name": "my-awesome-project",
        "environment": "local-dev"
      },
      "current_state": {
        "stage": "initialization",
        "task": "initialize Statuz",
        "status": "idle",
        "last_checkpoint": "Statuz file created",
        "next_action": "define the agent's current goal"
      }
    }
  }
}
```

### statuz_read

Reads and returns the full contents of a Statuz YAML file.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | No | Path to the Statuz file (default: `.statuz/statuz.yaml`) |

**Example Request:**

```json
{
  "name": "statuz_read",
  "arguments": {
    "filePath": ".statuz/statuz.yaml"
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "statuz_version": "0.1",
    "updated_at": "2026-05-28T10:30:00.000Z",
    "identity": {
      "agent_name": "dev-agent",
      "project_name": "example-project",
      "organization": "Oasis Company"
    },
    "current_state": {
      "stage": "implementation",
      "task": "add Statuz support",
      "status": "in_progress",
      "last_checkpoint": "schema designed",
      "next_action": "implement CLI validate command"
    },
    "checkpoints": [...]
  }
}
```

### statuz_checkpoint

Records a checkpoint in the Statuz file. Checkpoints are used to track meaningful progress and enable recovery.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | No | Path to the Statuz file (default: `.statuz/statuz.yaml`) |
| `summary` | string | Yes | Brief description of recent progress |
| `nextAction` | string | No | What to do next after this checkpoint |

**Example Request:**

```json
{
  "name": "statuz_checkpoint",
  "arguments": {
    "filePath": ".statuz/statuz.yaml",
    "summary": "Implemented the statuz_validate command",
    "nextAction": "Write tests for the validation logic"
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "message": "Checkpoint cp-002 added successfully",
    "checkpoint": {
      "id": "cp-002",
      "at": "2026-05-28T10:35:00.000Z",
      "summary": "Implemented the statuz_validate command",
      "next_action": "Write tests for the validation logic"
    }
  }
}
```

### statuz_get_resume_brief

Returns a human-readable summary of the agent's current status. This is the primary tool for resuming a session.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | No | Path to the Statuz file (default: `.statuz/statuz.yaml`) |

**Example Request:**

```json
{
  "name": "statuz_get_resume_brief",
  "arguments": {}
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "brief": "=== Statuz Resume ===\nAgent:    dev-agent\nProject:  example-project\nOrg:      Oasis Company\nEnv:      local-dev\n\nStatus:   in_progress\nStage:    implementation\nTask:     add Statuz support\nLast CP:  schema designed\nNext:     implement CLI validate command",
    "summary": {
      "agentName": "dev-agent",
      "projectName": "example-project",
      "status": "in_progress",
      "stage": "implementation",
      "task": "add Statuz support",
      "lastCheckpoint": "schema designed",
      "nextAction": "implement CLI validate command"
    }
  }
}
```

### statuz_update_status

Updates one or more fields in the `current_state` section of the Statuz file.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filePath` | string | No | Path to the Statuz file (default: `.statuz/statuz.yaml`) |
| `status` | string | No | New status value |
| `stage` | string | No | New stage value |
| `task` | string | No | Current task description |
| `nextAction` | string | No | Next action to take |
| `lastCheckpoint` | string | No | Description of the last checkpoint |

**Valid Status Values:**

- `idle` - Agent is waiting for work
- `in_progress` - Agent is actively working
- `blocked` - Agent is blocked by an external dependency
- `waiting_for_user` - Agent needs human input
- `waiting_for_tool` - Agent is waiting for another tool
- `completed` - Task or goal has been completed
- `paused` - Work has been paused
- `failed` - Task encountered an error

**Valid Stage Values:**

- `planning`
- `scoping`
- `research`
- `design`
- `implementation`
- `testing`
- `review`
- `deployment`
- `maintenance`

**Example Request:**

```json
{
  "name": "statuz_update_status",
  "arguments": {
    "status": "in_progress",
    "stage": "implementation",
    "task": "add error handling to MCP server",
    "nextAction": "test the error cases",
    "lastCheckpoint": "added validation logic"
  }
}
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "message": "Updated .statuz/statuz.yaml",
    "updatedFields": {
      "status": "in_progress",
      "stage": "implementation",
      "task": "add error handling to MCP server",
      "nextAction": "test the error cases",
      "lastCheckpoint": "added validation logic"
    },
    "newState": {
      "stage": "implementation",
      "task": "add error handling to MCP server",
      "status": "in_progress",
      "last_checkpoint": "added validation logic",
      "next_action": "test the error cases"
    }
  }
}
```

## Error Handling

All tools return a consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `File not found: /path/to/.statuz/statuz.yaml` | Statuz file does not exist | Use `statuz_init` to create one first |
| `File already exists: /path/to/.statuz/statuz.yaml` | Attempted to initialize where file exists | Choose a different path or delete existing file |
| `Invalid YAML in file: /path/to/file.yaml` | Corrupt or malformed YAML | Fix the YAML syntax or regenerate the file |
| `Error: Unknown tool "tool-name"` | Client requested non-existent tool | Check tool name spelling |

### Error Response Format

When an error occurs, the MCP server returns:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":false,\"error\":\"File not found: /path/to/.statuz/statuz.yaml\"}"
    }
  ],
  "isError": true
}
```

## Best Practices

### Session Start

At the beginning of each session, agents should:

1. Call `statuz_get_resume_brief` to understand current status
2. Review `last_checkpoint` and `next_action` to determine what to do
3. Set status to `in_progress` when starting work

### During Work

Throughout the session:

1. Use `statuz_checkpoint` after completing significant milestones
2. Use `statuz_update_status` to update current task as it evolves
3. Keep `next_action` current to maintain clear direction

### Session End

When concluding work:

1. Create a final checkpoint summarizing progress
2. Update `next_action` to reflect what remains
3. Set status appropriately (`idle`, `waiting_for_user`, etc.)

### Multi-Agent Coordination

When multiple agents share a project:

1. Use separate Statuz files per agent: `.statuz/agents/<name>.yaml`
2. Use `relations.related_agents` to define agent dependencies
3. Each agent should only modify its own Statuz file

### File Location

The default path `.statuz/statuz.yaml` follows gitignore conventions:

```gitignore
# .gitignore
.statuz/
```

This keeps agent status files separate from source code while remaining project-local.

## Example Workflow

### Initial Setup

```json
// Create a new Statuz file for the project
{
  "name": "statuz_init",
  "arguments": {
    "agentName": "dev-agent",
    "projectName": "my-api-project",
    "filePath": ".statuz/statuz.yaml"
  }
}
```

### Start of Session

```json
// Get current status
{
  "name": "statuz_get_resume_brief",
  "arguments": {}
}

// Response shows:
// - Last checkpoint: "implemented user authentication"
// - Next action: "add rate limiting to API endpoints"
// - Status: "idle"

// Start working
{
  "name": "statuz_update_status",
  "arguments": {
    "status": "in_progress",
    "task": "add rate limiting to API endpoints"
  }
}
```

### During Development

```json
// After implementing rate limiting
{
  "name": "statuz_checkpoint",
  "arguments": {
    "summary": "Added rate limiting middleware with configurable limits",
    "nextAction": "write tests for rate limiting"
  }
}

// After tests pass
{
  "name": "statuz_update_status",
  "arguments": {
    "lastCheckpoint": "added rate limiting middleware with configurable limits"
  }
}
```

### End of Session

```json
// Final checkpoint
{
  "name": "statuz_checkpoint",
  "arguments": {
    "summary": "Completed rate limiting implementation and tests. API endpoints are now protected.",
    "nextAction": "deploy to staging environment"
  }
}

// Update status
{
  "name": "statuz_update_status",
  "arguments": {
    "status": "waiting_for_user",
    "task": "rate limiting implementation completed",
    "nextAction": "await deployment approval"
  }
}
```

## SDK Integration

The MCP Server uses the TypeScript SDK (`@oasis-npm/statuz-sdk`) for core operations:

```typescript
import { Statuz } from "@oasis-npm/statuz-sdk";

// Read existing file
const statuz = Statuz.read(".statuz/statuz.yaml");

// Work with the document
const doc = statuz.getDocument();
statuz.currentState.status = "in_progress";

// Add checkpoint
statuz.appendCheckpoint("completed feature X", "move to testing");

// Write changes
statuz.write(".statuz/statuz.yaml");
```

## Related Documentation

- [SPEC.md](file:///e:\ceaserzhao\github%20projects\statuz\SPEC.md) - Protocol specification
- [ARCHITECTURE.md](file:///e:\ceaserzhao\github%20projects\statuz\docs\ARCHITECTURE.md) - System architecture
- [CONCEPTS.md](file:///e:\ceaserzhao\github%20projects\statuz\docs\CONCEPTS.md) - Core concepts
- [packages/sdk-ts](file:///e:\ceaserzhao\github%20projects\statuz\packages\sdk-ts) - TypeScript SDK reference
- [packages/cli](file:///e:\ceaserzhao\github%20projects\statuz\packages\cli) - CLI documentation
