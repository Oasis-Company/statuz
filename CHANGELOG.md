<p align="center">
  <img src="assets/statuz-logo.svg" width="110" alt="Statuz Logo">
</p>

# Changelog

## 0.4.1

**Implementation Hardening** - Fix critical issues and improve code reliability

### Fixed
- **TypeScript SDK**: Fixed validation logic bug, validation now works correctly
- **JSON Schema & Ajv**: Use Ajv 2020 for proper JSON Schema Draft 2020-12 support
- **Schema**: Added date-time format validation for updated_at and checkpoints.at fields
- **MCP server**: Added security boundaries for all file access operations to prevent path traversal attacks, sensitive directories blocked by default
- **MCP server**: Completed all tool implementations (statuz_validate, statuz_resume, statuz_update)
- **Agent paths**: Unified agent file path rules to `.statuz/agents/{agentName}.yaml`
- **CI**: Extended CI coverage to all packages (CLI, TypeScript SDK, Python SDK, MCP server)

### Added
- **ajv-formats**: Added to CLI and TypeScript SDK for date-time format validation
- **MCP security**: Added `setAllowedRoots` configuration function and `assertSafePath` validation function

## 0.4.0

**MCP Server** - Add MCP server for local agent access

### Added
- MCP server package with the following tools:
  - `statuz_init`: Initialize new Statuz file
  - `statuz_read`: Read existing Statuz file
  - `statuz_checkpoint`: Add checkpoint
  - `statuz_get_resume_brief`: Get human-readable resume brief
  - `statuz_update_status`: Update status fields
- MCP server documentation

## 0.3.0

**Dual SDKs** - Add TypeScript and Python SDKs

### Added
- TypeScript SDK package:
  - Statuz class with read/write, validation, creation support
  - `forAgent` convenience method
  - Checkpoint management
- Python SDK package:
  - Statuz class with read/write, validation, creation support
  - `for_agent` convenience method
  - Checkpoint management
- Pydantic type definitions

## 0.2.0

**Practical CLI** - Usable command-line tools

### Added
- CLI package with the following commands:
  - `statuz init`: Initialize new Statuz file
  - `statuz validate`: Validate Statuz file
  - `statuz resume`: Show human-readable resume brief
- Complete CLI implementation using Ajv for validation

## 0.1.0-draft

- Initial repository seed.
- Added Statuz 0.1 specification draft.
- Added schema, examples, CLI scaffold, and bootstrap Skill draft.