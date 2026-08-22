# Knowledge Base · 04-architecture

Statuz 的架构分层总览与架构决策记录（ADR）索引。这是"Statuz 怎么搭"的唯一 canonical 载体。

---

## Statuz 三层架构（canonical）

Statuz 不是一个单层图引擎，而是一个三层结构。**越往顶层，离"意义"越近；越往底层，离"机器"越近。**

| 层 | 英文 | 负责什么 | 不负责什么 | 现状 |
|---|---|---|---|---|
| **表征层** | Representation | 语义 + 方向 + 释放：把拓扑翻译成 agent 可消费的状态；SYN 的方向载子、共创裁决、不确定性升级阀 | 不碰纯拓扑算法 | 空壳占位（`syn`/`niche`） |
| **注意力层** | Attention | 释放与衰减：决定"什么此刻重要、什么随用户走过而衰减"，让状态主动浮出 | 不存关系本身 | 概念层，尚未立项 |
| **内核层** | Kernel | 纯拓扑：图、节点/边/邻接表、五个查询、存储容器 | 不承载语义主见 | 已实现（`statuz-core`，经审查全绿） |

### 归纳

- **内核层**已经建成，经全盘审查确认：图引擎、五大查询（traverse/impact/path/subgraph/validate）、Cluster/Field/Bridge、存储管线（msgpack+blake3+argon2+zstd+chacha20）、压缩/加密/内容寻址、86 单元测试 + property test。
- **表征层**（`arrow-map`/`niche`/`syn`）与**注意力层**（释放与衰减）仍未实现——这正是 Statuz 对外主张（"主动释放状态"）所在，也是当前研发重点。
- 三层不是层层包裹，而是**方向不同的关注面**：内核管"有什么"，表征管"它意味着什么"，注意力管"什么此刻亮起"。

---

## 架构原则（从各 ADR 固化）

- **内核零语义**：内核只做纯拓扑，不承担语义解读或方向机制（ADR-0001）。
- **功能由底座涌现**：架构不"设计"出来，让它在最小闭环跑通后"长出来"。
- **少打扰优先**：释放与升级以不打扰用户为原则，只在真正影响方向处交还控制权。

---

## ADR 索引

| ADR | 决策 | 状态 |
|---|---|---|
| [ADR-0001](./ADR-0001-SYN-representation-layer.md) | SYN 定位于表征层，不在内核；存量 Syn 类型为表征层领域类型，迁移待 O4 | **Accepted** |

---

## 尚未锚定的开放架构问题

- 注意力层（释放与衰减）的机制尚未定义——只知存在，未立项。
- 三层各自的 crate 归属在部分层面仍未固定（如表征层内部 `syn` vs `niche` 分工）。
- 内核 `types.rs` 的 Syn 类型是否迁出、迁到哪，待执行计划 O4 裁决。

---

## Field 相关锚点（2026-08-22）

- **Field Class 设计定稿**：[`field-class-design.md`](./field-class-design.md) — "为什么 field 要有 class"（从可被握住导出）+ 四项最小公理（身份/归属/内聚/演变）。执行计划见 [`paper/field-class-execution-plan.md`](../../paper/field-class-execution-plan.md)。
- 归属说明：Field 的**形态**（A/B/C/D 公理落地）属于**内核层**（`statuz-core` 的 Cluster/Field）；field 的**类型本体**（类型间关系等）属**表征层**，是公理 C 之后的后续阶段，不在此混为一谈。