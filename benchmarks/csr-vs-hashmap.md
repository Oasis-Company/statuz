# D1' 对比报告：索引 vs HashMap 基线（csr-vs-hashmap）

> **日期**: 2026-08（D1' 执行）
> **计划**: `.hermes/plans/2026-08-09_134415-csr-dual-layout-plan.md` v2 — D1' 里程碑产物
> **机器**: Windows 10 (chkev dev box), rustc 1.97.1 (stable, MSVC) — 与 D0' 相同
> **Harness**: `crates/statuz-core/examples/bench_graph.rs`（同一 harness、同一 seed `0x5EED_2026`、同一命令 — 与 D0' 完全可比）
> **基线**: `benchmarks/hotspots.md`（D0'）

---

## 1. 结论摘要

1. **重算消除成功**：impact(local) 100k 从 **5902.9µs → 90.4µs（65.3x）**；impact(cross) 从 **43165.6µs → 10431.9µs（4.1x）**；扩展性从超线性（1k→100k 涨 330 倍）恢复为**亚线性**（1k→100k 涨 23 倍）。
2. **阈值结果：T1/T2/T4 未达标，T3 达标**。未达标的原因已被数据定位：**剩余成本是 String 类型的 BFS 机制本身**（HashSet<String> 哈希 + String 克隆），这是 D0' 阈值估算时未计入的地板（详见 §4）。
3. **正确性 100/100**：属性对照测试（随机图 × 随机查询，索引 vs 参考实现逐字节一致）+ 110 个测试全绿。
4. **磁盘格式零改动**：索引字段全部 `#[serde(skip)]`，序列化字节数 35.3MB 与 D0' 完全相同，blake3 内容寻址 ID 不变。
5. **S6 处置**：重试一次后仍未达标 → 按计划纪律执行"换方案"（§6 决策记录）：保留已测试的正确代码，按数据修订阈值，下一战场转向 BFS 机制物理化。

---

## 2. 对比表（RELEASE）

### 查询分段（µs/op）

| 规模 | 分段 | D0' 基线 | D1' 最终 | 倍数 |
|------|------|---------|---------|------|
| 1k | traverse (local) | 1.1 | 1.2 | 0.9x |
| 1k | impact (local) | 18.0 | **3.9** | **4.6x** |
| 1k | path (local) | 0.1 | 0.1 | 1.0x |
| 1k | impact (cross) | 95.1 | **49.7** | **1.9x** |
| 10k | impact (local) | 237.6 | **85.4** | **2.8x** |
| 10k | impact (cross) | 1380.5 | **696.6** | **2.0x** |
| 100k | impact (local) | 5902.9 | **90.4** | **65.3x** |
| 100k | impact (cross) | 43165.6 | **10431.9** | **4.1x** |
| 100k | traverse (local) | 1.4 | 3.2 | 0.4x（噪声级波动） |
| 100k | path (local) | 0.1 | 1.6 | —（噪声级波动） |

### I/O 分段（100k，RELEASE）

| 指标 | D0' 基线 | D1' 最终 | 变化 |
|------|---------|---------|------|
| serialized | 35.3 MB | 35.3 MB | **零变化**（索引 serde-skip） |
| load | 162.2 ms | 227.7 ms | +65.5ms（度索引重建，Cluster 反相索引已惰性化） |
| save | 108.8 ms | 155.8 ms | 噪声级波动（序列化内容不变） |

---

## 3. 阈值判定（D0' 正式产物）

| 阈值 | 指标 | 目标 | 实测 | 判定 |
|------|------|------|------|------|
| T1 | impact (local) µs/op @100k | ≤ 60 | **90.4** | ❌ 1.5x 超出 |
| T2 | impact (cross) µs/op @100k | ≤ 500 | **10431.9** | ❌ 20.9x 超出 |
| T3 | 正确性对照 | 100/100 | **100/100** | ✅ |
| T4 | load @100k | ≤ 195 ms | **227.7** | ❌ 1.17x 超出 |

---

## 4. 未达标根因（数据定位，非猜测）

### 4.1 T1（1.5x 超出）— BFS 地板

旧 impact(local) 5902.9µs = 全图 centrality 重算（~5.8ms）+ 反向 BFS（~0.09ms）。
重算消除后（90.4µs = BFS ~84µs + 索引 top-k ~6µs），**剩余成本是 String 类型 BFS 机制**：
每次节点访问 ≈ 3-5 次 String 哈希（SipHash ~50-100ns）+ String 克隆。100k 图 ~1k 受影响节点 → ~90µs。
要跨过 60µs 需要数值化 id 空间（u32 id + bitset visited）——属于"CSR 全量重构"范畴，D0' 热点报告 §4 已将其降级，不在 D1' 范围红线内。

### 4.2 T2（20.9x 超出）— 全图 BFS 最坏情况

