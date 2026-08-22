# 方向 D 实施计划 v2：内存 CSR 双索引（愿景驱动 · 审视修订版）

> **制定日期**: 2026-08-09（v2，取代同日 v1 草案）
> **定位**: 让 Cluster 的**内存布局**成为"更先进的储存结构"的第一块物理基座——加载时构建 CSR 双索引，把"算"变成"走"。
> **前置**: M0–M7 已全绿（103 测试 / self-test 11 阶段 / clippy -D warnings / e2e.ps1）
> **范围红线**: 只动内存布局与访问路径。**磁盘格式（v0x0003）、惰性加载、WAL、mmap 全部不在本计划内**——见 §0 修订记录。

---

## 0. 修订记录（v1 → v2）— 为什么砍掉 40%

| 被砍/被改 | 原设计 | 砍掉的原因（代码证据） |
|-----------|--------|------------------------|
| ❌ 磁盘格式 v0x0003 | 新布局 + 双格式兼容矩阵 | 价值在内存布局；序列化只是快照（ADR-006）。磁盘优化是 HARD-TODO 两次推迟的东西，不该排最前 |
| ❌ 惰性加载 + mmap | 边数据按需读 | 100k 边全量加载 ~50ms；North Star 是工具调用次数，不是加载毫秒数 |
| ❌ WAL 种子（D5） | 日志结构写路径 | 这是方向 C 的内容，本计划无权立项；结构性变更少而贵，快照本来就便宜（双时钟） |
| ❌ "文件 ≤60%" DoD | 存储瘦身指标 | 虚荣指标：当前最大图 1000 节点、几十 KB，大小无关紧要 |
| ⚠️ impact ≥5x 等阈值 | 预设达标线 | 阈值先于测量 = 先有结论再找证据。**阈值由 D0' 的热点数据决定** |
| ⚠️ "impact 全图找入边" | 计划立论 | 代码证实 `GraphEngine::impact` 已是入邻接反向 BFS；真热点是 `impact_across_fields` 逐节点全字段扫描（cluster.rs:353） |

**v2 原则**：测量先行、热点驱动、只做内存、阈值由数据定。本表作为永久记录，防止未来会话把砍掉的东西重新塞回来。

---

## 1. 愿景锚（Vision Anchors）

| 锚 | 命题 | 在本计划的体现 |
|----|------|--------------|
| **V1** | Cluster 只是存储物理，不是语义容器 | 任何"顺手加个语义字段"的冲动都要被拦下 |
| **V2** | 图的高效 = 关系物化成物理布局，"走"而不是"算" | 内存 CSR：访问变顺序读、入邻接变 O(入度) |
| **V3** | impact 是 Loop 的传播原语，必须物理化 | 修 `impact_across_fields` 的全字段扫描热点 |
| **V4** | North Star = context-recovery cost | 基准是工程决策依据，**不是**产品进度（POSITIONING §6） |
| **V5** | 兼容与主权 | 磁盘格式 v2 不动——兼容性靠"不碰"保证 |
| **V6** | 内容寻址保持 | blake3 身份语义零变化 |

---

## 2. 问题与机会（代码验证过的诊断）

**物理债**：
- `add_edge` 把每条 Edge 克隆三份（注册表 + outgoing + incoming），内存和序列化都冗余——这是真实但不紧急的债。
- **真热点**：`impact_across_fields` 每个出队节点都 `for field in self.fields.values()` 扫全字段（cluster.rs:353）——O(F×(V+E))。tag 冲刷一次，全图被扫 F 次。**Loop 的心脏在"算"，不在"走"。**
- `GraphEngine::impact`（query.rs:50）本身已是入邻接反向 BFS，O(受影响×度)——**不需要修**。

**机会**：加载时从现有 v2 数据构建内存 CSR 双索引（出/入邻接各一套 offset+columns 数组），traverse 走 out 索引、impact_across_fields 走 in 索引。不碰磁盘格式、不碰公共 API、不碰兼容性。

---

## 3. 方法论 — 四原则 + 修订后的严苛规则

沿用四原则：**P1 行走骨架 / P2 成果物可见 / P3 硬门槛 / P4 时间盒**。

严苛规则（v2 修订版）：

- **S1 测量先行**：D0' 之前不许动任何访问路径代码。热点不明，优化就是赌博。
- **S2 阈值由数据定**：达标线在 D0' 结束时写定（写入基准报告），不许事后改；但**不是**预设。
- **S3 愿景回测**：里程碑收尾回答——"这一步把'算'变成了'走'吗？""加进来的东西是物理还是语义？"
- **S4 决策留痕**：关键取舍写 ADR（§8），口头决定不算数。
- **S5 引擎指标 ≠ 产品进度**：基准表用于工程决策；North Star 的验证属于注意力层立项后的事，不许把"数字变快"写成"目标达成"。
- **S6 一次重试**：不达标允许时间盒内重试一次；再失败 = 回滚 + 换方案（见 R8），绝不硬撑。

