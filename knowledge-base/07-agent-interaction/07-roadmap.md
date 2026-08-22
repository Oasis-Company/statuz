# 实现路线图

> 从当前引擎状态到完整 Agent × Statuz 交互框架的渐进式实现路线。

---

## 总体策略

1. **引擎优先** — 先确保引擎 API 完整，再构建交互层
2. **CLI 先于 MCP** — CLI 接口开发成本低，验证后再封装为 MCP
3. **表征层最后** — arrow-map/niche/syn 依赖引擎稳定 API
4. **增量交付** — 每个阶段产出可验证的交付物

---

## Phase 1: 引擎能力扩展（当前 → 7 天）

**目标**: 补齐引擎缺少的 API，使框架提案所需的所有原语就绪

| 任务 | 文件 | 交付物 | 优先级 |
|------|------|--------|--------|
| `subgraph()` 增加 `min_weight` 参数 | `graph/query.rs` | 权重过滤的子图提取 | P0 |
| `InjectionConfig` 类型定义 | `graph/types.rs` | 注入配置结构体 | P0 |
| `SubAgentResult` 契约类型 | `graph/types.rs` | 结构化结果契约 | P1 |
| `FailurePolicy` 错误策略类型 | `graph/types.rs` | 错误分级策略 | P1 |
| `DriftReport` / `DriftType` 类型 | `graph/types.rs` | 漂移检测类型 | P2 |
| 审计日志写入逻辑 | `cluster/cluster.rs` | `AuditEntry` 写入 | P2 |

**验证**: `cargo test` + `cargo run -- self-test` 全部通过

---

## Phase 2: 注入层 CLI（7 天 → 14 天）

**目标**: `statuz inject` 命令可用，Agent 可以通过 CLI 获取注入上下文

| 任务 | 文件 | 交付物 | 优先级 |
|------|------|--------|--------|
| `statuz inject` CLI 命令 | `main.rs` | 注入命令注册 | P0 |
| 注入逻辑实现（subgraph + 权重过滤 + 格式化） | `graph/inject.rs` | 注入核心函数 | P0 |
| Markdown 格式输出 | `graph/inject.rs` | 人类可读的注入上下文 | P0 |
| JSON 格式输出 | `graph/inject.rs` | 机器可读的注入上下文 | P1 |
| ACE 式 Delta 增量更新 | `graph/inject.rs` | 上下文增量演化 | P2 |

**验证**: `statuz inject --seeds payment-service --depth 2 --min-weight 0.5 --format markdown` 输出正确的拓扑上下文

---

## Phase 3: MCP 桥接（14 天 → 21 天）

**目标**: 6 个查询 + 注入作为 MCP 工具暴露，Agent 可以通过 MCP 协议访问 Statuz

| 任务 | 文件 | 交付物 | 优先级 |
|------|------|--------|--------|
| `statuz-core-mcp` crate 创建 | `crates/statuz-core-mcp/` | MCP 桥接 crate | P0 |
| 6 个查询的 MCP 工具实现 | `crates/statuz-core-mcp/` | 查询工具集 | P0 |
| `statuz/inject` MCP 工具 | `crates/statuz-core-mcp/` | 注入工具 | P0 |
| 错误处理与结构化返回 | `crates/statuz-core-mcp/` | 完整的错误映射 | P1 |
| MCP server 注册与发现 | `crates/statuz-core-mcp/` | 可被 MCP 客户端发现 | P1 |

**验证**: 在 Claude Code / TRAE 中通过 MCP 调用 `statuz/subgraph` 和 `statuz/inject`

---

## Phase 4: 表征层实现（21 天 → 35 天）

**目标**: arrow-map 解析器、niche 漂移检测、syn 提案审批可用

