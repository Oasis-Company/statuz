<div align="center">
  <img src="../../assets/statuz-logo.svg" alt="Statuz Logo" width="120" />
</div>

# @statuz/cli

Command-line interface for the Statuz AI Agent Runtime Status Protocol.

## Overview

Statuz is the situated alignment ecosystem for AI agents and their human principals. It provides an open, verifiable, extensible stack for expressing agent identity, role, current state, progress, relations, and next actions.

This CLI provides commands for initializing, validating, and resuming agent status files as part of Statuz's three-layer architecture:

| Layer | Purpose | Status |
|-------|---------|--------|
| **Statuz Core** | Compact runtime status | Stable (0.1) |
| **niche** | Ecological position & long-term calibration | Working Draft |
| **SYN** | Human governance for strategic decisions | Working Draft |

## Installation

```bash
npm install -g @statuz/cli
```

## Usage

```bash
# Initialize a new statuz file
statuz init

# Validate a statuz file
statuz validate <file>

# Resume from a statuz file
statuz resume <file>
```

## Commands

### init

Creates a new statuz.yaml file in the current directory.

### validate

Validates a statuz file against the official schema.

```bash
statuz validate ./statuz.yaml
```

### resume

Reads and displays the current state from a statuz file.

```bash
statuz resume ./statuz.yaml
```

## License

Apache-2.0
