# 表征层集成

> 三个 placeholder crate（arrow-map、niche、syn）作为 Agent 与引擎之间的语义解释层。Agent 通过它们与引擎交互，而不是直接调用引擎 API。

---

## 核心原则

1. **表征层是 Agent 的接口，Engine 是后端** — Agent 不直接调用 `GraphEngine::add_edge()`，而是通过 arrow-map 解析语义
2. **每个 crate 对应一个交互阶段** — arrow-map（输入）、niche（理解）、syn（决策）
3. **不创造独立存储格式** — 所有数据最终存储在 Cluster 中，表征层只是解释器 [$TRAE_REF](http://m.toutiao.com/group/7662419598708458020/)

---

## 三层表征

```
Agent 的自然语言 / 结构化输入
  ↓
arrow-map ← 输入桥接：将文本/指令解析为引擎操作
  ↓
Engine (statuz-core) ← 执行图操作
  ↓
niche ← 语义理解：比较子图、检测漂移、解释差异
  ↓
syn ← 决策审计：变更提案、审批、记录
  ↓
Cluster (.stz 文件) ← 持久化
```

---

## arrow-map: 输入桥接

### 职责

将 Agent 的自然语言或结构化描述解析为引擎 API 调用。

### Agent 交互示例

```
Agent 说: "payment-service 依赖 user-db，权重 0.95"
  → arrow-map 解析:
    type: "add_edge"
    source: "payment-service"
    target: "user-db"
    relation: "depends_on"
    weight: 0.95
  → 调用 engine.add_edge(...)

Agent 说: "帮我看看支付生态里有哪些组件"
  → arrow-map 解析:
    type: "query"
    query: "subgraph"
    seeds: ["payment-service"]
    depth: 2
  → 调用 engine.subgraph(...)
```

### 输入格式

```rust
/// arrow-map 接受的输入格式
enum ArrowMapInput {
    /// 自然语言文本（需要 LLM 辅助解析）
    NaturalLanguage(String),
    /// 结构化指令（直接解析）
    Structured {
        operation: Operation,  // AddNode | AddEdge | Query | ...
        params: HashMap<String, Value>,
    },
    /// Arrow Map 格式（有向图描述语言）
    ArrowMap(String),
}
```

### 当前状态

`crates/arrow-map/` — 占位符，无功能逻辑。需要实现文本解析器。

---

## niche: 语义理解

### 职责

比较两个时间点的拓扑状态，检测"语义漂移" —— 不是简单的结构差异，而是理解"这种变化意味着什么"。

### Agent 交互示例

```
Agent 说: "新版本和旧版本在架构上有什么不同？"
  → niche 分析:
    1. 调用 Cluster::diff() 获取结构差异
    2. 分析差异的语义含义:
       - "新增了一个支付网关，说明架构走向了解耦"
       - "移除了一个数据库直接连接，引入了缓存层"
       - "整体影响半径从 3 缩小到 2，说明架构更模块化"
    3. 返回 JSON 格式的语义分析报告

Agent 说: "这个架构变化是良性还是恶性的？"
  → niche 检测:
    1. 比较当前拓扑与"理想拓扑"（用户定义的参考架构）
    2. 检测漂移方向和幅度
    3. 返回: { drift_type: "improvement", confidence: 0.85, ... }
```

### 漂移检测类型

```rust
enum DriftType {
    /// 良性漂移：架构优化
    Improvement,
    /// 退化漂移：架构劣化（如循环依赖、过度耦合）
    Degradation,
    /// 中立漂移：重构或迁移
    Neutral,
    /// 边界漂移：跨出了预期的边界
    BoundaryViolation,
}

struct DriftReport {
    drift_type: DriftType,
    confidence: f64,
    impacted_nodes: Vec<NodeId>,
    interpretation: String,  // 人类可读的解释
    suggestions: Vec<String>,  // 改进建议
}
```

### 当前状态

`crates/niche/` — 占位符，无功能逻辑。需要实现子图比较 + 语义分析。

---

## syn: 变更决策

### 职责

将 Agent 的变更意图转化为可审计的提案，支持审批流程。

### Agent 交互示例

```
Agent 完成了修改
  → syn 生成提案:
    {
      "id": "syn-20260715-001",
      "summary": "Add cache layer between payment-service and user-db",
      "agent": "architecture-agent-v2",
      "diff": { ... },
      "options": [
        { "strategy": "Overwrite", "risk": "low" },
        { "strategy": "Skip", "risk": "none", "reason": "Keep existing cache" }
      ],
      "status": "UnderReview"
    }
  → 用户或 Coordinator 审批
  → 执行 merge 或 拒绝
  → 写入审计日志
```

### 提案生命周期

```
Draft → UnderReview → Approved → Implemented
  ↓                       ↓
  (可修改)            Rejected (关闭)
```

### 当前状态

`crates/syn/` — 占位符，无功能逻辑。`SynProposal` 类型在 `statuz-core` 中已定义，但审批工作流和审计写入未实现。

---

## 引擎现有能力映射

| 表征层需求 | 引擎现有能力 | 需要新增 |
|-----------|-------------|---------|
| arrow-map 解析 | 无 | 完整实现 `arrow-map` crate |
| niche 语义漂移 | `diff()` ✅ + `validate()` ✅ | 完整实现 `niche` crate |
| syn 提案审批 | `SynProposal` 类型 ✅ | 完整实现 `syn` crate |
| 审计写入 | `AuditEntry` 类型 ✅ | 写入逻辑 |
| 三层的 Agent 桥接 | 无 | 统一的 Agent→Engine 接口层 |