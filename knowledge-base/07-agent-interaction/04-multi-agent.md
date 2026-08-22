# Multi-Agent 协调

> 多个 Agent 如何通过 Statuz 协调工作。基于 Claude Code 的三层 Runtime 模型（Subagent → Coordinator → Swarm），每个 Agent 有独立的上下文隔离。[$TRAE_REF](http://m.toutiao.com/group/7662419598708458020/)

---

## 核心原则

1. **上下文隔离** — 每个 Subagent 有独立的 transcript、独立的工具集、独立的 token 预算
2. **结构化委派** — Coordinator 通过 DAG 调度 Subagent，自动并行 + 自动串行
3. **Statuz 作为协调层** — 不是 Agent 之间直接通信，而是通过 Statuz Cluster 共享拓扑状态
4. **错误隔离** — 一个 Subagent 失败不崩溃整个系统（分级错误处理）

---

## 三层架构

```
Swarm (多个 Coordinator 并行)
  ├── Coordinator A (任务分解 + DAG 调度)
  │   ├── Subagent A1: "分析 payment-service 的依赖"
  │   ├── Subagent A2: "分析 user-service 的依赖"
  │   └── Subagent A3: "基于 A1+A2 的结果，重构服务拓扑"
  │       └── 所有 Subagent 通过 Statuz 注入/查询上下文
  ├── Coordinator B (并行处理另一个域)
  │   └── ...
  └── Coordinator C
      └── ...
```

---

## 任务图（DAG）调度

```
分析 payment-service      分析 user-service
  (statuz/impact)          (statuz/impact)
      ↓                          ↓
  分析依赖关系 ←──────────────────┘
  (statuz/traverse)
      ↓
  生成重构方案
  (statuz/subgraph + statuz/diff)
      ↓
  Apply 变更并验证
  (statuz/validate)
```

```rust
/// 任务图定义 —— Coordinator 调度 Subagent 的依据
struct TaskGraph {
    tasks: Vec<Task>,
    edges: Vec<(String, String)>,  // (task_id, depends_on)
}

struct Task {
    id: String,
    role: String,                  // Subagent 角色
    prompt: String,                // 任务描述
    context: HashMap<String, String>,  // 注入的上下文
    tools: Vec<String>,            // 可用的工具子集
    is_critical: bool,             // 是否关键任务
    max_retries: u32,
}
```

---

## Subagent 与 Statuz 的交互

```
Coordinator 接收到任务
  ↓
Step 1: 为 Subagent 构建 InjectionConfig
  └── seeds: 任务相关的节点
  └── depth: 2
  └── min_weight: 0.5
  └── format: Markdown
  ↓
Step 2: 调用 statuz/inject → 注入拓扑上下文到 Subagent 的初始 prompt
  ↓
Step 3: Subagent 执行过程中，通过 statuz/traverse / impact / path 查询
  ↓
Step 4: Subagent 完成，返回结构化结果
  └── { status: "success", output: "...", artifacts: [...] }
  ↓
Step 5: Coordinator 聚合结果，更新 Statuz Cluster
  └── statuz/diff → syn 提案 → 合并
```

---

## 上下文隔离的三层边界

**边界 1: 工具集隔离**

```
Subagent "code_analyzer" → 只能调用 statuz/traverse, statuz/impact, statuz/subgraph
Subagent "deployer"      → 只能调用 statuz/validate, statuz/diff
Subagent "doc_writer"    → 不能调用任何 statuz 查询（只读文件）
```

**边界 2: 注入上下文隔离**

```
Subagent A 的注入上下文：
  → 只包含 payment-service 相关的 12 个节点
Subagent B 的注入上下文：
  → 只包含 user-service 相关的 8 个节点
Coordinator 的上下文：
  → 包含两个 Subagent 的 seed 节点，但不包含它们的内部细节
```

**边界 3: Token 预算独立**

```
Subagent A: max_iterations=50, max_tokens=100000
Subagent B: max_iterations=30, max_tokens=80000
Coordinator: max_iterations=100, max_tokens=200000
```

---

## 错误处理策略

```rust
enum FailurePolicy {
    Abort,     // 关键任务失败 → 终止整个流程
    Skip,      // 非关键任务失败 → 跳过，用部分结果继续
    Retry(u32),// 有重试次数 → 指数退避重试
    Fallback(String), // 有备用角色 → 切换
}
```

---

## SubAgent 结果契约

```rust
struct SubAgentResult {
    status: Status,           // success | partial | failed
    output: String,           // 实际产出
    artifacts: Vec<String>,   // 产生的文件路径列表
    tool_calls_count: u32,    // 工具调用次数
    error: Option<String>,    // 失败原因
    metadata: HashMap<String, String>,  // 任务特定元数据
}
```

---

## 引擎现有能力映射

| 协调需求 | 引擎现有能力 | 需要新增 |
|---------|-------------|---------|
| 拓扑注入 | `subgraph()` ✅ | 需要 `min_weight` 参数 |
| 运行时查询 | 5 查询 ✅ | 无 |
| 变更检测 | `diff()` ✅ | 无 |
| 变更审计 | `AuditEntry` 类型 ✅ | 需要实际写入 |
| 任务图调度 | 无 | 新 crate: `statuz-coordinator` |
| Subagent 生命周期 | 无 | 新 crate 或 CLI 集成 |
| 结构化结果契约 | 无 | 需要定义契约类型 |
| 错误分级策略 | 无 | 需要定义错误策略类型