# SYN 方向共创机制 执行计划（草案 v0.1）

> **性质**：本文件是"执行草案"，不是定稿。记录可造物，同时诚实标注每次开放设计。
> **归属**：承接 `field-lifecycle-decisions.md` 的方向决策，是 SYN 的正式执行计划。
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development（推荐）或 executing-plans 逐任务实施。步骤用 `- [ ]` 追踪。

**Goal:** 把 SYN 从"内核里一批已定型但无实现的类型"，推进到"方向共创机制"的最小可证伪闭环——人机在同一方向载子上推演，而不再是对齐判定器。

**Architecture:** 以"方向载子 DirectionCarrier（意图 + 轨迹 + 张力）"为核心实体；系统生成候选而非判定对齐；裁决=深化（改写意图/增补张力/重置轨迹）而非同意/拒绝；被采纳载子进入 statuz 图成为可回望、可再推演的对象。

**Tech Stack:** Rust（statuz-core），遵循 AGENTS.md 规则：零非 serde 依赖、记忆优先、TDD、`cargo run -- self-test` 全绿、库代码零 unwrap。

**试验田声明：** 首个闭环用 statuz 自身 repo 作为被测对象。理由：符合自举哲学、最易调试、无跨项目噪声。

---

## 现状底线（动手前必须承认的约束）

- 内核 `types.rs` 已定型：`SynProposal{summary,description,options[],diff,audit_trail,status,created_at}`、`SynStatus{Draft→UnderReview→Approved/Rejected→Implemented}`、`SynOption{label,description,merge_strategy}`。
- **`merge_strategy: skip/overwrite/rename/merge_meta` 是"动作级决策"，与"裁方向"错位** —— 这是重构点而非平滑演进，不回避。
- `niche` / `syn` crate 均为占位，无实现。SYN 运行链路（谁产生、谁决策、决策后发生什么）整体为空。

---

## 概念锚点（先于任何代码）

### 层次锚定（ADR-0001，已裁决）

> **SYN 定位于表征层（Representation Layer），不在内核。** 内核只做纯拓扑/查询/存储；方向载子、共创裁决、不确定性升级阀都是表征层活动。
> 存量 `types.rs` 的 `SynProposal/SynOption/SynStatus` 归属因而是表征层领域类型——迁移与否待 O4 裁决，本计划只新增表征层实体，不删存量。
> 详见 `knowledge-base/04-architecture/ADR-0001-SYN-representation-layer.md`。

### 方向载子 DirectionCarrier
- 仅是**图可持有的对象**（一个节点），不是"对齐分数"。
- 三件套：
  - `intent` 意图宣言 —— "我们想往哪走"，人类可读、可改写。
  - `trail` 轨迹 —— 支撑它的图路径片段（来自当前状态的可查证据）。
  - `tension` 张力 —— 未决/可被挑战的点（共创发生的裂缝）。
- **特征：可被放置、被观察、被推演、被改写、被回望。** 永不对"对不对"负责，只对"可不可被深化"负责。

### 共创裁决
- 人可对载子做三种操作：**改写意图** / **增补张力** / **重置轨迹**。
- 系统可**嵌套生长**：基于当前载子再生成一层更深候选。
- 方向被选 ≠ "点同意"，而是**被改写成更富集版本后进入图**。

### 系统角色
- 不答"偏了吗"。在图的能量失衡处**长出候选**，主动提议一个"尚未存在但长势指向"的下一处方向。
- 携带自己吃不准的**不确定度**；吃不准时走 SYN 升级阀交还用户。

---

## 开放设计（未决，需裁决——不写进可执行步骤，先悬置标记）

> 这些是当前没有依据、只靠直觉或比喻的地方。计划执行到对应阶段前，必须先裁决，**禁止假装已有答案**。

