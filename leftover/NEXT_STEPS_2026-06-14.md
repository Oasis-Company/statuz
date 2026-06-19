# Statuz — 2026-06-14 执行计划

> **生成上下文：** 2026-06-14 诊断会话。基于 ROADMAP.md、66 Manifesto、66-implementation/PLAN.md 和实际代码状态制定。
>
> **核心原则：** 不写"假设完成"，只写"已验证"或"待执行"。

---

## 一、全局状态：诚实快照

### 1.1 Core + niche（ROADMAP 0.1-0.9）

| 版本 | ROADMAP 标记 | 实际状态 |
|---|---|---|
| 0.1 Seed | ✅ Stable | CLI 可构建可运行 |
| 0.2 CLI | ✅ Stable | init / validate / resume / checkpoint 均可用 |
| 0.3 SDK | ✅ Stable | TS SDK + Python SDK 存在 |
| 0.4 MCP | ✅ Stable | MCP server 存在 |
| 0.4.1 Hardening | ✅ Stable | CI 配置存在（状态待验） |
| 0.6 niche Charter | ✅ Working Draft | `docs/NICHE_MANIFEST.md` 存在 |
| 0.7 niche Objects | ✅ Working Draft | 6 个 schema + ADR 存在 |
| 0.8 niche Demo | ✅ Working Draft | 3 条完整链 + 23/23 验证通过 |
| 0.9 SYN MVP | ✅ Working Draft | 22/22 验证通过 |

**Core 构建状态：** ✅ `cd packages/cli && npm run build` 通过，19 测试全部通过。

### 1.2 66 Arrow Maps（未在 ROADMAP 主线上）

| 模块 | CHECKLIST 标记 | 实际状态 |
|---|---|---|
| Schema (3 JSON) | ✅ | 已验证可用，type_properties 缺陷已修复 |
| 示例 YAML (5 个) | ⚠️ | arrow-map-example ✅、custom-node-types ✅，其余 3 个是单 Arrow/Node 不是完整 Arrow Map |
| CLI `arrow-map init` | ✅ | 生成有效 YAML，`--from-niche` / `--template` 有 stub 未实现 |
| CLI `arrow-map validate` | ✅ | 验证通过 |
| CLI `arrow-map detect --auto` | ❌ | 代码存在，但三个扫描器（package.json / docker-compose / import）全是 return [] 空壳 |
| CLI `arrow-map detect --interactive` | ❌ | 代码存在，但入口命令被 `npm run build` 编译了但入口 import 链未完整接通 |
| 推理引擎 (infer.ts) | ✅ | 代码存在，测试覆盖（7 个测试通过） |
| 测试覆盖 | ✅ | 3 文件 19 测试通过 |

### 1.3 已知问题

1. **`packages/cli` 未完成的模块导致运行时崩溃** — `arrow-proposal`、`bus`、`calibration`、`lease`、`niche`、`syn`、`user-action` 这些模块在 `src/index.ts` 中被 import，其中 `arrow-proposal` 有运行时 ESM 导出错误。这些模块不在 66 MVP 范围内。
2. **ROADMAP 0.5（VS Code Extension）未启动** — 计划中但无代码。
3. **无 GitHub Actions CI** — ROADMAP 0.4.1 声称有 CI，但未经本次会话验证。

---

## 二、目标定义

### MVP 标准（严格不可妥协）

> 一个开发者能在自己的项目中运行 `statuz arrow-map init` 和 `statuz arrow-map detect --auto`，**10 分钟内得到一张有意义的箭头图**，并通过 `statuz arrow-map validate` 验证。

换句话说：**detect --auto 必须真正返回结果**，不能是空壳。

### 66 层定位（来自 66 Manifesto）

- 66 不是 Core 的替代，是 Core / niche 之上的**拓扑抽象层**
- Arrow Map 是**项目无关的**可复用拓扑蓝图
- 核心价值：**发现关系，而不仅是存储关系**

---

## 三、执行任务（按优先级）

### ══════ P0：让 detect --auto 真正工作 ══════

> 没有这个，66 层没有实际价值。

#### T1：实现 package.json 依赖扫描

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/detector/auto.ts` |
| 当前 | 函数 `scanPackageJson()` 存在但只 `return []` |
| 目标 | 扫描项目根目录的 `package.json`，读取 `dependencies` / `devDependencies` / `peerDependencies`，每项生成一个 `dependency` 箭头（source=项目名, target=包名） |
| 关键参数 | `confidence: 0.9`, `discovery_method: "detected"`, `detector_id: "package-json-scanner"` |
| 验证 | 在 statuz 项目自身运行 `detect --auto --confidence-threshold 0.5`，应输出至少 10 个箭头（commander, yaml, ajv 等） |

#### T2：实现 Docker Compose 依赖扫描

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/detector/auto.ts` |
| 当前 | `scanDockerCompose()` 存在但只 `return []` |
| 目标 | 扫描 `docker-compose.yml` / `docker-compose.yaml`，用 `yaml` 库解析 `services.*.depends_on`，生成 `dependency` 箭头 |
| 关键参数 | `confidence: 0.95`, `detector_id: "docker-compose-scanner"` |
| 边界 | 文件不存在时静默返回 [] |

