# 运行时查询协议

> Agent 执行过程中，按需通过 Statuz 查询拓扑信息。这是注入层的补充——注入层提供"该知道的"，运行时查询提供"想知道的"。

---

## 核心原则

1. **按需查询，不做预判** — Agent 遇到不确定的依赖关系时主动查询，不依赖注入层的全量数据
2. **结构化契约** — 查询返回结构化图数据，不是自然语言段落。Agent 可以直接解析和操作 [$TRAE_REF](http://m.toutiao.com/group/7662419598708458020/)
3. **查询即工具** — 每个查询映射为一个 MCP 工具，Agent 通过工具调用访问

---

## 查询映射

| 查询 | 何时使用 | 典型场景 | 返回格式 |
|------|---------|---------|---------|
| `traverse(id, relation?)` | Agent 想探索相邻节点 | "支付模块依赖哪些服务？" | `Vec<Edge>` |
| `impact(id)` | Agent 想评估变更风险 | "如果改 user-db 的 schema 会影响谁？" | `ImpactResult` |
| `path(a, b)` | Agent 想规划路径 | "从 api-gateway 到 database 怎么走？" | `PathResult` |
| `subgraph(seeds, depth, relation?)` | Agent 想聚焦一个子域 | "支付生态里有哪些组件？" | `SubgraphResult` |
| `validate()` | Agent 做完修改后检查一致性 | "我改完后的图还是完整的吗？" | `ValidationResult` |
| `diff(&other)` | Agent 比较两个版本 | "这次改动和上次有什么不同？" | `DiffResult` |

---

## MCP 工具定义

```json
{
  "tools": [
    {
      "name": "statuz/traverse",
      "description": "从指定节点出发，遍历相邻节点和边",
      "inputSchema": {
        "type": "object",
        "properties": {
          "node_id": { "type": "string", "description": "起始节点 ID" },
          "relation": { "type": "string", "description": "可选，按关系类型过滤" },
          "direction": { "type": "string", "enum": ["outgoing", "incoming", "both"], "default": "both" }
        },
        "required": ["node_id"]
      }
    },
    {
      "name": "statuz/impact",
      "description": "评估如果某个节点变更，受影响的范围（blast radius）",
      "inputSchema": {
        "type": "object",
        "properties": {
          "node_id": { "type": "string", "description": "变更的节点 ID" },
          "max_depth": { "type": "number", "description": "最大影响深度", "default": 5 }
        },
        "required": ["node_id"]
      }
    },
    {
      "name": "statuz/path",
      "description": "查找两个节点之间的最短路径",
      "inputSchema": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" }
        },
        "required": ["from", "to"]
      }
    },
    {
      "name": "statuz/subgraph",
      "description": "从种子节点提取子图（BFS，支持深度和关系过滤）",
      "inputSchema": {
        "type": "object",
        "properties": {
          "seeds": { "type": "array", "items": { "type": "string" } },
          "depth": { "type": "number", "default": 2 },
          "relation": { "type": "string", "description": "可选关系过滤" },
          "min_weight": { "type": "number", "description": "最小权重过滤", "default": 0.0 }
        },
        "required": ["seeds"]
      }
    },
    {
      "name": "statuz/validate",
      "description": "检查图结构一致性",
      "inputSchema": {
        "type": "object",
        "properties": {
          "field": { "type": "string", "description": "可选，指定 Field" }
        }
      }
    },
    {
      "name": "statuz/diff",
      "description": "比较当前 Cluster 与另一个版本的差异",
      "inputSchema": {
        "type": "object",
        "properties": {
          "other_cluster_path": { "type": "string", "description": "另一个 Cluster 文件路径" },
          "field": { "type": "string", "description": "可选，只比较特定 Field" }
        },
        "required": ["other_cluster_path"]
      }
    }
  ]
}
```

---

## Agent 使用模式

### 探索式查询（Agent 不确定时）

```
Agent: "我需要修改 payment-service 的接口，但不确定谁会受影响"
  → 调用 statuz/impact("payment-service")
  → 返回 ["user-service", "order-service", "notification-service"]
  → Agent 决定逐个检查这些服务的依赖
```

### 验证式查询（Agent 做完修改后）

```
Agent: "我改完了 payment-service 的接口定义"
  → 调用 statuz/validate()
  → 返回 { is_valid: true, issues: [] }
  → Agent 确认修改没有破坏图结构
```

### 比较式查询（Agent 需要理解变更上下文）

```
Agent: "这个版本和上一个版本有什么不同？"
  → 调用 statuz/diff("previous_version.stz")
  → 返回 { added_edges: [...], removed_edges: [...] }
  → Agent 看到新增的 edge 是 expected，移除的 edge 也在计划中
```

---

## 错误处理

```
statuz/traverse → 节点不存在
  → 返回 { error: "node_not_found", node_id: "xxx" }
  → Agent 检查拼写或调用 validate 检查 Cluster 状态

statuz/impact → 图为空
  → 返回 { error: "empty_graph" }
  → Agent 提示用户先构建图

statuz/path → 路径不存在
  → 返回 { exists: false, path: [] }
  → Agent 报告两个节点没有连接

statuz/subgraph → 种子节点不存在
  → 返回 { error: "seed_not_found", seeds: ["xxx"] }
  → Agent 提示用户检查种子节点 ID
```

---

## 引擎现有能力映射

| 运行时查询 | 引擎现有能力 | 需要新增 |
|-----------|-------------|---------|
| traverse | `GraphEngine::traverse()` ✅ | 无 |
| impact | `GraphEngine::impact()` ✅ | 无 |
| path | `GraphEngine::path()` ✅ | 无 |
| subgraph | `GraphEngine::subgraph()` ✅ | 需要 `min_weight` 参数 |
| validate | `GraphEngine::validate()` + `Cluster::validate()` ✅ | 无 |
| diff | `Cluster::diff()` ✅ | 无 |
| MCP 桥接 | 无 | 需要实现 `statuz-core-mcp` crate