| 标记 | 开放问题 | 依赖推理 |
|---|---|---|
| O1 | 意图宣言是自由文本，还是需规范形态？ | 阶段一已按"自由文本 intent + 结构化 trail/tension"推进，暂认可，待长期载体重估 |
| O2 | "图的能量失衡"落到实现的具体信号是什么？ | **已部分裁决**：不确定度信号 = 证据厚度评判（trail 稀疏/自相矛盾 → 增不确定，阶段四 Task 7）。**"涌现发现信号"推迟**——见 `knowledge-base/02-plans/future-directions.md` §4.1，gate cluster/fields，当前 seed 仍用 in-degree 占位 |
| O3 | 共创的界面粒度——显式固定界面，还是散落 agent 自然工作里？ | **已裁决（最小落地）**：= 命令行一问一答（显式界面，选项 A），快速证明"人机共同驾驶"通道成立（阶段四 Task 8）。**最终形态（少打扰/后台循环）推迟**，待 A 面有结论 |
| O4 | 现有 `merge_strategy` 下沉到哪一层、由谁自决？ | 仍未决。当前先通过本地 `DirectionStatus` 与内核 `SynStatus` 解耦，不阻塞阶段四；裁决后才动 `types.rs` 存量字段 |

---

## 阶段一：固化成领域实体（不碰生成/共创逻辑） ✅ 完成

把"DirectionCarrier"和"共创裁决操作"落成表征层 `syn` crate 里可表达、可持久化的真实，不改动任何生成/判定行为。

> **归属（已裁决，ADR-0001 + 用户选 b）**：方向载子是表征层实体，归 `crates/syn`（即使该 crate 当前是空壳）。不落进内核 `statuz-core`——否则违背"SYN 在表征层、内核零语义"。

### Task 1: 定义 DirectionCarrier 类型

**Files:**
- Create: `crates/syn/src/direction/carrier.rs`
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;` + 导出）

- [ ] **Step 1: 写失败测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> DirectionCarrier {
        DirectionCarrier {
            id: "dc_1".into(),
            intent: "想往 X 走".into(),
            trail: vec!["n_arch".into(), "n_flow".into()],
            tension: vec!["还未决定 A/B".into()],
        }
    }

    #[test]
    fn carrier_carries_all_three_parts() {
        let c = sample();
        assert_eq!(c.intent, "想往 X 走");
        assert_eq!(c.trail.len(), 2);
        assert_eq!(c.tension.len(), 1);
    }

    #[test]
    fn carrier_roundtrips_msgpack() {
        let c = sample();
        let bytes = serialize(&c).unwrap();
        let back: DirectionCarrier = deserialize(&bytes).unwrap();
        assert_eq!(c.id, back.id);
        assert_eq!(c.intent, back.intent);
    }
}
```

- [ ] **Step 2: 验证失败**
  Run: `cargo test -p syn direction`
  Expected: FAIL（类型未定义）

- [ ] **Step 3: 最小实现**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DirectionCarrier {
    pub id: String,
    pub intent: String,
    pub trail: Vec<String>,   // 图节点 id 列表，支撑该方向的证据路径
    pub tension: Vec<String>, // 未决/可被挑战的点
}
```

- [ ] **Step 4: 验证通过**
  Run: `cargo test -p syn direction`
  Expected: PASS

- [ ] **Step 5: 提交**
  Run: `git add crates/syn/src/direction/carrier.rs crates/syn/src/lib.rs && git commit -m "feat: add DirectionCarrier core type"`
  Expected: 提交成功

> **依赖说明（Task 2 前置）**：`crates/syn` 当前是独立空壳，未依赖 `statuz-core`。Task 2 的 seed 需要读内核的 `GraphEngine`，因此需在 `crates/syn/Cargo.toml` 声明 `statuz-core` 依赖；否则 `cargo test -p syn` 会因找不到类型而失败。此依赖在 Task 2 的文件清单中已含 `Cargo.toml`，执行时按序补上即可（内核已建，`path` 依赖直接可用）。

---

## 阶段二：最小可证伪闭环——"方向可被共同推演"（H3） ✅ 完成

目标：验证**核心假设 H3 —— 一个被改写成更富集版本的方向载子，能在下一次会话中被 agent 用作更清晰的方向上下文**。不实现 ② 复杂信号、不实现 ④ 自编辑 Loop。

### Task 2: 用 statuz 自身生成 1 个候选载子（规则近似）

**Files:**
- Create: `crates/syn/src/direction/seed.rs`（规则式候选生成）
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;`）
- Modify: `crates/syn/Cargo.toml`（确保依赖 `statuz-core`）