#### T3：实现源代码 import 扫描

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/detector/auto.ts` |
| 当前 | `scanImports()` 存在但只 `return []` |
| 目标 | 递归扫描 `src/` 下 `.ts` / `.js` / `.py` 文件中的 import/from/require 语句，在模块间生成 `dependency` 箭头 |
| 关键参数 | `confidence: 0.8`, `detector_id: "import-scanner"`，跳过 `node_modules/` |
| 去重 | 同一对 source→target 只保留最高 confidence |

#### T4：检测器输出改进

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/detector/auto.ts` |
| 当前 | 静默返回 0 |
| 目标 | 增强 CLI 输出，至少报告：扫描了多少文件、发现多少候选、多少高于阈值；输出前 5 个最高置信度箭头 |
| 无文件时 | 输出 "No dependency files found (package.json, docker-compose.yml, etc.)" |

---

### ══════ P1：补齐基础能力 ══════

#### T5：补齐示例文件状态

| 项目 | 内容 |
|---|---|
| 文件 | `66-implementation/examples/arrow-example.yaml`, `statu-node-example.yaml`, `project-reference.yaml` |
| 问题 | 这些文件不是完整 Arrow Map，validate 命令会正确拒绝它们，但 CHECKLIST 标记它们为 "应可验证" |
| 方案 | 在每个文件顶部添加注释 `# This is a single Arrow / StatuNode / Project Reference — not a complete Arrow Map. Use arrow-map-example.yaml for full map examples.` |

#### T6：测试覆盖增强

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/tests/detector.test.ts` |
| 当前 | 只用 mock fs，未测真实扫描 |
| 目标 | 创建 fixture 目录（含真实的 package.json、docker-compose.yml 文件），让 auto detector 测试扫描真实文件 |
| 新增用例 | `scanPackageJson()` 返回正确数量箭头；`scanPackageJson()` 文件不存在时返回 []；置信度低于阈值时被过滤 |
| 目标 | detector 测试从 7 个用例扩展到 15+ 个 |

#### T7：CLI 错误信息改进

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/arrow-map/validate.ts` |
| 当前 | 验证失败输出原始 JSON path 和 AJV 消息 |
| 目标 | 对常见错误（缺少 required 字段、类型错误）输出可读建议 |

---

### ══════ P2：可选增强（非阻塞 MVP）══════

#### T8：`arrow-map init --from-niche`

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/arrow-map/init.ts` |
| 当前 | `initFromNiche()` 有 stub 但逻辑不完整 |
| 目标 | 读取 `.statuz/niche/manifest.yaml` 的 `declared_position.does` → 生成 capability nodes；`relations.agent_graph` → 生成 responsibility 箭头 |

#### T9：GitHub Actions CI

| 项目 | 内容 |
|---|---|
| 文件 | `.github/workflows/ci.yml`（新建） |
| 内容 | `npm install` → `npm run build` → `npm test` |
| 触发 | push 和 pull request |

#### T10：非核心模块隔离

| 项目 | 内容 |
|---|---|
| 文件 | `packages/cli/src/index.ts` |
| 问题 | `arrow-proposal` 等非 MVP 模块在 import 时导致运行时崩溃 |
| 方案 | 将 `arrowProposalCommand`、`busCommand`、`calibrationCommand`、`leaseCommand`、`synCommand`、`userActionCommand` 的 import 和注册暂时注释掉，只保留核心命令 + `arrowMapCommand`，待各模块就绪后逐个恢复 |

---

## 四、任务表格总览

| # | 任务 | 优先级 | 涉及文件 | 依赖 |
|---|---|---|---|---|
| T1 | package.json 依赖扫描 | P0 | `detector/auto.ts` | — |
| T2 | Docker Compose 依赖扫描 | P0 | `detector/auto.ts` | — |
| T3 | 源代码 import 扫描 | P0 | `detector/auto.ts` | — |
| T4 | 检测器输出改进 | P0 | `detector/auto.ts` | T1–T3 |
| T5 | 示例文件注释补齐 | P1 | `66-implementation/examples/` | — |
| T6 | 测试覆盖增强 | P1 | `tests/detector.test.ts` | T1–T3 |
| T7 | CLI 错误信息改进 | P1 | `arrow-map/validate.ts` | — |
| T8 | init --from-niche | P2 | `arrow-map/init.ts` | — |
| T9 | GitHub Actions CI | P2 | `.github/workflows/ci.yml` | T1–T3 |
| T10 | 非核心模块隔离 | P2 | `src/index.ts` | — |

---

## 五、构建与验证流程

每个任务完成后，执行 agent 必须运行：

```bash
cd packages/cli
npm run build          # 必须零错误
npm test               # 必须 100% 通过

# 然后功能验证
cd ../..
node packages/cli/dist/index.js arrow-map validate 66-implementation/examples/arrow-map-example.yaml
node packages/cli/dist/index.js arrow-map validate 66-implementation/examples/custom-node-types.yaml
node packages/cli/dist/index.js arrow-map detect --auto --confidence-threshold 0.5
```

---

## 六、本次会话遗留

- `66-implementation/spec/arrow.schema.json` 中 `type_properties` 已从 `oneOf` 改为 `additionalProperties: true`（修复 AJV oneOf 多分支匹配缺陷）
- `66-implementation/examples/custom-node-types.yaml` 第 10 行缩进已修复
- 构建顺序：`signal-bus → npm install → sdk-ts → npm install → cli → npm run build`
