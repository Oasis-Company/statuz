# 回写同步协议

> Agent 完成工作后，将变更同步回 Statuz Cluster。通过 diff → syn 提案 → 合并 的流程确保变更可审计。

---

## 核心原则

1. **Agent 不直接修改 Cluster** — Agent 通过 `diff()` 生成变更报告，通过 `syn` 提案走审批流程
2. **每次变更可审计** — 谁改了什么、为什么改、什么时候改，全部记录在 `AuditEntry`
3. **Agent 的修改是"提议"，不是"执行"** — 最终合并决策由用户或 Coordinator 做出

---

## 回写流程

```
Agent 完成工作
  ↓
Step 1: diff()
  ├── 比较当前 Cluster 与 Agent 修改后的 Cluster
  └── 返回 DiffResult { added_nodes, removed_nodes, changed_edges, ... }
  ↓
Step 2: syn 提案生成
  ├── 将 DiffResult 包装为 SynProposal
  ├── 包含：summary、description、options（merge strategies）
  └── 记录：谁、什么、为什么、什么时候
  ↓
Step 3: 合并决策
  ├── 用户审批 → 执行 merge
  ├── Coordinator 自动审批（低风险） → 执行 merge
  └── 拒绝 → 丢弃提案，Agent 收到反馈
  ↓
Step 4: 审计记录
  └── 所有步骤写入 AuditEntry，follow Cluster 的 audit_trail
```

---

## SynProposal 结构

```rust
struct SynProposal {
    id: String,                    // 唯一提案 ID
    summary: String,               // 一句话总结
    description: String,           // 详细描述变更原因
    agent_id: String,              // 发起变更的 Agent
    diff: DiffResult,              // 变更内容
    options: Vec<SynOption>,       // 合并选项
    audit_trail: Vec<AuditEntry>,  // 审计记录
    status: SynStatus,             // Draft → UnderReview → Approved/Rejected
    created_at: String,
    reviewed_at: Option<String>,
}

enum SynStatus {
    Draft,
    UnderReview,
    Approved,
    Rejected,
    Implemented,
}
```

---

## Agent 回写示例

```
Agent 完成了 "重构 payment-service 的依赖关系"
  → 调用 statuz/diff("payment-service.stz", "payment-service_v2.stz")
  → 返回 DiffResult:
    added_edges: [
      { source: "payment-service", target: "new-cache", relation: "depends_on", weight: 0.7 }
    ]
    removed_edges: [
      { source: "payment-service", target: "old-cache", relation: "depends_on" }
    ]
    changed_nodes: [
      { old: { label: "Payment Service v1" }, new: { label: "Payment Service v2" } }
    ]
  → 生成 SynProposal:
    summary: "Replace old-cache with new-cache in payment-service"
    options: [MergeStrategy::Overwrite, MergeStrategy::Skip]
  → 写入审计: { agent: "trae-agent-01", action: "refactor", timestamp: "..." }
```

---

## 引擎现有能力映射

| 同步需求 | 引擎现有能力 | 需要新增 |
|---------|-------------|---------|
| diff 生成 | `Cluster::diff()` ✅ | 无 |
| 合并 | `Cluster::merge()` ✅ | 无 |
| 审计记录 | `AuditEntry` 类型已定义 ✅ | 需要实际的写入逻辑 |
| SynProposal | `SynProposal` 类型已定义 ✅ | 需要 `syn` crate 的决策逻辑 |
| 提案审批 | 无 | `syn` crate 的审批工作流