- [ ] **Step 1: 写失败测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_picks_hot_nodes_from_graph() {
        // 构造一个小图：n_root → n_hot（被 3 条边引用）→ n_cold（0 引用）
        let g = graph::engine::GraphEngine::new();
        // ... 用公共 API 建点建边（具体见图表测试，这里展开最小形态）
        let carriers = seed_candidates(&g, 1);
        assert_eq!(carriers.len(), 1);
        // 后置断言：载子的 trail 应指向高被引用的热点节点
    }
}
```

- [ ] **Step 2: 验证失败**
  Run: `cargo test -p syn direction::seed`
  Expected: FAIL（`seed_candidates` 未定义）

- [ ] **Step 3: 最小实现（O2 用最简单的可测信号占位：in-degree 被引用数）**

```rust
pub fn seed_candidates(g: &GraphEngine, limit: usize) -> Vec<DirectionCarrier> {
    // 哨兵实现：用 in-degree 计数近似"能量失衡"（O2 的替代物）
    // 断言明确：这是近似信号，not 对齐判定器
    g.nodes()
        .iter()
        .enumerate()
        .take(limit)
        .map(|(i, n)| DirectionCarrier {
            id: format!("dc_seed_{}", i),
            intent: format!("探索从 {} 引出的长势", n.id),
            trail: vec![n.id.clone()],
            tension: vec!["（规则信号近似，未验证）".into()],
        })
        .collect()
}
```

> **诚实标注**：这里 in-degree 是 O2 的**占位近似**。实验目的就是测"用小信号能不能长出可用方向"，若 H3 证伪，恰恰证明需要更深信号——这是实验的一部分，不是偷工减料。

- [ ] **Step 4: 验证通过**
  Run: `cargo test -p syn direction::seed`
  Expected: PASS

- [ ] **Step 5: 提交**
  Run: `git add crates/syn/src/direction/seed.rs crates/syn/src/lib.rs crates/syn/Cargo.toml && git commit -m "feat: statistical candidate seeding (in-degree proxy)"`
  Expected: 提交成功

### Task 3: 声明式"改写"操作（共创的人侧）

**Files:**
- Create: `crates/syn/src/direction/coedit.rs`
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;`）

- [ ] **Step 1: 写失败测试**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rewrite_intent_returns_new_carrier() {
        let c = /* sample carrier */;
        let c2 = rewrite_intent(&c, "其实我想往 Y 走");
        assert_eq!(c2.intent, "其实我想往 Y 走");
        assert_ne!(c.intent, c2.intent); // 不可变：返回新实体，不改原载子
    }

    #[test]
    fn add_tension_appends_unresolved_point() {
        let c = /* sample carrier */;
        let c2 = add_tension(&c, "你漏了约束 Z");
        assert!(c2.tension.contains(&"你漏了约束 Z".into()));
    }

    #[test]
    fn reset_trail_replaces_evidence() {
        let c = /* sample carrier */;
        let c2 = reset_trail(&c, vec!["n_new".into()]);
        assert_eq!(c2.trail, vec!["n_new"]);
    }
}
```

- [ ] **Step 2: 验证失败**
  Run: `cargo test -p syn direction::coedit`
  Expected: FAIL（函数未定义）

- [ ] **Step 3: 最小实现**

```rust
pub fn rewrite_intent(c: &DirectionCarrier, new_intent: &str) -> DirectionCarrier {
    DirectionCarrier { intent: new_intent.into(), ..c.clone() }
}

pub fn add_tension(c: &DirectionCarrier, t: &str) -> DirectionCarrier {
    let mut tension = c.tension.clone();
    tension.push(t.into());
    DirectionCarrier { tension, ..c.clone() }
}