| 任务 | crate | 交付物 | 优先级 |
|------|-------|--------|--------|
| arrow-map 解析器（自然语言 → 引擎操作） | `arrow-map/` | 文本解析器 | P0 |
| arrow-map 解析器（结构化输入 → 引擎操作） | `arrow-map/` | 结构化解析器 | P1 |
| niche 子图比较 | `niche/` | 基础子图差异分析 | P1 |
| niche 漂移检测 | `niche/` | 语义漂移检测 | P2 |
| syn 提案工作流 | `syn/` | 提案创建 + 审批 + 审计 | P1 |
| syn 自动合并策略 | `syn/` | 低风险变更自动合并 | P2 |

**验证**: arrow-map "payment-service 依赖 user-db" → `engine.add_edge("payment", "user", "depends_on")`

---

## Phase 5: Multi-Agent 协调器（35 天 → 45 天）

**目标**: 基于 Statuz 的 Multi-Agent 协调器可用，支持 DAG 任务调度

| 任务 | 文件 | 交付物 | 优先级 |
|------|------|--------|--------|
| `statuz-coordinator` crate 创建 | `crates/statuz-coordinator/` | 协调器 crate | P0 |
| TaskGraph 定义与调度 | `crates/statuz-coordinator/` | DAG 任务图 | P0 |
| Subagent 生命周期管理 | `crates/statuz-coordinator/` | 创建/执行/销毁 | P0 |
| 上下文注入（复用 Phase 2） | `crates/statuz-coordinator/` | 自动注入 | P1 |
| 结果聚合 | `crates/statuz-coordinator/` | 多 Subagent 结果合并 | P1 |
| 错误分级处理 | `crates/statuz-coordinator/` | 错误策略 | P1 |
| Swarm 模式（多 Coordinator 并行） | `crates/statuz-coordinator/` | 并行协调 | P2 |

**验证**: 一个 5 任务的 DAG 正确调度，自动并行独立任务，串行依赖任务

---

## Phase 6: Dashboard 可视化 + 集成（45 天 → 50 天）

**目标**: Dashboard 可以渲染 Agent 执行轨迹和拓扑变更对比

| 任务 | 文件 | 交付物 | 优先级 |
|------|------|--------|--------|
| SVG 子图渲染器 | `docs/` 或新 crate | 从 SubgraphResult 生成 SVG | P1 |
| SVG 变更对比渲染器 | `docs/` 或新 crate | 从 DiffResult 生成对比图 | P1 |
| SVG 影响半径渲染器 | `docs/` 或新 crate | 从 ImpactResult 生成影响图 | P2 |
| Agent 执行时间线 | Dashboard 前端 | 展示 Agent 查询路径 | P2 |

**验证**: `statuz subgraph --render-svg output.svg` 生成可用的拓扑图

---

## 依赖关系图

```
Phase 1 (引擎扩展)
  └── Phase 2 (注入层 CLI) ──→ Phase 3 (MCP 桥接)
        └── Phase 4 (表征层) ──→ Phase 5 (Multi-Agent)
              └── Phase 3 ──→ Phase 6 (Dashboard)
```

Phase 1 是所有后续阶段的前置条件。Phase 2 和 Phase 3 可以部分并行（CLI 和 MCP 的底层逻辑相同）。Phase 4 依赖 Phase 2 的注入能力。Phase 5 依赖 Phase 2+3+4。Phase 6 依赖 Phase 3。

---

## 核心原则清单

- [ ] Context Injection 而非 Inheritance
- [ ] 权重感知的上下文选择
- [ ] 增量 Delta 更新（ACE 模式）
- [ ] 结构化契约而非自然语言通信
- [ ] 独立 transcript / 工具 / 预算隔离
- [ ] DAG 任务调度（自动并行 + 串行）
- [ ] 分级错误处理（Abort / Skip / Retry / Fallback）
- [ ] 变更不直接写入 Cluster，走 syn 提案审批
- [ ] 每次变更可审计
- [ ] Dashboard 是只读层，Agent 不直接操作 DOM