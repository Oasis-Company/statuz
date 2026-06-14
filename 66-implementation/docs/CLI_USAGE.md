# 66 Layer CLI Usage Guide

The 66 layer introduces Arrow Maps, a powerful way to model system topologies. This guide covers the `statuz arrow-map` commands.

---

## Overview

The `statuz arrow-map` command provides three subcommands:
- `init` - Create a new Arrow Map
- `validate` - Validate an existing Arrow Map
- `detect` - Discover arrows in your project

---

## `statuz arrow-map init`

Creates a new Arrow Map file.

### Usage

```bash
statuz arrow-map init [--output <path>] [--from-niche] [--template <id>]
```

### Options

| Option | Description |
|--------|-------------|
| `--output <path>` | Path to save the Arrow Map (default: `./arrow-map.yaml`) |
| `--from-niche` | Initialize from an existing niche manifest (looks for `.statuz/niche/manifest.yaml`) |
| `--template <id>` | Use a template Arrow Map from the local registry |

### Examples

#### Create a blank Arrow Map
```bash
statuz arrow-map init
```

#### Create with custom output path
```bash
statuz arrow-map init --output ./my-map.yaml
```

---

## `statuz arrow-map validate`

Validates an Arrow Map YAML file against the schema.

### Usage

```bash
statuz arrow-map validate <file>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<file>` | Path to the Arrow Map YAML file |

### Examples

```bash
statuz arrow-map validate ./arrow-map.yaml
```

### Output

**Success:**
```
✅ Valid Arrow Map: <map-id>
   Nodes: <count>
   Arrows: <count>
```

**Error:**
```
❌ Validation failed:
   - <error-message-1>
   - <error-message-2>
```

---

## `statuz arrow-map detect`

Discovers arrows in your project through automatic scanning or interactive questioning.

**Important:** The detector is a **suggestion tool**, not a generator. Detected arrows are candidates that must go through the Arrow Proposal workflow (review → approve → apply) before becoming part of the Arrow Map.

### Usage

```bash
statuz arrow-map detect [--auto] [--interactive] [--confidence-threshold <value>]
```

### Options

| Option | Description |
|--------|-------------|
| `--auto` | Run only automatic detection (scans package.json, imports, etc.) |
| `--interactive` | Run only manual interactive detection (asks questions) |
| `--confidence-threshold <value>` | Minimum confidence for auto-detected arrows (default: 0.7) |

### Auto-Detection Sources

The detector scans three sources:

1. **package.json** — Detects npm dependencies with descriptions like:
   `"Detected from package.json: my-project depends on commander@12.1.0 (production dependency)"`

2. **docker-compose.yml** — Detects service dependencies with descriptions like:
   `"Detected from docker-compose.yml: api-gateway container depends on auth-service container for startup order"`

3. **Source imports** — Detects module-level imports with descriptions like:
   `"Detected from source import: main module imports utils module via relative path"`

### Examples

#### Run only auto-detection with custom threshold
```bash
statuz arrow-map detect --auto --confidence-threshold 0.8
```

#### Run only interactive detection
```bash
statuz arrow-map detect --interactive
```

---

## Quick Start Workflow

1. **Initialize a map**
   ```bash
   statuz arrow-map init --output ./my-project-map.yaml
   ```

2. **Discover arrows**
   ```bash
   statuz arrow-map detect
   ```

3. **Validate**
   ```bash
   statuz arrow-map validate ./my-project-map.yaml
   ```

---

## Troubleshooting

### "File not found" during validate

Check that the file path is correct. Use absolute paths if needed.

### Validation errors

The most common issue is missing required fields or invalid enum values. Check the examples in `66-implementation/examples/`.

### No arrows found during detection

Make sure you're in your project directory (where `package.json` lives) for auto-detection. For interactive mode, just start answering questions!

---

## Next Steps

- Learn about Arrow Map schema in `66-implementation/spec/arrow-map.schema.json`
- See examples in `66-implementation/examples/`
- Read the `66-OVERVIEW.md` for architectural context
