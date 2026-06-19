# Shared Schema Patterns

This document defines common patterns used across all niche JSON schemas.

## Common Fields

All niche objects share these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `{type}_version` | string | Yes | Schema version (e.g., "manifest_version", "signal_version") |
| `id` | string | Yes | Unique identifier (e.g., "sig-001", "ast-001") |
| `timestamp` | string (datetime) | Yes | ISO 8601 timestamp |

## ID Patterns

| Object | ID Pattern | Example |
|--------|------------|---------|
| manifest | `{type}-manifest` | `project-manifest`, `agent-backend-manifest` |
| signal | `sig-{NNN}` | `sig-001`, `sig-002` |
| assessment | `ast-{NNN}` | `ast-001`, `ast-002` |
| context | `ctx-{NNN}` | `ctx-001`, `ctx-002` |
| outcome | `out-{NNN}` | `out-001`, `out-002` |
| calibration | `cal-{NNN}` | `cal-001`, `cal-002` |
| syn | `syn-{NNN}` | `syn-001`, `syn-002` |
| syn resolution | `syn-{NNN}-resolution` | `syn-001-resolution` |

## Version Pattern

All versions follow semantic versioning:
- Format: `{MAJOR}.{MINOR}` (e.g., "1.0", "1.1")
- Initial stable version: "1.0"
- Breaking changes increment MAJOR
- Non-breaking additions increment MINOR

## Type Prefixes

Signal types use a namespace prefix:

| Prefix | Category | Examples |
|--------|----------|----------|
| `vcs:` | Version control | `vcs:commit`, `vcs:pr-opened` |
| `api:` | API changes | `api:contract-changed`, `api:endpoint-deprecated` |
| `dependency:` | Dependencies | `dependency:version-changed`, `dependency:security-advisory` |
| `agent:` | Agent events | `agent:handoff`, `agent:error` |
| `human:` | Human input | `human:directive`, `human:feedback` |

## Common Enums

### Result Enum (outcome)

```json
{
  "type": "string",
  "enum": ["success", "failure", "partial"]
}
```

### Priority Enum (syn)

```json
{
  "type": "string",
  "enum": ["low", "medium", "high", "critical"]
}
```

## Additional Properties

All schemas use `additionalProperties: true` to allow future extensions while maintaining backward compatibility.