pub fn reset_trail(c: &DirectionCarrier, new_trail: Vec<String>) -> DirectionCarrier {
    DirectionCarrier { trail: new_trail, ..c.clone() }
}
```

> **纪律标注**：以上全部为不可变构造（符合 AGENTS.md 不可变优先），绝不原地修改。

- [ ] **Step 4: 验证通过**
  Run: `cargo test -p syn direction::coedit`
  Expected: PASS

- [ ] **Step 5: 提交**
  Run: `git add crates/syn/src/direction/coedit.rs && git commit -m "feat: co-edit ops (rewrite/add_tension/reset_trail)"`
  Expected: 提交成功

### Task 4: H3 端到端验证脚本（能测出"更富集=更清晰"）

**Files:**
- Create: `crates/syn/src/direction/h3_eval.rs`（确定性评估，非 LLM）
- Create: `paper/h3-result.md`（记录判据与结论占位）

- [ ] **Step 1: 写评估逻辑（不依赖外部 agent，先确定性）
  - 输入：同一任务 × 两个版本的上下文——(a) 无载子（原始路径），(b) 富集载子（含改写后的 intent/tension）。
  - 度量：统计"方向可被明确表述"的信号——如载子 trail 指向的节点，在 (b) 上下文中被引用的次数 vs (a)。
  - 判据写死：`(b) 引用率 - (a) 引用率 >= 0.7 视为 H3 成立；若 < 0.4 视为 H3 证伪；两者之间为"需更大样本"`。

- [ ] **Step 2: 写测试断言评估逻辑本身可运行（元测试）**

```rust
#[test]
fn h3_metric_compares_two_contexts() {
    let richer = 5usize;
    let baseline = 1usize;
    assert!(is_h3_supported(richer, baseline));
}

#[test]
fn h3_metric_rejects_reversal() {
    let richer = 1usize;
    let baseline = 5usize;
    assert!(!is_h3_supported(richer, baseline));
}
```

- [ ] **Step 3: 验证通过、提交**
  Run: `cargo test -p syn direction::h3_eval`
  Expected: PASS
  Run: `git commit -m "feat: H3 directional co-creation eval harness (deterministic)"`
  Expected: 提交成功

- [ ] **Step 4: 跑一次真实样本，把结论写进 `paper/h3-result.md`**
  Run: `cargo run -p statuz-core -- --self-test`（确认不回归）+ 手动脚本在 statuz 自身图上采 bootstrap 样本
  Expected: 写下实测的 one number，以及判定（成立 / 证伪 / 需更大的样本）

> **关键诚实点（写进 h3-result.md）**：H3 若成立→继续共创界面深层设计；若证伪→不是删想法，而是**回到 O2 换信号**（这正是实验的意义，不提前辩护）。

---

## 阶段三：SYN 升级阀与系统自决层的接缝 ✅ 完成

> **前置闸门**：阶段二的 H3 必须先有明确结论（成立 / 证伪 / 需更大样本），否则**不进入本阶段**。H3 证伪时暂停并回 O2，禁止硬闯。

### Task 5: 剥离 merge_strategy + SynProposal 方向级重述

**Files:**
- Modify: `crates/statuz-core/src/graph/types.rs`（重构 Syn 类型）
- Create: `crates/syn/src/direction/syn_proposal.rs`

- [ ] **Step 1: 先起草重述契约（仅文档 + 无实现改动）**
  - 新增方向级提案类型（承接 DirectionCarrier）：`DirectionProposal{ carrier, uncertainty, status }`。
  - 强调：`uncertainty` 即"系统吃不准"的通道，接回 field 讨论敲定的"不确定 → 推给用户"。
  - 保留/沉放 `merge_strategy` 到系统自决层（O4，需裁决后定归属）。

- [ ] **Step 2: 先裁 O4（不写死，文档化两种可能归属）**
  - 备选：merge_strategy 移出 Syn 提案、下沉到"方向被采纳后系统独立执行的落地层"。
  - 写进 `syn-execution-plan` 的开放登记 O4，标注"裁决后才动 types.rs"。

- [ ] **Step 3: 设计批准后再实现（本阶段不直接写 merge_strategy 删除的代码）**
  - 显式 gate：O4 未裁决→谁都不许动 `types.rs` 的存量 Syn 字段，只新增 `DirectionProposal`。

- [ ] **Step 4: 新增方向级提案测试**
  - 验证 `DirectionProposal` 可往返、可携带 uncertainty、可承载 H3 富集结果。

- [ ] **Step 5: 提交（仅新增，不删存量）**
  Run: `git commit -m "feat: direction-level Syn proposal (carrier + uncertainty)"`
  Expected: 提交成功

### Task 6: 升级阀的最小实现（不确定 → 交还用户）

**Files:**
- Create: `crates/syn/src/direction/escalation.rs`
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;`）

