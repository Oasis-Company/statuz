# 注入层协议

> Agent 启动前，Statuz 将权重过滤后的拓扑上下文注入到 Agent 的初始 prompt。

---

## 核心设计原则

1. **Context Injection 而非 Inheritance** — Subagent 不应继承主 agent 的全部历史，只收到显式注入的信息 [$TRAE_REF](http://m.toutiao.com/group/7662419598708458020/)
2. **权重感知的上下文选择** — 不是所有边都平等，`Edge.weight` 决定包含/排除优先级
3. **增量式更新** — 不整体重写上下文，而是生成 Delta 增量合并（ACE 论文核心发现，延迟降低 86.9%）[$TRAE_REF](https://www.arxiv.org/abs/2510.04618)
4. **结构化输出** — 注入的数据是结构化图数据（JSON/msgpack），不是自然语言段落

---

## 注入配置

```rust
/// 注入层配置 —— 定义 Agent 启动前需要看到的拓扑范围
struct InjectionConfig {
    seeds: Vec<NodeId>,           // 种子节点：Agent 负责的模块
    depth: usize,                 // BFS 最大深度（默认 2）
    min_weight: f64,              // 权重阈值：只包含 weight >= 此值的边
    max_tokens: usize,            // 上下文 token 预算上限
    priority_relations: Vec<String>,  // 优先包含的关系类型
    include_meta: bool,           // 是否包含 meta 信息
    include_bridges: bool,        // 是否包含跨 Field 桥接
    format: OutputFormat,         // 输出格式：Markdown / JSON / Text
}

enum OutputFormat {
    Markdown,  // 人类可读，适合直接注入 Agent prompt
    Json,      // 结构化数据，适合程序化处理
    Text,      // 纯文本摘要，最小 token 消耗
}
```

## 注入执行流程

```
Agent 启动
  ↓
Statuz 读取 InjectionConfig
  ↓
Step 1: subgraph(seeds, depth) → 提取子图
  ↓
Step 2: 按 Edge.weight 过滤
  ├── weight >= 0.8 → 强制包含（关键依赖）
  ├── 0.5 <= weight < 0.8 → 按 token 预算有条件包含
  └── weight < 0.5 → 仅在 Agent 查到时返回
  ↓
Step 3: ACE 式上下文构建
  ├── Generator: 生成拓扑推理轨迹
  ├── Reflector: 从轨迹中蒸馏关键信息
  └── Curator: 整合为结构化注入上下文
  ↓
Step 4: 输出到 Agent 的初始 prompt
```

## 注入输出格式

### Markdown 格式（适合直接注入 Agent prompt）

```markdown
## 拓扑上下文 (Topology Context)

### 你的种子节点
- `payment-service` (service) — 支付核心服务

### 关键依赖 (weight >= 0.8)
- `payment-service` → `user-db` (depends_on, w=0.95)
- `payment-service` → `order-service` (depends_on, w=0.90)
- `api-gateway` → `payment-service` (routes_to, w=0.85)

### 次要依赖 (0.5 <= weight < 0.8)
- `payment-service` → `notification-service` (notifies, w=0.60)
- `payment-service` → `fraud-detection` (validates, w=0.55)

### 拓扑结构
- 总节点: 12 | 直接依赖: 5 | 间接依赖: 7
- 最大影响半径: 3 hop
```

### JSON 格式（适合程序化处理）

```json
{
  "version": "0.0.1",
  "injected_at": "2026-07-15T10:00:00Z",
  "seeds": ["payment-service"],
  "subgraph": {
    "nodes": [
      { "id": "payment-service", "type": "service", "label": "Payment Service" },
      { "id": "user-db", "type": "database", "label": "User Database" }
    ],
    "edges": [
      { "source": "payment-service", "target": "user-db",
        "relation": "depends_on", "weight": 0.95, "tier": "critical" }
    ]
  },
  "stats": {
    "total_nodes": 12,
    "critical_edges": 3,
    "secondary_edges": 2,
    "estimated_tokens": 850
  }
}
```

## ACE 式上下文演化

借鉴 ACE 论文的 Generator → Reflector → Curator 模式，Agent 执行过程中注入上下文可以**持续演化**：

```
首次注入 → Agent 执行 → 发现新上下文 → 生成 Delta 增量
  → 合并到注入上下文 → 下次 Agent 启动时使用更新后的上下文
```

Delta 增量格式：

```json
{
  "delta_id": "delta-001",
  "base_injection": "injection-abc123",
  "additions": [
    { "type": "node", "id": "cache-service",
      "reason": "Agent discovered payment-service also depends on cache" }
  ],
  "weight_adjustments": [
    { "edge": "payment→user-db", "old_weight": 0.95, "new_weight": 0.85,
      "reason": "Agent found user-db is not on critical path for payment flow" }
  ]
}
```

## CLI 接口

```bash
statuz inject \
  --seeds payment-service,order-service \
  --depth 2 \
  --min-weight 0.5 \
  --format markdown \
  --output inject-context.md
```

## MCP 接口

```
Tool: statuz/inject
Arguments:
  - seeds: string[]
  - depth: number (optional, default 2)
  - min_weight: number (optional, default 0.0)
  - format: "markdown" | "json" | "text" (optional, default "markdown")
Returns: InjectedContext
```

## 引擎现有能力映射

| 注入层需求 | 引擎现有能力 | 需要新增 |
|-----------|-------------|---------|
| 子图提取 | `subgraph(seeds, depth, relation?)` ✅ | 无 |
| 权重过滤 | `Edge.weight: f64` 已存在 ✅ | 需要 `min_weight` 参数 |
| 结构化输出 | `serde::Serialize` ✅ | 无 |
| ACE 式演化 | 无 | 新增 `InjectionDelta` 类型 + 合并逻辑 |
| 桥接信息 | `Cluster.bridges` ✅ | 无 |

## 关键决策

**Q: 注入层实现在哪个层级？**

**A: CLI + MCP 双通道** — CLI 用于初始注入（快速、离线），MCP 用于运行时增量更新（灵活、在线）。`statuz inject` 是 CLI 命令，`statuz/inject` 是 MCP 工具，两者复用同一个底层函数。

**Q: 注入上下文应该多详细？**

**A: 由 token 预算驱动** — `max_tokens` 参数决定注入的详细程度。引擎按权重排序，在预算内填充最高优先级的节点和边。超出预算的部分仅在 Agent 运行时按需查询时返回。

**Q: 权重如何确定？**

**A: 由用户或自动化工具在构建 Cluster 时设定** — 引擎不做权重推断。权重是图数据的一部分，表示"这条边对于拓扑理解的重要性"。CLI 可以提供一个 `--auto-weight` 标记，基于度数中心性自动计算初始权重。