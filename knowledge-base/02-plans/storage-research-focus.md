# 研究重点审视：储存结构（2026-08 审查）

> 审查日期：2026-08
> 审查范围：全仓文档 —— `AGENTS.md`、`STATUZ设计哲学的论述.md`、`IDEA.md`、`HARD-TODO.md`、`knowledge-base/`、`.hermes/plans/2026-08-09_134415-csr-dual-layout-plan.md`、`benchmarks/hotspots.md`、`crates/statuz-core/src/storage/mod.rs`
> 结论：**是——储存结构正是当前应投入研究的方向，且文档已经把它确立为执行主线（方向 D）。但"储存结构"必须拆成两层：内存层现在做（D1'），磁盘层等 D2' 数据定夺。**

---

## 一、结论摘要

1. **研究重点放在储存结构上——正确，且已是既定事实**。`current-roadmap.md` 明确写着"方向 D 存储物理化执行中"，`csr-dual-layout-plan.md` 是唯一权威执行依据，D0' 已完成并入库，D1' 是当前待执行项。
2. **两层储存结构，次序不能颠倒**：
   - **内存层（D1'，现在做）**：增量 in/out 度索引 + Cluster 级反相索引。这是"把'算'变成'走'"的第一块物理基座，计划红线内。
   - **磁盘层（HARD-TODO #4，D2' 后决定）**：edge-first 存储、社区分块、WAL、mmap。难度 5/5、预估 12–18 个月，已被 D 计划两次推迟，立项必须由 D2' 真实图数据触发（方向 C/E/A 决策）。
3. **储存结构研究服务于 Loop，不服务于虚荣指标**。热点数据显示真缺口是"本该是结构的东西被每次重算"（impact 占查询时间 99.7%）。North Star 是 context-recovery cost（`IDEA.md`），引擎指标只是决策输入（S5）。
4. **警惕偏移**：HARD-TODO P0 的"图的工作记忆"（#1）和"图 Loop"（#2）仍是 ❌。储存结构是 Loop 的物理前提（V3），不是替代品。D2' 是设计好的退出闸门，防止储存研究变成永久住所。

---

## 二、证据链（文档 → 结论）

| 文档 | 关键内容 | 支撑的结论 |
|------|---------|-----------|
| `STATUZ设计哲学的论述.md` | "statuz需要超一流的图结构，图算法和储存机制"；"只有statuz实现底座，人们才能在dashboard里盖上摩天大楼" | 储存是三大支柱之一，是底座 |
| `IDEA.md` | "Engine performance, storage efficiency, compression ratio — these are means, not ends" | 储存研究是手段，北极为 context-recovery cost |
| `HARD-TODO.md` #4 | 图的原生存储格式：edge-first、社区分块、WAL、快照、跨平台；难度 ⭐⭐⭐⭐⭐；12–18 个月；"需要存储系统专家"；❌ 未开始 | 磁盘层是真正的大研究课题，不能草率开始 |
| `HARD-TODO.md` #1/#2 | 图的工作记忆、图 Loop —— 两个 P0 研究题，❌ 未开始 | 储存不是终点，Loop 才是产品 |
| `current-roadmap.md` | "方向 D 存储物理化执行中"；D0' ✅ → D1' ⏳ → D2' ⏳；开放问题：init 不落盘；D2' 后决策 C（WAL）/E（分层折叠）/A（mmap/磁盘格式） | 储存结构已是当前主线 |
| `csr-dual-layout-plan.md` v2 | §0 修订记录砍掉磁盘格式 v0x0003、惰性加载、mmap、WAL；"磁盘优化是 HARD-TODO 两次推迟的东西，不该排最前"；ADR-D1 内存 CSR 优先；V3 "impact 是 Loop 的传播原语，必须物理化" | 先内存、后磁盘的次序是显式决策 |
| `benchmarks/hotspots.md`（D0'） | impact 占查询时间 99.7%；根因：centrality 每次重算（query.rs:94）+ 逐节点×逐字段全扫描（cluster.rs:353）；100k 边序列化 35.3 MB（~350 B/边）；阈值 T1 ≤60µs / T2 ≤500µs / T4 load ≤195ms | 战场是"重算"，修法是把结构物化——本质是内存储存结构问题 |
| `knowledge-base/04-architecture/storage-format.md` + `storage/mod.rs` | .stz v0x0002：magic + version + flags + salt + msgpack 内容 + blake3；zstd(3) + chacha20 + argon2；v1 向后兼容测试 ✅ | 磁盘格式现状：单文件全量快照，无流式/分块 |
| `knowledge-base/06-unresolved/open-questions.md` | §2.3 大文件（>100MB）流式处理；§3.1 跨 Cluster 引用；§3.2 三路合并；§3.3 惰性克隆；§3.5 diff 性能 | D1' 之后的储存研究候选清单 |
| `07-agent-interaction/07-roadmap.md` | 产品向 Phase 1–6（注入 → MCP → 表征层 → 多 Agent → Dashboard），全部未开始，排在"引擎稳固"之后 | 储存研究是引擎稳固的一部分，不是产品进度的替代 |
| `RESEARCH-WORKFLOW.md` | 建议 Experiment 001 = 工作记忆（pre-reboot 时代） | 被当前路线图（方向 D）取代；其"假设→实验→结论"方法仍适用 |

