# D0' 热点剖析报告（基准基线）

> **日期**: 2026-08-09
> **计划**: `.hermes/plans/2026-08-09_134415-csr-dual-layout-plan.md` v2 — D0' 里程碑产物
> **机器**: Windows 10 (chkev dev box), rustc 1.97.1 (stable, MSVC)
> **Harness**: `crates/statuz-core/examples/bench_graph.rs`（确定性 LCG seed 0x5EED_2026，可复现）
> **模式**: RELEASE 构建（绝对数字）；DEBUG 份额趋势一致（附后）

---

## 1. 合成图生成规则（Q1 — 请团队 review）

- 节点数 = 边数/5 + 50；3 个字段（arch/data/team）；桥数 = 边数/100 + 3
- 局部边：60% 挂接中心节点（index % 20 == 0），40% 均匀随机；source ≠ target
- 关系 = depends_on，weight = 0.5；桥 weight = 0.8
- 查询量：局部遍历 10k 次；局部 impact/path 各 1k 次；跨域各 100–300 次（随规模自适应）

---

## 2. 分段测量（RELEASE）

### 规模 1k（250 节点 / 1025 边 / 26 桥）

| 段 | 总量 ms | µs/op | 占比 |
|----|--------|-------|------|
| traverse (local) | 11.1 | 1.1 | 17.1% |
| impact (local) | 18.0 | **18.0** | 27.6% |
| path (local) | 0.1 | 0.1 | 0.1% |
| traverse (cross) | 7.3 | 24.4 | 11.2% |
| impact (cross) | 28.5 | **95.1** | 43.8% |
| path (cross) | 0.1 | 0.3 | 0.1% |

### 规模 10k（2050 节点 / 10205 边 / 206 桥）

| 段 | 总量 ms | µs/op | 占比 |
|----|--------|-------|------|
| traverse (local) | 14.8 | 1.5 | 3.7% |
| impact (local) | 237.6 | **237.6** | 59.2% |
| path (local) | 0.1 | 0.1 | 0.0% |
| traverse (cross) | 10.9 | 108.9 | 2.7% |
| impact (cross) | 138.0 | **1380.5** | 34.4% |
| path (cross) | 0.0 | 0.3 | 0.0% |

### 规模 100k（20050 节点 / 102005 边 / 2006 桥）

| 段 | 总量 ms | µs/op | 占比 |
|----|--------|-------|------|
| traverse (local) | 14.0 | 1.4 | 0.1% |
| impact (local) | 5902.9 | **5902.9** | 57.6% |
| path (local) | 0.1 | 0.1 | 0.0% |
| traverse (cross) | 14.2 | 142.4 | 0.1% |
| impact (cross) | 4316.6 | **43165.6** | 42.1% |
| path (cross) | 0.0 | 0.4 | 0.0% |

### I/O 段（RELEASE）

| 规模 | serialized | save | load | build |
|------|-----------|------|------|-------|
| 1k | 341 KB | 0.5 ms | 1.6 ms | 1.6 ms |
| 10k | 3.4 MB | 7.6 ms | 13.8 ms | 15.6 ms |
| 100k | 35.3 MB | 108.8 ms | 162.2 ms | 204.9 ms |

---

## 3. 热点排名与根因（代码定位）

| 排名 | 热点 | 100k µs/op | 占比 | 根因（代码证据） |
|------|------|-----------|------|-----------------|
| 1 | impact (local) | 5902.9 | 57.6% | **每次调用重算 `centrality(5)`**（query.rs:94）→ 每调用 O(V+E) 全图扫描；1k→100k 涨 330 倍（边数 100 倍）= 超线性 |
| 2 | impact (cross) | 43165.6 | 42.1% | **逐出队节点 × 逐字段全扫描**（cluster.rs:353 起 `for field in self.fields.values()`）→ O(F×(V+E))/调用；1k→100k 涨 450 倍 |
| 3 | traverse (cross) | 142.4 | 0.1% | 非热点。BFS 正常开销 |
| 4 | traverse (local) | 1.4 | 0.1% | 非热点。O(degree)，平坦扩展 |

**结论：impact 占查询时间 99.7%。遍历/路径已经很快（µs 级、平坦扩展）。**

---

## 4. 对 D1' 的范围修订（S2：阈值由数据定）

**数据否定了原计划的半个动机**：CSR"缓存友好遍历"在 traverse 上无可测量收益（1.4µs/op 已接近地板）。**真正的战场是"重算"**——两个热点都是"本该是结构的东西被每次重算"：

| 战场 | 病灶 | 修法（D1' 修订范围） | 预期 |
|------|------|---------------------|------|
| 战场 1（57.6%） | impact 每次重算 centrality(5)（O(V+E)） | 增量维护 in/out 度索引（add/remove 时 O(1) 更新），centrality 改读索引 | impact(local) 从 5903µs → ≤60µs（**≥98x**） |
| 战场 2（42.1%） | impact_across_fields 逐节点×逐字段全扫描 | Cluster 级反相索引（node → 跨字段入边），替代全扫描 | impact(cross) 从 43166µs → ≤500µs（**≥86x**） |
| 不战 | traverse / path | **不动**（数据证明无收益；CSR 全量重构降级为反相索引的实现细节） | — |

### D1' 达标阈值表（本报告的正式产物，D1' 必须达到）

| 阈值 | 指标 | 基线（100k RELEASE） | 目标 |
|------|------|---------------------|------|
| T1 | impact (local) µs/op | 5902.9 | **≤ 60**（≥98x） |
| T2 | impact (cross) µs/op | 43165.6 | **≤ 500**（≥86x） |
| T3 | 正确性对照 | — | 100 随机场景 × 双实现结果一致（100/100） |
| T4 | load 回归 | 162.2 ms | ≤ 195 ms（1.2x 上限，索引构建不得拖垮加载） |

### 附带发现（记录，不立项）

- **物理债实锤**：100k 边序列化 35.3 MB = 每条边 ~350 字节（msgpack + 三份拷贝 + 字符串开销）。磁盘格式优化仍属未来方向（E/A），不在 D1'。
- **load 162ms @100k**：当前非瓶颈；若真实图达 1M 边将成问题（V4 相关，届时再议）。

---

## 5. DEBUG 份额对照（趋势一致，供复现）

100k DEBUG：impact (local) 64.3% + impact (cross) 34.9% = 99.2%；traverse/path < 0.7%。份额结论与 RELEASE 一致。

---

## 6. 复现命令

```bash
export PATH="$HOME/.cargo/bin:$PATH"
cd crates/statuz-core
cargo run --release --example bench_graph -- 1k
cargo run --release --example bench_graph -- 10k
cargo run --release --example bench_graph -- 100k --profile
```

*D0' DoD 达成：`cargo run --example bench_graph -- 100k --profile`（DEBUG）输出分段热点表 ✅；本报告含阈值表 ✅。*
