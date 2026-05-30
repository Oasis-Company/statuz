# @statuz/mcp-server

Model Context Protocol (MCP) server for the Statuz AI Agent Runtime Status Protocol.

## Overview

This MCP server enables AI agents to interact with Statuz files through the Model Context Protocol. It provides tools for reading, writing, and validating agent status information.

## Installation

```bash
npm install @statuz/mcp-server
```

## Usage

Start the MCP server:

```bash
statuz-mcp
```

Or use as a library:

```typescript
import { StatuzMCPServer } from '@statuz/mcp-server';

const server = new StatuzMCPServer();
server.start();
```

## Available Tools

- `statuz_read`: Read a statuz file and return its contents
- `statuz_validate`: Validate a statuz file against the schema
- `statuz_write`: Write data to a statuz file

## License

Apache-2.0
