# Dashboard 可视化集成

> Agent 执行过程的拓扑可视化，以及执行结果的 diff 可视化。

---

## 核心原则

1. **Dashboard 是只读层** — Agent 不直接操作 DOM，通过 Statuz 生成可视化数据
2. **可视化即序列化** — 任何 `SubgraphResult` 或 `DiffResult` 都可以序列化为 SVG 图
3. **Agent 执行轨迹可视化** — 显示 Agent 的查询路径、变更范围、影响半径

---

## 可视化管线

```
Agent 执行
  ↓
Statuz 引擎生成结构化结果
  ├── SubgraphResult → SVG 子图
  ├── DiffResult     → 差异对比图（红色=移除，绿色=新增）
  ├── ImpactResult   → 影响半径图（高亮受影响节点）
  └── PathResult     → 路径图（高亮路径）
  ↓
Dashboard 渲染
  └── 用户可视化查看
```

---

## 可视化类型

### 1. 子图可视化

`subgraph()` → 一个有向图，种子节点居中，相邻节点展开。用于 Agent 理解拓扑。

### 2. 变更对比图

`diff()` → 两个 Cluster 的并排对比。红色虚线 = 移除的边，绿色实线 = 新增的边。用于 Agent 执行完后的变更审查。

### 3. 影响半径图

`impact()` → 以变更节点为中心，用不同透明度表示影响深度。距离越远透明度越高。用于 Agent 评估变更风险。

### 4. 执行轨迹图

显示 Agent 在本次执行中调用了哪些查询、访问了哪些节点、最终修改了哪些部分。用于用户理解 Agent 的行为。

---

## Agent 可视化集成

```
Agent 执行了 "重构 payment-service 依赖"
  → 在 Dashboard 上生成一条时间线:
    1. [10:00] 注入: payment-service 子图 (12 节点)
    2. [10:01] 查询: impact(user-db) → 影响 3 个服务
    3. [10:03] 查询: traverse(payment-service)
    4. [10:05] 修改: 新增 edge payment→new-cache
    5. [10:06] 验证: validate() → is_valid: true
    6. [10:07] 同步: diff 完成，生成 SynProposal
  → 用户点击时间线节点查看详情
```

---

## 引擎现有能力映射

| 可视化需求 | 引擎现有能力 | 需要新增 |
|-----------|-------------|---------|
| 子图 SVG | `SubgraphResult` ✅ | 需要 SVG 渲染器 |
| 变更对比 | `DiffResult` ✅ | 需要 SVG 渲染器 |
| 影响半径 | `ImpactResult` ✅ | 需要 SVG 渲染器 |
| 路径 | `PathResult` ✅ | 需要 SVG 渲染器 |
| 执行轨迹 | 无 | 需要 Agent 执行日志 |
| 时间线渲染 | 无 | Dashboard 前端功能 |