---

## 三、两层储存结构的拆分

### 3.1 内存层（D1'，当前战场）

- **内容**：`src/graph/csr.rs` 增量 in/out 度索引 + Cluster 级反相索引；traverse 走 out 索引，`impact_across_fields` 走 in 索引；公共 API 不变；属性测试对照 HashMap 实现 100/100。
- **依据**：D0' 数据显示 traverse/path 已是 µs 级（1.4µs/op），CSR"缓存友好遍历"被数据否定；真热点是重算。**修法就是把本应是结构的事实物化成索引**——这正是"内存储存结构"。
- **范围红线**：不新建磁盘格式、不碰序列化管线、不做惰性加载；CSR 构建成本必须计入基准（T4）。

### 3.2 磁盘层（HARD-TODO #4，D2' 决策点）

- **候选方向**（`current-roadmap.md` §五）：C = 完整 WAL（日志结构写路径）；E = 分层折叠（社区分块/多粒度存储）；A = mmap / 磁盘格式（edge-first）。
- **纪律**：D2' 以 statuz 自举图 + 合成 1M 边压力图重跑基准，产出 `benchmarks/realgraph-v2.md`，**书面决策必须有数字，不许"感觉上值得"**。
- **已知物理债**（D0' 附带发现）：100k 边 35.3 MB = 每条边 ~350 字节（msgpack + 三份拷贝 + 字符串开销）。当前最大图 ~1000 节点、几十 KB，大小无关紧要——所以"文件瘦身"类目标被计划判为虚荣指标砍掉。

---

## 四、为什么"现在"是储存结构（时序论证）

1. **M0–M7 已全绿**（103 测试 / self-test 11 阶段 / clippy / e2e 12 阶段）——功能正确性基线已建立，研究可以转向性能结构层。
2. **D0' 数据已锁定战场**——99.7% 的查询时间在 impact，根因是结构缺失（重算），不是算法不好。这是"储存结构"问题，不是"图算法"问题。
3. **Loop 需要物理化的 impact**——设计哲学要"信息主动释放"，而释放的传播原语是 impact（V3）。先物化结构，后做注意力层，次序符合"底座先行"。
4. **磁盘层的前置决策需要真实数据**——C/E/A 立项的唯一依据是 D2' 报告；在此之前磁盘研究没有数据支撑，是赌博。

---

## 五、边界与纪律（防止研究偏移）

来自 D 计划 v2 的严苛规则，同样适用于后续储存研究：

- **S1 测量先行**：热点不明，优化就是赌博。
- **S2 阈值由数据定**：达标线在测量结束时写定，不许事后改。
- **S5 引擎指标 ≠ 产品进度**：基准表用于工程决策；North Star 验证属于注意力层立项后的事。
- **S6 一次重试**：不达标 → 回滚 + 换方案，绝不硬撑。
- **V1 纪律**：Cluster 只是存储物理，不是语义容器——任何"顺手加个语义字段"的冲动都要拦下。
- **范围蔓延免疫**：v2 的 §0 修订记录是防回潮的永久记录；任何新会话先读它。

---

## 六、D1' 之后的储存研究方向排序（候选）

| 优先级 | 方向 | 来源 | 说明 |
|--------|------|------|------|
| 1 | D1' 内存索引（当前） | `csr-dual-layout-plan.md` | 增量度索引 + 反相索引，T1/T2/T4 阈值 |
| 2 | D2' 真实图验证 + C/E/A 决策 | `current-roadmap.md` §二/§五 | 决定磁盘层是否立项、以什么顺序 |
| 3 | 大文件流式处理（>100MB） | `open-questions.md` §2.3 | 惰性加载 / 分块 / mmap 的候选入口 |
| 4 | 跨 Cluster 引用 | `open-questions.md` §3.1 | `cluster://path#node` 引用 + 惰性加载 |
| 5 | 三路合并（共同祖先） | `open-questions.md` §3.2 | Cluster 元数据存父哈希 |
| 6 | 惰性克隆 / CoW | `open-questions.md` §3.3 | 大 Cluster 克隆成本 |
| 7 | 跨 Cluster diff 哈希索引 | `open-questions.md` §3.5 | diff 全量比较优化 |

注意：3–7 全部属于"储存结构"研究域，但都排在 D1'/D2' 之后，且立项需要各自的数据依据。

---

## 七、对路线图的建议

1. **立即执行 D1'**（1.5–2 天时间盒）：`src/graph/csr.rs` + 访问路径切换 + 属性测试 + `benchmarks/csr-vs-hashmap.md`。门禁全绿才提交。
2. **D1' 达标后立即 D2'**：生成 statuz 自举图 + 1M 边压力图，产出真实图报告，书面决策 C/E/A。
3. **磁盘格式研究（HARD-TODO #4）正式立项的条件**：D2' 报告显示内存索引不够用（或真实图规模触发 load/序列化瓶颈），且能落到 North Star（context-recovery cost）——不是"文件更小"或"数字更快"。
4. **不要把储存研究做成永久主线**：D2' 决策后，研究重心应按序转向 Loop 物理化之后的注意力层问题（HARD-TODO #1 工作记忆、#2 Loop 定义），它们才是产品定义的 P0。

---

*本审查基于 2026-08 文档状态。任何偏离必须走 S4 决策留痕，口头变更无效。*
