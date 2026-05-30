# Statuz VS Code Extension - Specification

> **Version:** 0.5  
> **Status:** Draft  
> **Last Updated:** 2026-05-30

---

## Overview

The Statuz VS Code Extension provides a human-friendly interface to the Statuz ecosystem:
- Statuz Core file management
- niche signal/assessment/outcome workflows
- SYN decision UI
- Publishing tools for npm/Open VSX

---

## 1. Core Features

### 1.1 Statuz Core File Management

| Feature | Description |
|---------|-------------|
| Syntax Highlighting | YAML syntax highlighting for Statuz files with schema validation hints |
| File Validation | Real-time validation against JSON Schema (core + niche) |
| Quick Actions | Code actions to fix common validation errors |
| Init Command | One-click `statuz init` via command palette |
| Resume Assistant | View and resume from statuz.yaml current state |

**File Types Handled:**
- `.statuz/statuz.yaml`

### 1.2 niche Signal Generation

| Feature | Description |
|---------|-------------|
| Auto-detect VCS events | Monitor Git commits, PRs, issues via GitHub/GitLab APIs or Git hooks |
| Signal Templates | Quick-create new signals from templates (commit, dependency, agent event, etc.) |
| Signal Validation | Real-time validation as signal is created |

**File Types Handled:**
- `.statuz/niche/signals/*.yaml`

### 1.3 Assessment UI

| Feature | Description |
|---------|-------------|
| Relevance Scoring | Manual relevance scoring with rationale input |
| Signal → Assessment Flow | One-click assessment creation from signals |
| Bulk Processing | Process multiple pending signals at once |

**File Types Handled:**
- `.statuz/niche/assessments/*.yaml`

### 1.4 Niche Context & Outcome

| Feature | Description |
|---------|-------------|
| Context Assembly | Quick-assemble context payloads from assessments |
| Outcome Recording | Record outcomes after task completion with evidence |
| Niche Explorer | Tree view of niche directory (signals, assessments, contexts, outcomes, calibrations, SYN) |

### 1.5 SYN Decision Interface

| Feature | Description |
|---------|-------------|
| SYN Request View | Readable view of pending SYN requests with evidence |
| Decision Workflow | Approve/deny/revise options with rationale input |
| Resolution Generation | Auto-generate SYN resolution from decision |

**File Types Handled:**
- `.statuz/niche/syn/*.yaml`

---

## 2. User Interface

### 2.1 Activity Bar Entry

- Statuz icon with badge (number of pending signals + pending SYN)
- Click opens main view panel

### 2.2 Main View Panel (Niche Explorer)

Tree view with:

```
Statuz
  + Core
    - statuz.yaml [link to file]
  + Niche
    - Manifest [link to file]
    - Signals (12 pending, 34 total) [folder]
    - Assessments (5 pending, 28 total) [folder]
    - Contexts (1 active, 12 total) [folder]
    - Outcomes (last 7 days) [folder]
    - Calibrations (1 open) [folder]
    - SYN
      - Requests (2 pending) [folder]
      - Resolutions (15 total) [folder]
```

### 2.3 Quick Actions (Command Palette)

Commands available via `Ctrl+Shift+P`:

- `Statuz: Initialize Statuz` → runs `statuz init`
- `Statuz: Validate All Files` → validates all Statuz/niche files
- `Statuz: Create Signal` → opens signal template
- `Statuz: Process Pending Signals` → opens bulk assessment view
- `Statuz: View Pending SYN Requests` → shows pending human decisions
- `Statuz: Resume from Statuz` → shows next action from current state

### 2.4 Editor Decorations

For Statuz files:
- Lightbulb icon for auto-fixable validation issues
- Hover tooltips showing schema descriptions
- Color coding for pending signals/assessments in explorer

---

## 3. Architecture

### 3.1 Extension Structure

```
packages/vscode-extension/
  ├─ src/
  │  ├─ extension.ts          # Main entry point
  │  ├─ commands/
  │  │  ├─ init.ts            # Statuz init command
  │  │  ├─ validate.ts        # Validation command
  │  │  ├─ resume.ts          # Resume command
  │  │  ├─ createSignal.ts    # Signal creation
  │  │  └─ synDecision.ts     # SYN decision flow
  │  ├─ providers/
  │  │  ├─ treeDataProvider.ts # Niche Explorer tree
  │  │  ├─ diagnostics.ts     # Validation diagnostics
  │  │  ├─ codeActions.ts     # Quick fixes
  │  │  └─ hoverProvider.ts   # Schema hover tooltips
  │  ├─ utils/
  │  │  ├─ schema.ts          # Schema loading/validation
  │  │  ├─ fileIO.ts          # Statuz file I/O helpers
  │  │  └─ gitWatcher.ts      # VCS event monitor
  │  └─ views/
  │     └─ webview/           # Webview for complex UIs (SYN decisions)
  ├─ package.json
  └─ tsconfig.json
```

### 3.2 Dependencies

Production dependencies:
- `@statuz/sdk-ts` → TypeScript SDK for Statuz operations
- `ajv` → JSON Schema validation
- `vscode-languageclient` (optional, for language server if needed)

Dev dependencies:
- `@types/vscode`
- `typescript`

### 3.3 Webview for Complex UIs

SYN decision UI uses a webview for rich display:
- Side-by-side comparison of declared vs. observed position
- Evidence timeline
- Decision button bar (Approve/Revise/Deny)
- Rationale text input

---

## 4. Publishing Plan

### 4.1 npm Packages

Publish to npm:
- `@statuz/cli` → Command-line interface
- `@statuz/sdk-ts` → TypeScript SDK
- `@statuz/sdk-py` → Python SDK (using twine for PyPI)
- `@statuz/mcp-server` → MCP server

### 4.2 Open VSX & VS Code Marketplace

Publish extension:
1. Create Open VSX publisher account
2. Create VS Code Marketplace publisher account
3. Package extension with `vsce package`
4. Publish to both registries

### 4.3 Versioning Strategy

Follow SemVer:
- `0.x.x` → Pre-1.0 (breaking changes allowed)
- `1.x.x` → Stable (backward-compatible)

---

## 5. Roadmap for 0.5

### Phase 0.5.1 - Core Foundation
- [ ] Extension scaffolding
- [ ] Syntax highlighting + validation for statuz.yaml
- [ ] Init/validate/resume commands

### Phase 0.5.2 - Niche Explorer
- [ ] Tree view for niche files
- [ ] Signal templates + creation

### Phase 0.5.3 - Assessment & SYN
- [ ] Assessment UI (relevance scoring)
- [ ] SYN request view + decision workflow
- [ ] Resolution generation

### Phase 0.5.4 - Publishing
- [ ] npm publish setup for CLI/SDK/MCP
- [ ] VS Code extension packaging
- [ ] Open VSX + Marketplace publish

---

## 6. References

- [Statuz Core Specification](../SPEC.md)
- [NICHE_MANIFEST.md](./NICHE_MANIFEST.md)
- [VS Code Extension API](https://code.visualstudio.com/api)
