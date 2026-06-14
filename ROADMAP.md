<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="110">
</div>

# Roadmap

> Updated 2026-06-14 - Ecosystem Architecture Upgrade
>
> **Positioning Statement:** Statuz is an AI Agent **Situated Alignment Ecosystem** = Protocol + Toolchain + Best Practices Documentation
>
> **Four-Layer Architecture:** Core + niche + SYN + 66 (Arrow Maps) = Statuz, all required
>
> **Current Goal:** 1.1 Ecosystem Architecture (Arrow Map Cluster + Status Keeper)

---

## 0.1 — Seed protocol (Stable)

- [x] Define Statuz as AI Agent Runtime Status Protocol.
- [x] Draft core YAML format.
- [x] Add JSON Schema.
- [x] Add examples.
- [x] Add CLI scaffold.
- [x] Add bootstrap Skill draft.

## 0.2 — Practical CLI (Stable)

- [x] Stable `statuz init`.
- [x] Stable `statuz validate`.
- [x] Stable `statuz resume`.
- [x] Better error messages.
- [x] Optional `.gitignore` generation.

## 0.3 — SDK (Stable)

- [x] JavaScript/TypeScript SDK.
- [x] Python SDK.
- [x] Checkpoint append helpers.
- [x] Multi-agent file helpers.

## 0.4 — MCP server (Stable)

- [x] `statuz.read` tool.
- [x] `statuz.write_checkpoint` tool.
- [x] `statuz.get_resume_brief` tool.
- [x] `statuz.update_agent_status` tool.
- [x] `statuz.init` tool.

## 0.4.1 — Implementation Hardening (Stable)

- [x] Fix TypeScript SDK validation logic.
- [x] Use correct JSON Schema 2020-12 with Ajv.
- [x] Complete MCP server tools (validate, resume, update).
- [x] Add security boundaries to MCP server.
- [x] Unify agent file path rules.
- [x] Expand CI coverage.
- [x] Update CHANGELOG.

## 0.6 — niche Technical Charter (Working Draft)

- [x] Publish NICHE_MANIFEST.md technical charter (Working Draft).
- [x] Define niche manifest, signal, assessment, context, outcome, calibration, SYN.
- [x] Create ADR 0003: Protocol Boundaries.
- [x] Create ADR 0004: Core/niche Separation.
- [x] Add complete vertical example (examples/niche-example/).

## 0.7 — niche Minimum Object Set (Working Draft)

- [x] Define niche manifest schema (`spec/niche/niche-manifest.schema.json`).
- [x] Define niche signal schema (`spec/niche/niche-signal.schema.json`).
- [x] Define niche assessment schema (`spec/niche/niche-assessment.schema.json`).
- [x] Define niche context schema (`spec/niche/niche-context.schema.json`).
- [x] Define niche outcome schema (`spec/niche/niche-outcome.schema.json`).
- [x] Define niche calibration schema (`spec/niche/niche-calibration.schema.json`).
- [x] Define SYN request/resolution schema (`spec/niche/niche-syn.schema.json`).
- [x] Create ADR 0005: Schema Versioning Strategy.
- [x] Validate all examples against schemas.

## 0.8 — niche Vertical Demo (Working Draft)

- [x] Create backend, frontend, qa agent-specific manifests.
- [x] Create signal → assessment → context → outcome chains (3 complete chains).
- [x] Create calibration proposals (scope drift, collaboration drift).
- [x] Create SYN request/resolution examples (scope update, security deployment).
- [x] Update README with complete documentation.
- [x] Validate all examples against schemas (23/23 pass).

## 0.9 — SYN Project MVP (Working Draft)

- [x] Create Statuz project niche manifest.
- [x] Generate observed direction (signal/assessment/outcome chain).
- [x] Generate calibration proposal (scope drift detected).
- [x] Generate SYN request.
- [x] Generate SYN resolution.
- [x] Validate all project niche files (22/22 pass).
- [x] Update project manifest to reflect niche as core responsibility.

---

## 0.5 — Integrations (IN PROGRESS)

