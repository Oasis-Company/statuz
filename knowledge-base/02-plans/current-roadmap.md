# 当前路线图

> 状态：Cluster 分阶段计划执行中（2026-08-06 更新）
> 计划文件：`.hermes/plans/2026-08-06_084425-cluster-milestone-plan.md`

---

## 一、里程碑进度

| # | 里程碑 | 状态 | 看得见的成果 | 完成日期 |
|---|--------|------|-------------|---------|
| M0 | 环境就绪 | ✅ 完成 | 工具链就绪；`cargo build` 零警告；103 测试全绿；self-test 11/11 | 2026-08-06 |
| M1 | Cluster 骨架 | ✅ 完成 | `init → save → load → show` 往返一致，blake3 校验通过 | 2026-08-06 |
| M2 | 域内五查询 | ✅ 完成 | 五查询边界测试全绿；self-test Phase 2/11 覆盖 | 2026-08-06 |
| M3 | 跨域桥接 | ✅ 完成 | `examples/cross_field.rs` 演示跨域遍历/影响/路径；修复桥目标字段错配 bug | 2026-08-06 |
| M4 | 集群自检 | ✅ 完成 | diff/validate/subgraph 测试全绿；self-test Phase 11 覆盖 | 2026-08-06 |
| M5 | 分享机制 | ✅ 完成 | `scripts/e2e.ps1` 12 阶段全过（创建→克隆→合并→密码→加密） | 2026-08-06 |
| M6 | 存储强化 | ✅ 完成 | 压缩/加密往返测试全绿；`load --password` 支持；修复解密/解压顺序 bug | 2026-08-06 |
| M7 | 发布准备 | 🔄 进行中 | CI 加 fmt/clippy -D warnings/e2e 门禁；README 更新；v0.1.0-alpha 待发布 | — |

## 二、本轮关键修复（M0-M6）

1. **Smart App Control 拦截 cargo 构建脚本** — 已关闭（团队决策，一次性开关）
2. **29 个编译错误** — serde derive、私有字段、借用冲突、argon2 API、uuid 依赖
3. **msgpack 往返 bug** — struct-as-array + skip 字段导致错位，改 struct-as-map
4. **加密+压缩解码顺序** — 必须先解密再解压
5. **跨域 BFS 两个 bug** — 桥目标计入错误字段；path 桥跳以错误字段入队
6. **CLI** — load 失败退出码 0 → 改为 exit(1)；新增 `load --password`
7. **e2e.ps1** — 重写（Invoke-Expression 引号问题 → `&` 调用操作符）

## 三、质量基线（每次提交前必须绿）

```bash
cd crates/statuz-core
cargo build          # 零警告
cargo test           # 103 个测试
cargo clippy --all-targets -- -D warnings   # 零警告
cargo run -- self-test                       # 11/11 阶段
cd ../.. && powershell -ExecutionPolicy Bypass -File scripts/e2e.ps1   # 12/12 阶段
```

## 四、下一步

- M7 收尾：打 tag `v0.1.0-alpha` 发布（Windows 二进制，CI 已配置）
- 开放问题：`init` 目前不落盘（save 保存的是内置演示集群）——需要 CLI 状态设计
- 后续方向：cross-field impact 的 `critical_path` 语义、cluster.rs 拆分（1113→800 行上限）
