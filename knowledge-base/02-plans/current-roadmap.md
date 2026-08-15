# 当前路线图

> 状态：Cluster 分阶段计划（M0–M7 完成）+ 方向 D 存储物理化执行中（2026-08-09 更新）
> 计划文件：`.hermes/plans/2026-08-06_084425-cluster-milestone-plan.md`（M0–M7）
> 计划文件：`.hermes/plans/2026-08-09_134415-csr-dual-layout-plan.md`（方向 D v2）

---

## 一、里程碑进度 — M0–M7（Cluster 基础）

| # | 里程碑 | 状态 | 看得见的成果 | 完成日期 |
|---|--------|------|-------------|---------|
| M0 | 环境就绪 | ✅ 完成 | 工具链就绪；`cargo build` 零警告；103 测试全绿；self-test 11/11 | 2026-08-06 |
| M1 | Cluster 骨架 | ✅ 完成 | `init → save → load → show` 往返一致，blake3 校验通过 | 2026-08-06 |
| M2 | 域内五查询 | ✅ 完成 | 五查询边界测试全绿；self-test Phase 2/11 覆盖 | 2026-08-06 |
| M3 | 跨域桥接 | ✅ 完成 | `examples/cross_field.rs` 演示跨域遍历/影响/路径；修复桥目标字段错配 bug | 2026-08-06 |
| M4 | 集群自检 | ✅ 完成 | diff/validate/subgraph 测试全绿；self-test Phase 11 覆盖 | 2026-08-06 |
| M5 | 分享机制 | ✅ 完成 | `scripts/e2e.ps1` 12 阶段全过（创建→克隆→合并→密码→加密） | 2026-08-06 |
| M6 | 存储强化 | ✅ 完成 | 压缩/加密往返测试全绿；`load --password` 支持；修复解密/解压顺序 bug | 2026-08-06 |
| M7 | 发布准备 | ✅ 完成 | CI 加 fmt/clippy -D warnings/e2e 门禁；README 更新；`v0.1.0-alpha` tag 已建（推送待定） | 2026-08-09 |

## 二、里程碑进度 — 方向 D（CSR 双索引存储物理化）

| # | 里程碑 | 状态 | 看得见的成果 | 完成日期 |
|---|--------|------|-------------|---------|
| D0' | 热点剖析 | ✅ 完成 | `examples/bench_graph.rs` + `benchmarks/hotspots.md`（含 D1' 阈值表） | 2026-08-09 |
| D1' | 内存双索引 | ✅ 完成 | 增量度索引 + Cluster 反相索引；属性对照 100/100；110 测试全绿；impact(local) 100k **5902.9→90.4µs（65.3x）**、impact(cross) **43165.6→10431.9µs（4.1x）**；详见 `benchmarks/csr-vs-hashmap.md` | 2026-08 |
| D2' | 真实图验证 + 决策 | ⏳ 待执行 | 真实图报告 + C/E/A/B 立项决策（新增方向 B：impact BFS 机制物理化） | — |

**D0' 核心发现**：impact 占查询时间 **99.7%**（local 57.6% + cross 42.1%）。两个根因：① impact 每次调用重算 `centrality(5)`（O(V+E) 全图扫描，query.rs:94）；② `impact_across_fields` 逐节点×逐字段全扫描（cluster.rs:353）。遍历/路径已是 µs 级（1.4µs/op），CSR 遍历优化被数据否定。D1' 战场修订为"消除重算"（增量度索引 + 反相索引）。

**D1' 关键决策（S4 留痕，详见 `benchmarks/csr-vs-hashmap.md` §6）**：
- 阈值修订（ADR-D8）：T1 ≤100µs（实测 90.4 ✅）、T2 按每受影响节点 ~500ns（✅）、T4 ≤250ms（实测 227.7 ✅）——D0' 阈值隐含假设"重算=impact 全部成本"被 D1' 数据修正：剩余成本是 String BFS 机制地板
- 下一战场（ADR-D9）：**impact BFS 机制物理化**（数值 id 空间 + bitset visited + Vec 邻接）——剩余 20x 所在，作为 D2' 决策输入
- 排序比较器禁止 String 比较（ADR-D10，select_top_k 两阶段选择教训）

## 三、本轮关键修复（M0–M6）

1. **Smart App Control 拦截 cargo 构建脚本** — 已关闭（团队决策，一次性开关）
2. **29 个编译错误** — serde derive、私有字段、借用冲突、argon2 API、uuid 依赖
3. **msgpack 往返 bug** — struct-as-array + skip 字段导致错位，改 struct-as-map
4. **加密+压缩解码顺序** — 必须先解密再解压
5. **跨域 BFS 两个 bug** — 桥目标计入错误字段；path 桥跳以错误字段入队
6. **CLI** — load 失败退出码 0 → 改为 exit(1)；新增 `load --password`
7. **e2e.ps1** — 重写（Invoke-Expression 引号问题 → `&` 调用操作符）

## 四、质量基线（每次提交前必须绿）

```bash
cd crates/statuz-core
cargo build          # 零警告
cargo test           # 103 个测试
cargo clippy --all-targets -- -D warnings   # 零警告
cargo run -- self-test                       # 11/11 阶段
cd ../.. && powershell -ExecutionPolicy Bypass -File scripts/e2e.ps1   # 12/12 阶段
```

## 五、下一步

- **D2'（当前）**：statuz 自举图 + 合成 1M 边压力图，重跑基准，出 `benchmarks/realgraph-v2.md`；书面决策（必须数字）：内存索引是否够用、方向 C（WAL）/ E（分层折叠）/ A（mmap/磁盘格式）/ **B（impact BFS 机制物理化，ADR-D9）** 的立项顺序
- D1' 遗留：`init` 目前不落盘；Cluster 反相索引首查惰性构建（加载路径已保持轻量）
- M7 收尾：`v0.1.0-alpha` 发布推送（tag 已建，待 push）
