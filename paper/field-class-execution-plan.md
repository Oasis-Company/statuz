# Field Class 执行计划（草案 v0.1）

> 性质：执行草案，非定稿。承接 `knowledge-base/04-architecture/field-class-design.md` 的定稿（为什么 + 公理框架 A/B/C/D）。
> 归属：`crates/statuz-core`（Field 在内核 Cluster 层，与 SYN 不同——SYN 在表征层 `crates/syn`）。
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development（推荐）或 executing-plans。步骤用 `- [ ]` 追踪。

**Goal:** 把 field 从"能贴标签的分类容器"推进到"**可被握住的存在物**"——装上 A（身份）/B（归属）/C（内聚）/D（演变）四项最小公理，且在 statuz 自举图上每一项都过可证伪判据。**这是抽象骨架的工程落地，不是发现/置信/SYN 集成。**

---

## 现状底线（动手前必须承认的约束）

- `Field = { nodes, bridges, type_: Option<FieldType>, ... }`；`FieldType = { kind: String, decided_by, decided_at }`，`set_type()` 已实现（field-lifecycle §7 ②）。
- 现状只覆盖消费侧问题 ④ 的**一半**（"谁定的"锚点了，但"用什么规则"没锚）。①②③⑤（边界/内聚/一致性/演化）无实现。
- 内核零非 serde 依赖、记忆优先、TDD、库代码零 unwrap。（AGENTS.md）
- 自举声明：首个被测对象是 statuz 自身 repo 的图——与该实验系列一贯做法一致。

---

## 任务分解（每项结束都可验证、可提交）

### Task A1 · 身份公理落地
- **要完成**：给 field 提供与节点排列解耦的身份锚点。现状 field 已有 id；需验证其确实独立于节点集（删光字段节点再读回身份不变），并补一条测试钉死该不变式。
- **Files**: `crates/statuz-core/src/cluster/field.rs`（+测试）
- **判据**: `Field` 删光字段节点后 id 与身份对象不变；新增测试转绿。

### Task A2 · 归属公理落地
- **要完成**：提供 `belongs_to(field)` 与归属唯一性检查；删除 field 时归属级联策略。Node 归属 field 的中央登记（`Cluster` 的节点注册表在此承接）。
- **Files**: `crates/statuz-core/src/cluster/cluster.rs` / `field.rs`（+测试）
- **判据**: 全图每个节点 `belongs_to` 唯一且确定；删除 field 级联正确；新增测试转绿。

### Task A3 · 内聚公理落地
- **要完成**：一个**最小内聚度量**（连通性/桥密度，选一类先做），暴露为 field 的一个可读属性，不引入内部密集度猜测。
- **Files**: 新建 `crates/statuz-core/src/cluster/cohesion.rs`（+测试）
- **判据（软判据，看区分度）**：statuz 自举图上，连通 field 度量显著高于硬拼 field；若区分度进灰区→记观察，不硬凑。
- **承接**：该度量即 SYN 阶段四证据厚度/不确定度的图侧输入（未来接线）。

### Task A4 · 演变公理落地
- **要完成**：给"field 失真"一个可测信号（内聚跌破阈值 / 分裂成两个连通分量）；只捕信号，不实现重划流程。
- **Files**: 新建 `crates/statuz-core/src/cluster/evolution.rs`（+测试）
- **判据（软判据）**：注入无关节点使 field 失真，能稳定捕获"值得重划"信号。

---

## 判定口径（对齐 field-class-design §5）

- **硬约束**：A1 / A2 —— 不成立则"可被握住"前提坍塌，整案退回标签，止损。
- **软判据**：A3 / A4 —— 看重合度/区分度；灰区记观察、不硬凑；结果回写设计文档 §5。

---

## 集成电路（跨任务，作为收尾 Task A5）
- 让上述四项以一个一致性检查器对外成一体：`validate_field_class(field) -> {identity_ok, membership_ok, cohesion, stale}`（直接复用既有五查询之一 `validate` 的骨架）。
- **Files**: 复用 `crates/statuz-core/src/graph/query.rs` / `cluster.rs` 的 validate 职责。
- **判据**: 对 statuz 自举图跑出结构化结果；`cargo test` + `cargo run -- self-test` 全绿、clippy 零警告。

---

## 明确不做的事（防过拟合）

- 不建类型本体/类型层级/类型间关系。
- 不实现类型演化/蜕变机制的完整版（只 D 的失真相号）。
- 不扩 `kind: String` 结构，不触碰 `type_` 字段现有边界。
- 不做发现/置信/SYN 集成——那是 field-class-design 明确 gate 后续阶段。

---

## 验证清单（每次 commit 前）

- [ ] `cd crates/statuz-core && cargo test` 全绿
- [ ] `cargo run -- self-test` 通过
- [ ] `cargo fmt` + 无 clippy 警告
- [ ] 库代码零 `unwrap()`
- [ ] 无未用变量/导入

---

## 开放备注（不阻塞入门，但记录）

- 内聚度量选"连通性 vs 桥密度"先做哪个，Task A3 开工时定——倾向先做连通性（语义最简单、最易证伪）。
- A/D 的"统计上够判伪"的自举图规模：先接受 statuz 自身图可能不完整，完整度不是本计划变量。
- 与 `field-generation-experiment.md`（H1/H2 事后判定）并行不冲突：本计划约束已存在 field，那实验测"发现 blocks"的能力，两者同源不同测。

---

## 进度日志

- **2026-08-22 · 计划起草**：设计定稿 `field-class-design.md` + 本执行计划 v0.1 建立。待用户初审后开工 Task A1。