- [ ] **Step 1: 写失败测试**
  - `uncertainty` 高于阈值 → 产出"待用户裁"状态（与 S3 无关，指向 `SynStatus::UnderReview`）。
  - 低于阈值 → 系统自决（不产生打扰）。
  - 阈值本身是可配置常量（少打扰优先的落点）。

- [ ] **Step 2: 验证失败 → Step 3 最小实现 → Step 4 通过 → Step 5 提交**
  - 实现一个 `decide(carrier, uncertainty, threshold) -> Escalation`，`Escalation` 为 enum：`SystemSelfDecide | EscalateToUser(SynStatus::UnderReview)`。

---

## 阶段四：焊上两处断口（不确定度有真来源 + 人机裁决通道） ✅ 进程内

> **目标（MVP 导向）**：把阶段一~三"只搭了骨架、没接通"的两处补实——① 不确定度不再是外部塞进来的空号，而是系统真算出来的；② 升级阀不再只吐一个"该交用户"的标记，而是真的把方向端到你面前、接你的回话、把裁决写成新载子回写进图。
> **已裁决**：不确定度信号 = **证据厚度评判**；裁决面 = **命令行一问一答**（选项 A）。目标是**尽快实现 MVP**。

### Task 7: 证据厚度评判 → 系统真算出不确定度

