<div align="center">
  <img src="../../assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

# @statuz/statuz

Super package for Statuz - includes SDK, CLI, and MCP Server with smooth animations.

## Overview

Statuz is the situated alignment ecosystem for AI agents and their human principals. It provides an open, verifiable, extensible stack for expressing agent identity, role, current state, progress, relations, and next actions.

This super package brings together all the Statuz components in one convenient installation:

| Package | Purpose | Version |
|---------|---------|---------|
| **@statuz/sdk-ts** | TypeScript SDK | v0.5.0 |
| **@statuz/cli** | Command-line interface | v0.5.0 |
| **@statuz/mcp-server** | MCP server | v0.5.0 |

## Installation

```bash
npm install -g @statuz/statuz
```

## Usage

```bash
# Initialize a new statuz file
statuz init

# Validate a statuz file
statuz validate <file>

# Resume from a statuz file
statuz resume <file>

# Show package information
statuz info
```

## Commands

### init

Creates a new statuz.yaml file in the current directory with smooth animations.

### validate

Validates a statuz file against the official schema with loading animations.

### resume

Reads and displays the current state from a statuz file in a beautiful format.

### info

Shows information about the Statuz super package and its components.

## Features

✨ **Beautiful CLI animations** using ora, chalk, figlet, and gradient-string
📦 **All-in-one package** - includes everything you need for Statuz
🎯 **Clean, modern interface** with colorful output and smooth transitions

## Contributors

This package is maintained by:

- **ceaserzhao** ([@zbbsdsb](https://github.com/zbbsdsb)) from **Oasis Company**

## License

Apache-2.0