**Goal:** Make niche/SYN practically usable

**Priorities:** VS Code Extension + npm/Open VSX publishing

### 0.5.1 VS Code Extension
- [ ] Extension basic structure
- [ ] Statuz file syntax highlighting
- [ ] Statuz file validation
- [ ] Quick commands: Init Statuz / Init niche
- [ ] Resume from Statuz UI
- [ ] Niche signal auto-generation (listening to VCS events)
- [ ] Niche assessment view
- [ ] SYN decision interface
- [ ] Niche status panel

### 0.5.2 Publishing
- [ ] npm publish CLI/SDK/MCP
- [ ] Open VSX publish VS Code Extension
- [ ] VS Code Marketplace publish
- [ ] Installation/usage documentation update

**Not Yet:** Trae SOLO, GitHub, MuseRock (future iterations)

---

## 1.0 — Stable Protocol

**Goal:** Complete, production-ready ecosystem

### 1.0.1 Versioned Spec
- [ ] SPEC.md formal versioning (1.0)
- [ ] Version compatibility statement
- [ ] Breaking Change Policy

### 1.0.2 Compliance Tests
- [ ] Schema complete test suite
- [ ] CLI regression tests
- [ ] SDK integration tests
- [ ] MCP Server security tests

### 1.0.3 Migration Guide
- [ ] 0.x → 1.0 migration guide
- [ ] Example updates

### 1.0.4 Security Model
- [ ] Formal security model documentation
- [ ] File access permissions best practices
- [ ] Sensitive data tagging specification

### 1.0.5 Dashboard Prototype (Optional)
- [ ] Lightweight Statuz status viewer
- [ ] Niche status overview

---

## 1.1 — Ecosystem Architecture (IN PROGRESS)

**Goal:** Enable global niche awareness at organization level

**Priorities:** Arrow Map Cluster + Status Keeper + Arrow Description Mandatory

### 1.1.1 Arrow Description Mandatory
- [x] Arrow schema updated: description is required field
- [x] Detector generates descriptions for all detected arrows
- [x] Arrow Proposal workflow requires description input
- [x] Example files updated with meaningful descriptions
- [x] Documentation updated (66-OVERVIEW.md, CLI_USAGE.md)

### 1.1.2 Arrow Map Cluster
- [x] Arrow Map Cluster schema created
- [x] Cross-map arrow schema defined (from_map, to_map, description required)
- [x] Example cluster file created
- [x] ArrowMapClusterIO implemented in SDK
- [x] SPEC.md updated with Layer 4.1: Arrow Map Cluster
- [x] ADR 0007: Arrow Map Cluster documented
- [ ] Cluster CLI commands (init/show/validate/arrow-add)
- [ ] Cluster tests

### 1.1.3 Status Keeper
- [x] Status Keeper schema created
- [x] Status Keeper engine implemented (runChecks, generateReport)
- [x] Check types: file_exists, checkpoint_freshness, arrow_map_valid, niche_manifest_valid, cluster_valid
- [x] Severity levels: critical, warning, info
- [x] Health report generation
- [x] ADR 0008: Status Keeper documented
- [ ] Status Keeper CLI commands (run/show-report)
- [ ] Integration with agent session start

### 1.1.4 Calibration Engine Rewrite (P2)
- [ ] Tag-based matching algorithm (replace string includes)
- [ ] Actionable recommendation generation
- [ ] Arrow Map integration (calibration → propose arrows)
- [ ] niche types updated with tags[] field

**Not Yet:** Full Calibration Engine rewrite (deferred to 1.2)

---

## Future Phases (Post 1.1)

### 1.2 — Calibration Engine Improvements
- Structured tag schema for declared_position
- Tag extraction from checkpoint summary
- Drift calculation formula (unmatched_tags / total_checkpoint_tags)
- Specific recommendations with evidence citations
- Arrow Map integration (calibration → Arrow Map proposals)

### 1.3 — Multi-Agent Coordination
- SignalBus production-ready
- Cross-agent niche awareness
- Real-time ecosystem signals
- Agent discovery and registry
