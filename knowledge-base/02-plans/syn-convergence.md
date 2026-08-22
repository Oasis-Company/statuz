# SYN 方向共创机制 — 收敛结论（Phase 1–4）

> 性质：SYN 第一轮研发的**收敛记录**（不是文档化设计重述）。记录做了什么、证到了什么、剩什么没碰、以及接续者该从哪继续。
> 归属：`crates/syn`（表征层，ADR-0001）。执行过程见 `paper/syn-execution-plan.md`。
> 状态：**阶段 1–4 已收敛，工程上可交付；阶段 4 之后的设计已挂起**（见 §4）。

---

## 1. 本轮达成了什么

SYN 从"内核里一批已定型但无实现的类型"，推进到**方向共创机制的最小可证伪闭环**——人机在同一方向载子上推演，而不是对齐判定器。

| 阶段 | 内容 | 成果 | 接受的裁决 |
|------|------|------|-----------|
| **1 固化实体** | `DirectionCarrier` 落地（意图+轨迹+张力） | 可 msgpack 持久化、可入图 | O1：自由文本 intent + 结构化 trail/tension；归属 `crates/syn`（ADR-0001） |
| **2 共创闭环 H3** | 候选生成 `seed` + 不可变共创操作 `coedit` + 确定性评估 `h3_eval` | H3 对象级往返保真度=1.0 | O2（第一层）：in-degree 占位近似 |
| **3 升级阀** | `DirectionProposal` + `escalation::decide` | 方向级提案（载体+不确定度+状态），与内核 `SynStatus` 解耦 | O4：暂以本地 `DirectionStatus` 隔离，未动存量 `types.rs` |
| **4 焊两处断口** | `confidence::uncertainty_from`（证据厚度）+ `adjudicate::apply_prompt`（命令行裁决） | 不确定度有真来源；人机通道"升级→裁决→回写→读回"全链路跑通 | O2（第二层）：证据厚度评判；O3（最小落地）：命令行一问一答 |

**端到端验收**：`crates/syn` 39 测试全绿；`statuz-core` 11/11 阶段 self-test 通过，无回归。

## 2. 真正证到了什么（可复现、不是感觉）

- **方向是图可持有的对象**：`attach_carrier`/`load_carrier` 往返内容完好（intent/trail/tension 无丢失），会话边界保真。
- **不确定度有真实来源**：`uncertainty_from` 确定性产出 0..=1（trail 稀疏/自相矛盾/张力 → 升高），同输入恒定输出。
- **人机共同驾驶可行**：一条方向能走完 `seed → 算不确定度 → 升级阀 → apply_prompt 裁决 → attach_carrier → load_carrier` 全程，且"少打扰"（低不确定默认 0.7 阈值系统自决）依然成立。
- **约束纪律**：全部共创操作为不可变构造；库代码零 unwrap；零非 serde 依赖。

## 3. 诚实地没碰的部分（设计 gate，不是缺陷）

下列三块**在当前 statuz 图上不可能有意义**：图中的真实语义涌现依赖 cluster + fields 完备，而当前图只有纯拓扑、无语义。已挂起到 `future-directions.md` §4：

| 预留 | 内容 | 前置 gate |
|------|------|----------|
| A 面 | 方向从图里"长出来"（能量失衡处涌现下一处方向） | cluster/fields 完备 + O2 涌现信号 |
| B 面 | 察觉跑偏（把偏离本身变成可共创对象） | A 面先有信号 + 持续状态可观察 |
| 回望 | 被采纳方向长期被回望/再推演 | A 面成立 + 语义承载 |

## 4. 接续者从哪继续

- **短期可自决**：O4（`merge_strategy` 下沉归属）仍待裁，但当前已用本地 `DirectionStatus` 解耦，不阻塞。
- **必须等 cluster/fields**：A 面 / B 面 / 回望（上表）——在设计上已 gate，cluster/fields 完成后回 `future-directions.md` §4 重启。
- **执行细节**：每步 TDD（失败→实现→转绿→提交）、提交信息、测试门禁见 `paper/syn-execution-plan.md` 与 AGENTS.md。