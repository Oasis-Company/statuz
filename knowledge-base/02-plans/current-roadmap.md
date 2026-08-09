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
| D1' | 内存 CSR 双索引 | ⏳ 待执行 | 增量度索引 + Cluster 级反相索引；阈值：impact(local) ≤60µs、impact(cross) ≤500µs（100k RELEASE） | — |
| D2' | 真实图验证 + 决策 | ⏳ 待执行 | 真实图报告 + C/E/A 立项决策 | — |

**D0' 核心发现**：impact 占查询时间 **99.7%**（local 57.6% + cross 42.1%）。两个根因：① impact 每次调用重算 `centrality(5)`（O(V+E) 全图扫描，query.rs:94）；② `impact_across_fields` 逐节点×逐字段全扫描（cluster.rs:353）。遍历/路径已是 µs 级（1.4µs/op），CSR 遍历优化被数据否定。D1' 战场修订为"消除重算"（增量度索引 + 反相索引）。

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

- **D1'（当前）**：增量 in/out 度索引（centrality 不再全图重算）+ Cluster 级反相索引（跨域 impact 不再全字段扫描）；阈值见 `benchmarks/hotspots.md` §4
- M7 收尾：`v0.1.0-alpha` 发布推送（tag 已建，待 push）
- 开放问题：`init` 目前不落盘；D2' 后决策方向 C（WAL）/ E（分层折叠）/ A（mmap/磁盘格式）
