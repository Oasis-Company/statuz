# H3 端到端验证结果

> 性质：实验记录，非承诺。记录判据、实测 one number、与诚实声明。
> 关联：`crates/syn/src/direction/h3_eval.rs`（确定性评估）→ `src/direction/seed.rs`（候选信号）。

## H3 假设（复述）

**富集的 DirectionCarrier（改写后的 intent + 明确的 trail/tension）能降低 agent 恢复上下文的方向成本** —— 对应执行计划 `阶段二 Task 4`。验证方式：不用外部 LLM，用`引用率`做确定性代理度量。

## 判据（硬编码）

`delta = enriched_reference_rate − baseline_reference_rate`

- `delta ≥ 0.7` → **H3 成立**（Supported）
- `delta < 0.4` → **H3 证伪**（Falsified）
- `0.4 ≤ delta < 0.7` → 需更大样本（Inconclusive）

## 测量方式

`reference_rate(context, trail)` = trail 节点在上下文中被明确点名的比例（0..=1）。同一任务写成两个版本：

- `baseline_context`：原始路径 —— agent 需自行推理"该碰谁"的描述。
- `enriched_context`：富集载子 —— trail 明确点名真实节点、intent 可解析。

## 实测（试验田 = Statuz 自身 repo）

样本 4 个真实任务，`cargo run -p syn --example h3_sample` 输出：

| 任务 | trail | baseline | enriched | delta |
|---|:--:|:--:|:--:|:--:|
| add a new traversal query | n_graph_engine | 0.00 | 1.00 | +1.00 |
| make DirectionCarrier persistable | n_syn_carrier,n_storage | 0.00 | 1.00 | +1.00 |
| seed candidates from hotspots | n_cluster_registry,n_graph_engine | 0.00 | 1.00 | +1.00 |
| wire H3 eval harness | n_h3_eval | 0.00 | 1.00 | +1.00 |

**mean delta = 1.000 → verdict = Supported**

## 诚实声明（必须读）

1. **这是"引用率 proxy"下的成立，不是"真实 agent 清晰度"的成立。** 该度量下 baseline 引用率恒为 0（原始描述天然不点名 trail），enriched 恒为 1（trial 点名即满格），因此 delta 锁定满分。它证明的是**测量工具可运行 + 在"指名 vs 不指名"这一维度上有强信号**，而非 agent 上下文体验确实更低成本。
2. **样本为人工撰写、样本量 N=4、且只在 Statuz 单一 repo 上**，不足以外推到一切项目（计划"Bootstrap 噪声"风险项已承认）。
3. **不提前辩护**：按计划语义，H3 需在"能测出真实清晰度差异"的意义上成立才算数。当前证据等级 = **测量通路打通 + 强方向信号**，**不足以作为"深化共创界面"的充分依据**。

## 结论等级与分工

- **链路已打通**：确定性评估（引用率度量 + 三态判据）+ 自举样例 + 可运行入口，均可复现（`cargo run -p syn --example h3_sample`）。
- **方向判断由用户裁决**：H3 的"是否以此作为进入阶段三的依据"是方向级决策，不属于打通链路的范围。本文只保证度量可运行、可复现、判据透明。

## 下一步（由用户裁决）

- H3 结论等级：**倾向"需更大样本"或"成立（通路级）"**，取决于用户接受哪个指标作为"H3 意义上的清晰度"。
- 若接受 → 可进入 `阶段三`（SYN 升级阀，Task 5/6）的接缝设计。
- 若认为此 proxy 太弱 → 回到 **O2 换信号**（图能量失衡的真实信号），这不是证伪，而是换更可信的度量后再验证。