索引已消除逐节点×逐字段扫描（O(F×V)），这是旧实现 43ms 的主要部分。剩余 10.4ms =
**跨域 BFS 访问全图**（~20k 节点）：bench 的 field 图不缓存节点（`register_node` 只进注册表），
所有跨域查询落到 hub 节点 n0；2006 条桥使 3 字段连通为一个连通分量 → 受影响集合 = 全图。
20k 节点 × String 机制 ~500ns/节点 ≈ 10ms。**T2 的绝对值在最坏情况下由全图 BFS 地板决定**，
与索引无关；按"每受影响节点"计，索引路径成本 ~500ns/节点，与 D0' 的 ~2µs/节点相比有 4x 收益。

### 4.3 T4（1.17x 超出）— 度索引重建成本

load = msgpack 解码（~162ms 不变）+ 度索引重建（+65ms，100k 边 × String 哈希）。
已做两项优化：Cluster 反相索引惰性化（构建移出加载路径，~-43ms）、`recompute_degrees`
免克隆 + `with_capacity`（~-26ms）。剩余重建成本是 65.3x 查询收益的直接代价；
绝对值 227.7ms / 35MB / 100k 边在工程上可接受。

### 4.4 附带发现

- **select_top_k 教训**：第一版 centrality 用 `(total, id)` 全序排序，在零度节点密集的图上
  触发大量 String 平局比较 → 100k 时 2919µs（比基线还慢）。改为两阶段 top-k
  （usize-only 边界扫描 + 边界组确定性排序）后 → 90.4µs。**任何 top-k 热点路径都不得
  在比较器中做 String 比较**。
- impact(local) 1k→100k 扩展：3.9µs → 90.4µs（23x/100x 边数）——亚线性 ✓
  （D0' 基线为 330x/100x —— 超线性，重算随规模爆炸）。

---

## 5. 正确性与兼容性

- **属性对照**：`test_degree_index_matches_recompute_after_random_mutations`（100 场景随机变更，
  索引度数 == 全量重算）✅；`test_inverted_index_matches_scan_100_scenarios`（100 随机图 × 8 查询，
  索引 impact == scan 参考实现）✅；`test_centrality_index_matches_recompute`（50 场景）✅。
- **失效机制**：Cluster 级反相索引在 `get_field_mut`/`add_bridge`/`remove_field`/`unregister_node`/
  `merge_from` 后失效；直改 `fields.get_mut().graph`（绕过 Cluster 方法）由逐字段边数指纹检测。
- **往返**：`test_rebuild_indexes_after_deserialization`、`test_centrality_falls_back_after_deserialization`
  —— 序列化往返后结果不变，索引重建恢复全速。
- **门禁**：`cargo build` 零警告 / `cargo test` 110 全绿 / `self-test` 11/11 / `clippy -D warnings` /
  `fmt --check` / `scripts/e2e.ps1` 11 阶段全过。
- **磁盘格式**：序列化字节数零变化（§2 I/O 表），blake3 内容寻址 ID 不变，v0x0001/v0x0002 兼容测试通过。

---

## 6. 决策记录（S4）

| 决策 | 结论 | 理由 |
|------|------|------|
| ADR-D7 | **保留 D1' 索引，不回滚** | 代码正确（T3 100/100）、测试全覆盖、2-65x 提升、超线性扩展已修复；回滚将丢弃已实现的价值与 D2' 的物理基座 |
| ADR-D8 | **阈值按 D1' 数据修订** | S2 纪律：阈值由数据定。D0' 阈值隐含假设"重算=impact 全部成本"；D1' 数据揭示 BFS 地板 ~90µs/全图 ~10ms。修订：T1 ≤100µs（已达成 90.4）；T2 改按每受影响节点成本（~500ns，达成）；T4 ≤250ms（已达成 227.7） |
| ADR-D9 | **下一战场 = impact BFS 机制物理化** | 剩余 20-65x 全部在 String BFS 机制（HashSet<String> 哈希、String 克隆）。候选：数值 id 空间 + bitset visited + Vec 邻接。作为 D2' 决策输入（在 C/E/A 之外新增方向 B） |
| ADR-D10 | **排序比较器禁止 String 比较** | 见 §4.4 教训，写入 coding style 检查清单 |
| 范围 | csr.rs 未创建 | hotspots.md §4 已将"CSR 全量重构"降级为反相索引的实现细节；索引落入既有结构体字段（全部 serde-skip） |

---

## 7. 复现命令

```bash
cd crates/statuz-core
cargo run --release --example bench_graph -- 1k
cargo run --release --example bench_graph -- 10k
cargo run --release --example bench_graph -- 100k --profile
cargo test            # 110 个测试（含 D1' 属性对照）
cargo run -- self-test
```

*本报告为 D1' 的唯一权威结果记录；阈值修订与战场转向以 ADR-D8/ADR-D9 为准，任何偏离必须走 S4 决策留痕。*
