<div align="center">
  <img src="assets/statuz-logo.svg" alt="Statuz Logo" width="110">
</div>

# Roadmap

> **⚠️ 诚实声明（2026-06-16更新）：**
>
> 本 ROADMAP 中的 [x] 表示"该功能的 schema/文档/示例已完成并通过验证"，
> **但不一定表示"该功能的 CLI 命令已完全实现并可正常工作"**。
>
> **实际实现状态请以 `packages/cli/src/` 代码和 `HARD-TODO.md` 为准。**
>
> **已知问题：**
> - `arrow-map detect --auto` 的扫描器目前返回空结果（stub 实现）
> - 部分命令（如 `niche`, `syn`）有 CLI 注册但未完全测试
> - 66 层（Arrow Maps）的 MVP 尚未完成
>
> **Updated 2026-06-16 - Honest Assessment**

---

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

---

## ⚠️ 实际实现状态（诚实评估 - 2026-06-16）

### 已验证可用的功能

**Core CLI（已测试可用）：**
- ✅ `statuz init` - 完全可用
- ✅ `statuz validate` - 完全可用（支持 statuz, cluster, arrow-map, syn-proposal, niche）
- ✅ `statuz resume` - 完全可用
- ✅ `statuz checkpoint` - 完全可用

**66 Arrow Maps（部分可用）：**
- ✅ `statuz arrow-map init` - 可用（生成有效 YAML）
- ✅ `statuz arrow-map validate` - 可用（验证 Arrow Map）
- ❌ `statuz arrow-map detect --auto` - **不可用**（扫描器返回空结果）
- ❌ `statuz arrow-map detect --interactive` - **未完全接通**

**niche 命令（已注册但未完全测试）：**
- ✅ `statuz niche init` - 已注册，功能未知
- ✅ `statuz niche validate` - 已注册，功能未知
- ✅ `statuz niche show` - 已注册，功能未知
- ✅ `statuz niche update` - 已注册，功能未知

**其他命令（已注册但未测试）：**
- ⚠️ `statuz syn` - 已注册，未测试
- ⚠️ `statuz cluster` - 已注册，未测试
- ⚠️ `statuz calibration` - 已注册，未测试
- ⚠️ `statuz agent` - 已注册，未测试

### Schema/Docs 完成但代码未实现

以下在 ROADMAP 中标记为 [x]，但**实际代码未完全实现**：

1. **0.6 niche Technical Charter**
   - ✅ Schema 完成
   - ✅ 文档完成
   - ⚠️ CLI 命令未完全测试

2. **0.7 niche Minimum Object Set**
   - ✅ 6 个 schema 完成
   - ✅ 验证通过
   - ⚠️ 无查询引擎

3. **0.8 niche Vertical Demo**
   - ✅ 示例文件完成
   - ✅ 验证通过（23/23）
   - ⚠️ 无自动化演示

4. **0.9 SYN Project MVP**
   - ✅ 示例文件完成
   - ✅ 验证通过（22/22）
   - ⚠️ 无 CLI 命令完成

5. **1.1.2 Arrow Map Cluster**
   - ✅ Schema 完成
   - ✅ SDK IO 完成
   - ❌ CLI 命令未实现（ROADMAP 中标记为 [ ]）

6. **1.1.3 Status Keeper**
   - ✅ Schema 完成
   - ✅ 引擎实现（runChecks, generateReport）
   - ❌ CLI 命令未实现（ROADMAP 中标记为 [ ] ）

### 已知问题（来自 NEXT_STEPS_2026-06-14.md）

1. **`packages/cli` 未完成的模块导致运行时崩溃**
   - `arrow-proposal`, `bus`, `calibration`, `lease`, `niche`, `syn`, `user-action` 这些模块在 `src/index.ts` 中被 import
   - 其中 `arrow-proposal` 有运行时 ESM 导出错误
   - **这些模块不在 66 MVP 范围内**

2. **ROADMAP 0.5（VS Code Extension）未启动**
   - 计划中但无代码

3. **无 GitHub Actions CI**
   - ROADMAP 0.4.1 声称有 CI，但未经本次会话验证

### 下一步优先级（来自 HARD-TODO.md）

**P0: 完成 66 MVP**
- 实现 `scanPackageJson()` - 让 `detect --auto` 返回真实结果
- 实现 `scanDockerCompose()` - 增强检测能力
- 实现 `scanImports()` - 完成自动发现

**P1: 文档化压缩策略**
- 创建 `docs/INFORMATION_COMPRESSION.md`
- 研究图压缩算法
- 设计存储格式

**P2: 原型查询引擎**
- 实现 `query-engine.ts` 原型
- 定义查询 API
- 添加基准测试

---

**诚实评估完成时间：** 2026-06-16  
**下次更新：** 完成 66 MVP 后
