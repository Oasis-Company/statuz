# Roadmap

> Updated 2026-05-30 - Based on positioning calibration
>
> **定位声明：** Statuz 是 AI Agent **Situated Alignment Ecosystem**（生态系统）= 协议 + 工具链 + 最佳实践文档
>
> **三层架构：** Core + niche + SYN = Statuz，全部必需
>
> **当前目标：** 1.0 Stable（Complete）

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

**目标：** 让 niche/SYN 可被实际使用

**优先项：** VS Code Extension + npm/Open VSX 发布

### 0.5.1 VS Code Extension
- [ ] Extension 基础结构
- [ ] Statuz 文件语法高亮
- [ ] Statuz 文件验证
- [ ] 快捷命令：Init Statuz / Init niche
- [ ] Resume from Statuz UI
- [ ] Niche 信号自动生成（监听 VCS 事件）
- [ ] Niche 评估视图
- [ ] SYN 决策界面
- [ ] Niche 状态面板

### 0.5.2 发布
- [ ] npm 发布 CLI/SDK/MCP
- [ ] Open VSX 发布 VS Code Extension
- [ ] VS Code Marketplace 发布
- [ ] 安装/使用文档更新

**暂不：** Trae SOLO、GitHub、MuseRock（后续迭代）

---

## 1.0 — Stable Protocol

**目标：** 完整的、可生产使用的生态系统

### 1.0.1 Versioned Spec
- [ ] SPEC.md 正式版本化（1.0）
- [ ] 版本兼容性声明
- [ ] Breaking Change Policy

### 1.0.2 Compliance Tests
- [ ] Schema 完整测试套件
- [ ] CLI 回归测试
- [ ] SDK 集成测试
- [ ] MCP Server 安全测试

### 1.0.3 Migration Guide
- [ ] 0.x → 1.0 迁移指南
- [ ] 示例更新

### 1.0.4 Security Model
- [ ] 正式安全模型文档
- [ ] 文件访问权限最佳实践
- [ ] 敏感数据标记规范

### 1.0.5 Dashboard Prototype（可选）
- [ ] 轻量级 Statuz 状态查看器
- [ ] Niche 状态概览
