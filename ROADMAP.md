# Roadmap

## 0.1 — Seed protocol

- [x] Define Statuz as AI Agent Runtime Status Protocol.
- [x] Draft core YAML format.
- [x] Add JSON Schema.
- [x] Add examples.
- [x] Add CLI scaffold.
- [x] Add bootstrap Skill draft.

## 0.2 — Practical CLI

- [x] Stable `statuz init`.
- [x] Stable `statuz validate`.
- [x] Stable `statuz resume`.
- [x] Better error messages.
- [x] Optional `.gitignore` generation.

## 0.3 — SDK

- [x] JavaScript/TypeScript SDK.
- [x] Python SDK.
- [x] Checkpoint append helpers.
- [x] Multi-agent file helpers.

## 0.4 — MCP server

- [x] `statuz.read` tool.
- [x] `statuz.write_checkpoint` tool.
- [x] `statuz.get_resume_brief` tool.
- [x] `statuz.update_agent_status` tool.
- [x] `statuz.init` tool.

## 0.4.1 — Implementation Hardening

- [x] Fix TypeScript SDK validation logic.
- [x] Use correct JSON Schema 2020-12 with Ajv.
- [x] Complete MCP server tools (validate, resume, update).
- [x] Add security boundaries to MCP server.
- [x] Unify agent file path rules.
- [x] Expand CI coverage.
- [x] Update CHANGELOG.

## 0.5 — Integrations

- [ ] Trae SOLO workflow.
- [ ] Cursor / coding-agent workflow.
- [ ] MuseRock creative-state integration.
- [ ] GitHub issue/task linking.

## 0.6 — niche Technical Charter (Working Draft)

- [ ] Publish NICHE_MANIFEST.md technical charter.
- [ ] Define niche manifest, signal, assessment, context, outcome, calibration.
- [ ] Create ADR: Statuz does not replace MCP/A2A.
- [ ] Create ADR: Core and niche separation.

## 0.7 — niche Minimum Object Set (Working Draft)

- [ ] Define niche manifest schema.
- [ ] Define niche signal schema.
- [ ] Define niche assessment schema.
- [ ] Define niche context schema.
- [ ] Define niche outcome schema.
- [ ] Define niche calibration schema.
- [ ] Define SYN request/resolution schema.

## 0.8 — niche Vertical Demo (Working Draft)

- [ ] Create backend, frontend, qa, project-owner examples.
- [ ] Create signal → assessment → context → outcome chain.
- [ ] Create calibration proposal and SYN examples.

## 0.9 — SYN Project MVP (Planning)

- [ ] Create Statuz project niche manifest.
- [ ] Generate observed direction.
- [ ] Generate calibration proposal.
- [ ] Generate SYN request.
- [ ] Generate SYN resolution.

## 1.0 — Stable protocol

- [ ] Versioned spec.
- [ ] Compliance tests.
- [ ] Migration guide.
- [ ] Security model.
- [ ] Dashboard prototype.