---

## 4. 里程碑总览（3 个里程碑，3.5–4 天）

| # | 里程碑 | 核心内容 | 看得见的成果（DoD） | 时间盒 |
|---|--------|---------|---------------------|--------|
| **D0'** | 热点剖析 | bench harness + profiler：时间花在哪 | 热点报告（含阈值表），`benchmarks/hotspots.md` 入库 | 1 天 |
| **D1'** | 内存 CSR 双索引 | 加载时建索引，traverse/impact 走索引，属性测试对照 | 基准对比表达标（阈值由 D0' 定）+ 正确性对照 100/100 | 1.5–2 天 |
| **D2'** | 真实图验证 + 决策 | statuz 自举图 + 合成 1M 边压力图，重跑基准 | 真实图报告 + 后续方向（C/E/A）书面决策 | 1 天 |

---

## 5. 里程碑详细定义

### D0' — 热点剖析（1 天）

**愿景锚**：V4（别把引擎指标当进度）、V2（先知道"走"的机会在哪）。

**任务**：
1. 新建 `crates/statuz-core/examples/bench_graph.rs`：确定性种子合成图（1k/10k/100k 边、3 字段、若干桥）。
2. **Profiler 而非计时**：对 `load`（msgpack 解码）、`traverse`、`impact`、`impact_across_fields`、`path` 做分段测量——每段耗时占比。
3. 输出 `benchmarks/hotspots.md`：热点排名 + **基于数据的达标阈值表**（例：若热点确认是跨域扫描，则写"in 索引后 impact_across_fields ≥ Nx"；若热点是解码，则计划转向 codec，见 R8）。
4. 基准可复现：同一机器、同一 seed、同一命令；记录硬件与编译配置。

**DoD**：`cargo run --example bench_graph -- 100k --profile` 输出分段热点表，`benchmarks/hotspots.md` 入库并含阈值表。

**硬门槛**：不动任何访问路径代码；编译零警告；103 测试全绿。

### D1' — 内存 CSR 双索引（1.5–2 天）

**愿景锚**：V2（访问线性化）、V3（跨域 impact 物理化）、V5（磁盘格式不碰）。

**任务**：
1. 新建 `src/graph/csr.rs`：`CsrIndex { offsets: Vec<u32>, columns: Vec<u32>, edge_slots: Vec<u32> }`；`build_out()` / `build_in()` 从现有 GraphEngine 数据构建；出/入各一套。
2. 访问路径切换（**公共 API 不变**）：
   - `traverse` 走 out-CSR 顺序读（替换 HashMap 遍历路径，保留 HashMap 实现供对照）
   - `impact_across_fields` 的逐字段扫描 → 走 in-CSR（**这是主战场**）
3. 属性测试：随机图（100 个随机场景）× 随机查询，CSR 结果与 HashMap 实现逐字节一致。
4. 基准复测：D0' harness 加 `--csr` 开关，输出对比表；对照 D0' 阈值。

**DoD**：对比表达标（阈值 = D0' 产物）；正确性对照 100/100；`benchmarks/csr-vs-hashmap.md` 入库。

**硬门槛**：全量门禁（§6）；**阈值不达标 → S6**（重试一次 → 回滚 + 换方案）。

**范围红线**：不新建磁盘格式、不碰序列化管线、不做惰性加载。CSR 构建成本计入基准（构建耗时也要 < 阈值，否则"加载变慢换查询变快"不划算）。

### D2' — 真实图验证 + 决策（1 天）

**愿景锚**：V4（真实恢复成本）、V2（真实图上的行走）。

**任务**：
1. 脚本生成 statuz 自身仓库图（文件/模块/依赖为节点）+ 合成 1M 边压力图。
2. 真实图上重跑 D0' 全部测量，出 `benchmarks/realgraph-v2.md`。
3. 书面决策（必须数字依据）：内存索引是否够用？方向 C（完整 WAL）/ E（分层折叠）/ A（mmap / 磁盘格式）是否立项、以什么顺序。

**DoD**：真实图报告入库 + 决策写入 `knowledge-base/02-plans/current-roadmap.md`。

**硬门槛**：全量门禁；决策必须有数字，不许"感觉上值得"。

---

## 6. 质量门禁（每个里程碑统一执行）

```bash
cargo build 2>&1 | grep -cE "^warning|^error"          # 期望: 0
cargo test                                             # 期望: 103 + 新增 全绿
cargo run -- self-test                                 # 期望: All 11 phases passed
cargo clippy --all-targets -- -D warnings              # 期望: 通过
cargo fmt --check                                      # 期望: 无 diff
```