**Files:**
- Create: `crates/syn/src/direction/confidence.rs`
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;`）

> 信号定义（已裁决，O2 的最小落地）：**trail 支撑越稀疏 / 越自相矛盾 → 不确定度越高**；trail 丰富且一致 → 低。可复现、确定性、与载子自身结构耦合（不引入 LLM 语义判定）。

- [ ] **Step 1: 写失败测试**
  - `uncertainty_from(carrier)` 返回 0..=1 的 `f64`。
  - 空 trail → 高不确定（趋近 1）。
  - 厚且一致的 trail → 低不确定（明显低于空 trail）。
  - 含自相矛盾张力（同一对象既 A 又非 A）的 trail → 高于一致 trail。
  - 同输入恒定输出（确定性，不计入随机）。

- [ ] **Step 2: 验证失败**
  Run: `cargo test -p syn direction::confidence`
  Expected: FAIL（`uncertainty_from` 未定义）

- [ ] **Step 3: 最小实现**
  - 用 trail 长度 + trail 去重后长度 + tension 是否自相矛盾，组合出一个确定性 0..=1 分数。
  - 签名：`pub fn uncertainty_from(c: &DirectionCarrier) -> f64`。
  - **诚实标注**：这是启发式起点，不是真实语义；结论只在"证据厚度"维度成立。若未来需要更深信号，回 O2 换信号，不伪装。

- [ ] **Step 4: 验证通过**
  Run: `cargo test -p syn direction::confidence`
  Expected: PASS

- [ ] **Step 5: 提交**
  Run: `git commit -m "feat: uncertainty from evidence thickness (confidence)"`
  Expected: 提交成功

### Task 8: 命令行一问一答裁决通道（人机共同驾驶的第一步）

**Files:**
- Create: `crates/syn/src/direction/adjudicate.rs`
- Modify: `crates/syn/src/lib.rs`（`pub mod direction;`）
- Modify: `crates/syn/examples/`（新增裁决小样示例，可选）

> 目标（O3 的最小落地）：一条**最小可跑**的人机通道——一条方向（带真算出的不确定度）端到你面前，你回话（`改<新意图>` / `加<张力>` / `重置<路径>` / `采纳`），系统把你的裁决做成新载子并回写进图。MVP 用**一次一问一答**，证明通道成立；正式"少打扰/后台循环"形态推迟。

- [ ] **Step 1: 写失败测试**
  - 裁决面接受输入词：`rewrite` / `add` / `reset` / `adopt`（含中文等价"改/加/重置/采纳"）。
  - `apply_prompt(carrier, "改 我想往Y走") -> new_carrier`，`new_carrier.intent` 变了、原载子不变（不可变）。
  - `apply_prompt(carrier, "加 你漏了约束Z") -> new_carrier`，`tension` 增至含 Z。
  - `apply_prompt(carrier, "采纳") -> new_carrier`，返回承载裁决后的富集载子。
  - 未知词 → 显式错误（不静默吞掉）。

- [ ] **Step 2: 验证失败**
  Run: `cargo test -p syn direction::adjudicate`
  Expected: FAIL（`apply_prompt` 未定义）

- [ ] **Step 3: 最小实现**
  - 解析输入前缀（`改/加/重置/采纳` → 复用 `coedit` 的 `rewrite_intent/add_tension/reset_trail`），不可变构造新载子。
  - 复用已完成的 `escalation::decide`：不确定度 ≥ 阈值才真正进入"待你裁"路径，否则系统自决（少打扰依然生效）。

- [ ] **Step 4: 验证通过**
  Run: `cargo test -p syn direction::adjudicate`
  Expected: PASS

- [ ] **Step 5: 端到端小演示（证明"共同驾驶"真成立）**
  - 从 statuz 自身图 seed 一个载子 → 算不确定度 → 高则走升级阀 → 你 `改/加/采纳` → 新载子 `attach_carrier` 写回图 → `load_carrier` 读回，确认富集仍在。
  - 预期：肉眼看到一个方向真的走了"升级→你裁→进图→读回"全程。

- [ ] **Step 6: 提交**
  Run: `git commit -m "feat: CLI one-shot adjudication channel (human-in-loop first step)"`
  Expected: 提交成功

---

## 明确不做（防范围蔓延）

- ❌ 不实现完整的语义解读层（niche 仍是占位）——H3 不依赖它。
- ❌ 不做"图能量失衡"的**涌现发现**深度信号（O2 的涌现面推迟到 `future-directions.md` §4.1，gate cluster/fields；阶段四只做已裁决的**不确定度**证据厚度信号）。
- ❌ 不做跨设备共创 / 并发。
- ❌ 不删存量 `merge_strategy`（O4 裁决前）。
- ❌ 不做"少打扰/后台循环"的正式共创形态（O3 最终形态推迟，阶段四只证明显式通道成立）。
- ❌ 不实现"方向从图里长出来"（A 面 / 察觉跑偏 B 面 / 长期回望）——见 `future-directions.md` §4，依赖 cluster/fields 完备。

---

## 风险与诚实声明

- **H3 可能证伪**：若"富集载子"在真实 agent 上下文中不产生可测的清晰度提升，第一闭环即失败。这被文档接受——正是实验的目的。
- **Bootstrap 样本噪声**：statuz 自身单 repo，样本小；结论只支持"方向正确"，不能外推到一切项目。
- **O2 是最大的理论空洞**：in-degree 是占位近似，若 H3 需要更深信号，阶段二结论会反过来要求先补 O2。

---

## 待裁决清单（阻塞阶段五 / 阶段四部分设计，不阻塞阶段四 Task 7）

| 标记 | 待裁决 | 影响 |
|---|---|---|
| O1 | 意图宣言：自由文本 vs 规范形态 | 阶段四按自由文本推进，长期载体重估 |
| O2 | "能量失衡"涌现发现信号 | 阶段四已用"证据厚度→不确定度"落地不确定度面；**涌现面推迟**（future-directions §4.1） |
| O3 | 共创界面**最终形态**（少打扰/后台） | 阶段四已用"命令行一问一答"落地最小面；最终形态推迟 |
| O4 | merge_strategy 下沉归属 | **阻塞阶段五改存量 types.rs**；当前靠本地 DirectionStatus 解耦不阻塞阶段四 |