**提交规则**：门禁全绿 + S3 回测通过才 commit；conventional commits；每里程碑一个提交。基准数字追加到 `benchmarks/`，禁止口头"变快了"。

---

## 7. 风险登记表

| # | 风险 | 概率 | 影响 | 缓解 |
|----|------|------|------|------|
| R1 | 热点不在遍历而在 msgpack 解码 | 中 | 高 | D0' 就是为此设计的：若确认，计划转向 codec 优化（另行评估），CSR 降级为备选 |
| R2 | CSR 构建成本吃掉查询收益 | 中 | 中 | D1' 范围红线：构建耗时必须 < 阈值，否则不划算 |
| R3 | 范围蔓延（又想把语义/格式/WAL 塞进来） | 高 | 高 | V1 纪律 + §0 修订记录常驻 + S3 回测 |
| R4 | 真实图数据不足（仓库太小） | 中 | 低 | D2' 备选 1M 边合成压力图 |
| R5 | 双实现（HashMap + CSR）维护成本 | 中 | 中 | D1' 属性对照测试；D2' 决策后淘汰其一 |
| R6 | 跨字段扫描其实只发生在少数桥场景，收益被高估 | 中 | 中 | D0' 用真实比例（含桥查询占比）校准阈值 |

---

## 8. 决策记录（S4）

| 决策 | 结论 | 理由 |
|------|------|------|
| ADR-D1（v2） | 内存 CSR 优先，磁盘格式不做 | 价值在内存布局；序列化是快照；磁盘优化留给未来立项 |
| ADR-D2（v2） | WAL 移交方向 C，本计划不立项 | 双时钟下结构性变更少而贵，快照足够；防范围蔓延 |
| ADR-D3（v2） | 兼容性靠"不碰"保证 | 磁盘格式 v2 零改动 → v1/v2 兼容矩阵天然全绿 |
| ADR-D4（v2） | 阈值由 D0' 数据决定 | 先测量后定标；禁止预设结论 |
| ADR-D5（v2） | 引擎指标是决策输入，不是进度 | POSITIONING §6：North Star 是 context-recovery cost |
| ADR-D6（v2） | 主战场是 `impact_across_fields` | 代码证实其 O(F×(V+E)) 是唯一真热点 |

---

## 9. 涉及文件

| 文件 | 动作 | 里程碑 |
|------|------|--------|
| `crates/statuz-core/examples/bench_graph.rs` | 新建（分段 profiler harness） | D0' |
| `benchmarks/hotspots.md` | 新建（热点 + 阈值表） | D0' |
| `crates/statuz-core/src/graph/csr.rs` | 新建（CSR 索引 + 出/入构建） | D1' |
| `crates/statuz-core/src/graph/query.rs` | 修改（traverse / impact_across_fields 走索引） | D1' |
| `crates/statuz-core/src/cluster/cluster.rs` | 修改（跨域 impact 用 in-CSR） | D1' |
| `benchmarks/csr-vs-hashmap.md` | 新建（对比表） | D1' |
| `benchmarks/realgraph-v2.md` | 新建（真实图报告） | D2' |
| `knowledge-base/02-plans/current-roadmap.md` | 修改（状态 + 决策） | 每里程碑 |

**明确不改**：`src/storage/mod.rs`、`src/main.rs`（无新命令）、磁盘格式、公共 API。

---

## 10. 开放问题

1. **Q1**：合成图生成规则（度分布、社区结构）是否够真实？——D0' 的图请团队 review，不通过不许开工。
2. **Q2**：热点若在解码——codec 优化的候选方案是什么？（备选：仅反序列化 edges 区、跳过 meta、或换 msgpack 配置）——D0' 产出，暂不立项。
3. **Q3**：CSR 建在 GraphEngine 层还是 Cluster 层？（引擎层只管字段内；跨域扫描需要 cluster 级 in 索引）——D1' 实现时定，倾向 cluster 级一张跨域 in 索引 + 引擎级可选。
4. **Q4**：in 索引要不要含桥边？——含（跨域 impact 需要），D1' 定稿。

---

## 11. 交接说明（Handoff）

- 每里程碑结束更新 `knowledge-base/02-plans/current-roadmap.md`，按 §6 提交；一个会话一个里程碑。
- **D2' 之后**：方向 C / E / A 的立项以 D2' 的真实图报告为唯一依据。
- 本计划 v2 取代 v1；§0 修订记录是防回潮的永久记录，任何新会话先读它。

---

*本计划为方向 D 的唯一权威执行依据；任何偏离必须走 S4 决策留痕，口头变更无效。*
