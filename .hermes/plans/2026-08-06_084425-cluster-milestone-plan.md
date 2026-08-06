# Cluster 分阶段开发计划（科学里程碑版）

> **制定日期**: 2026-08-06
> **目标**: 让 Cluster 开发从"一坨大功能"变成 8 个可演示、可验收、可回滚的里程碑，每个重大阶段点都有看得见的成果。
> **适用**: 团队后续所有 Cluster 相关开发会话。

---

## 0. 问题诊断 — 为什么节奏混乱

| 根因 | 现状证据 | 后果 |
|------|---------|------|
| 目标过高 | Cluster 一次捆绑 ~10 个能力：节点注册、字段、桥接、跨域三查询、diff、validate、subgraph、克隆、合并、密码、可见性、存储、加密压缩、CLI | 任何一个"完成"都意味着十几个子功能全做完 → 永远没有完成时刻 → 没有节奏 |
| 看不到成果 | 代码一次写一大坨（cluster.rs 单文件 1113 行），中间状态无法演示 | 团队无法感知进度，士气下降 |
| 环境未就绪 | 本机没有 Rust 工具链（`~/.cargo` 不存在），`cargo test` / `cargo run -- self-test` 根本跑不起来 | 连"绿灯基线"都没有，提交前无法验证，`git log` 出现 `update` 这种无意义提交 |
| 缺少完成定义 | 没有里程碑级 DoD（Definition of Done），roadmap 文档停留在 7-13（存储升级+官网） | 每个会话各自为政 |

**关键洞察**：Cluster 的代码大部分已经写完了（~2500 行、11 个 CLI 命令、v0x0002 存储格式都在）。所以这份计划的实质不是"从零重写"，而是 **分阶段验证 + 补缺口 + 建立绿灯基线**。真正的最大阻塞是 M0：工具链没装。

---

## 1. 方法论 — 科学分阶段的四个原则

- **P1 行走骨架（Walking Skeleton）**：每个里程碑是一个"能跑的最小切片"，不是一个功能家族。
- **P2 成果物可见（Visible Artifact）**：每个里程碑结束时必须有一个能当场演示/检查的成果物——一条命令输出、一个 .stz 文件、一组通过测试、一个 e2e 脚本。
- **P3 硬门槛（Hard Gate）**：里程碑之间用绿灯基线隔开：`cargo test` 全绿 + `cargo run -- self-test` 全绿 + 提交。不绿不前进。
- **P4 时间盒（Time-box）**：每个里程碑限 1 个开发日（或 2-3 个会话）。超时说明拆得还不够细，回到 P1 再拆，不许硬撑。

---

## 2. 里程碑总览

| # | 里程碑 | 核心内容 | 看得见的成果（DoD） | 时间盒 |
|---|--------|---------|---------------------|--------|
| **M0** | 环境就绪 | 安装 Rust 工具链，让现有代码编译 | `cargo build` / `cargo test` / `cargo run -- self-test` 三条命令全绿 | 0.5 天 |
| **M1** | Cluster 骨架 | 最小 Cluster：注册节点 + 字段 + 原始存取 | `init → save → load → show` 命令跑通，.stz 文件往返一致 | 1 天 |
| **M2** | 域内五查询 | 字段内 traverse / impact / path / subgraph / validate 验证 + 边界测试 | self-test 新增"域内查询"阶段，边界测试全绿 | 1 天 |
| **M3** | 跨域桥接 | add_bridge 校验 + 跨域三查询 | 演示脚本：双字段 + 桥，跨域遍历/影响/路径输出正确 | 1 天 |
| **M4** | 集群自检 | diff + validate + subgraph 完善 | 两次保存的 diff 输出（added/removed/changed）+ validate 报告 | 1 天 |
| **M5** | 分享机制 | clone / merge（四策略）/ password / visibility | `scripts/e2e.ps1` 全流程（创建→克隆→合并→密码）退出码 0 | 1-1.5 天 |
| **M6** | 存储强化 | 加密 + 压缩往返验证 + 边界测试 | `save --compress` 文件变小；`--encrypt` 后无密码 load 失败、有密码成功 | 1 天 |
| **M7** | 发布准备 | e2e 进 CI + README + v0.1.0-alpha release | GitHub Actions 全绿，release 有可下载二进制 | 1 天 |

**总计约 7-8 个开发日。每个里程碑独立可演示、可回滚、可验收。**

---

## 3. 里程碑详细定义

### M0 — 环境就绪（0.5 天）

**范围**：安装 Rust 工具链；让现有代码编译并通过现有测试。

**任务**：
1. 安装 rustup + stable 工具链（`winget install Rustlang.Rustup` 或 rustup-init.exe），确认 `cargo --version`
2. `cd crates/statuz-core && cargo build` — 修复所有编译错误/警告直到零警告
3. `cargo test` — 全绿
4. `cargo run -- self-test` — 11 阶段全部 ✅

**看得见的成果**：一份可复现的绿色基线。若现有代码有编译错误，M0 的成果物还包括一份"错误清单 + 修复记录"。

**硬门槛**：`cargo test` 0 failed；self-test 全 ✅。

**明确不做**：不重构、不加新功能、不动 CLI。

---

### M1 — Cluster 骨架（1 天）

**范围**：Cluster 最小闭环 = `Cluster{id, name, visibility, nodes, fields, created_at, updated_at}` + 基础方法 + 原始存取（无加密压缩）。

**任务**：
1. 为 `register_node` / `get_node` / `unregister_node` / `create_field` / `get_field` / `remove_field` 补 `#[cfg(test)]` 单元测试（当前测试集中在 sharing.rs，基础方法测试薄弱）
2. 补 serde 往返测试：Cluster → msgpack → Cluster 内容一致
3. CLI 验证：`init -n Demo` → `save -o demo.stz` → `load -p demo.stz` → `show -p demo.stz`，输出与输入一致

**看得见的成果**：
```
$ cargo run -- init -n Demo
✅ Cluster 'Demo' initialized
$ cargo run -- save -o demo.stz
✅ Cluster saved (xxx bytes)
$ cargo run -- load -p demo.stz
📦 Cluster: Demo ...（字段/节点数与保存时一致）
```

**硬门槛**：往返一致；`cargo test` 全绿；库代码无 `unwrap()`。

**明确不做**：bridges、跨域查询、密码、加密、压缩。

---

### M2 — 域内五查询（1 天）

**范围**：验证 Cluster 层面字段内的五查询可用，并补 `graph/query.rs` 边界测试（空图查询、不存在节点、不连通路径）。

**任务**：
1. 为 `graph/query.rs` 补边界单元测试（AGENTS.md 任务 4.2 列过但未落实）
2. 在 `run_self_test()` 中新增"域内查询"阶段：构造示例字段，依次输出 traverse / impact / path / subgraph / validate 结果
3. 验证 `validate()` 能发现不一致（如悬空边）

**看得见的成果**：self-test 输出中新增一段明确的五查询结果；`cargo test` 显示 query.rs 边界测试全部通过。

**硬门槛**：五查询在示例 cluster 上结果正确；边界测试覆盖空图/不存在节点/不连通。

**明确不做**：跨域、新查询类型。

---

### M3 — 跨域桥接（1 天）

**范围**：`add_bridge` 校验（字段存在、节点存在、重复桥接）、跨域 traverse / impact / path 验证。

**任务**：
1. 补 `add_bridge` 错误路径测试：源/目标字段不存在、节点不在注册表、重复桥接
2. 补跨域三查询的单元测试（`traverse_across_fields` / `impact_across_fields` / `path_across_fields`）
3. 新建演示脚本 `scripts/demo-cross-field.ps1`：双字段 + 3 节点 + 1 桥，打印跨域遍历、影响面、路径

**看得见的成果**：演示脚本输出跨域结果（如"从 Field A 的 n1 出发，穿越桥到达 Field B 的 n3，影响面含 B 中 2 个节点"）。

**硬门槛**：桥接双向边成对存储；重复桥接返回错误；跨域查询结果正确。

**明确不做**：桥的删除/编辑、权重语义、跨集群通信。

---

### M4 — 集群自检（1 天）

**范围**：diff / validate / subgraph 完善 + 测试补齐（cluster.rs 后半部分目前测试少）。

**任务**：
1. 补 diff 测试：节点/边/字段的 added/removed/changed 分类，meta 排除规则，weight EPSILON
2. 补 validate 测试：悬空边、重复边、缺失字段引用
3. 补 subgraph 测试：seeds + depth + relation 过滤
4. 演示：保存两份 .stz（改一个节点 label），输出 diff 报告

**看得见的成果**：diff 演示输出；`cargo test` 中 diff/validate/subgraph 测试全绿。

**硬门槛**：diff 分类正确；validate 能报出所有构造的不一致；self-test 全绿。

**明确不做**：自动修复、schema 迁移、diff 输出到文件。

---

### M5 — 分享机制（1-1.5 天）

**范围**：clone（`clone_with_options` 各选项）、merge（四策略）、密码（set/change/clear/unlock）、可见性。

**任务**：
1. 补齐 sharing.rs 剩余测试（密码边界：超长密码、特殊字符；merge 的 rename/merge-meta 策略已测，补 edges/bridges 合并路径）
2. 完善 `scripts/e2e.ps1` 全流程：
   - 创建 → 保存 → verify
   - 克隆 → 改名 → 合并（skip 策略）
   - set-password → 带密码克隆（keep-password）→ clear-password
   - export JSON
3. 修复 e2e 暴露的问题（目前脚本存在但未验证可跑）

**看得见的成果**：`scripts/e2e.ps1` 全程退出码 0，每步有 ✅ 输出。

**硬门槛**：e2e 脚本退出码 0；sharing.rs 单元测试全绿；密码哈希不落明文。

**明确不做**：网络共享、多用户权限、密码交互式输入（TBD 延后）。

---

### M6 — 存储强化（1 天）

**范围**：压缩/加密往返验证 + storage 边界测试（截断数据、magic 错误、版本不匹配、hash 不匹配）。

**任务**：
1. 补 `storage/mod.rs` 边界测试（AGENTS.md 任务 4.2 已列未落实）
2. CLI 演示：`save --compress` 与不压缩对比文件大小；`save --encrypt --password x` 后 `load` 无密码失败（错误提示不泄露密码）、有密码成功
3. 验证 v0x0001 向后兼容路径

**看得见的成果**：演示输出压缩前后字节数对比；加密文件无密码加载失败、有密码加载成功；边界测试全绿。

**硬门槛**：所有构造的损坏文件都被正确拒绝且报错信息不含敏感内容。

**明确不做**：格式 v0x0003、流式 IO、多文件存储。

---

### M7 — 发布准备（1 天）

**范围**：e2e 纳入 CI、README、v0.1.0-alpha release。

**任务**：
1. GitHub Actions：`cargo build` + `cargo test` + `cargo clippy` + `cargo fmt --check`（每次 push/PR）
2. README 更新（快速开始、CLI 速查、架构概述）
3. 打 tag v0.1.0-alpha，发布 Windows/macOS/Linux 二进制

**看得见的成果**：Actions 全绿；release 页面有可下载资产。

**硬门槛**：CI 全绿。

**明确不做**：Dashboard、napi 绑定恢复、官网部署。

---

## 4. 执行规则（防止再次混乱）

1. **一个会话只做一个里程碑**。会话开始先确认当前里程碑编号，结束前必须达到该里程碑的硬门槛。
2. **绿灯才提交**：`cargo test` + `cargo run -- self-test` 全绿才允许 commit。提交信息用 conventional commits（`feat:` / `test:` / `fix:` / `docs:`）。
3. **每个里程碑结束更新 roadmap**：在 `knowledge-base/02-plans/current-roadmap.md` 中勾掉已完成里程碑，写一句成果物说明。
4. **超时拆解**：里程碑超时间盒 → 停止硬撑，把该里程碑再拆成两个，先提交已完成的半截（必须仍全绿）。
5. **演示优先**：每个里程碑的"看得见的成果"必须在提交前实际跑一遍，把输出贴进提交说明。

---

## 5. 风险与开放问题

| # | 风险/问题 | 影响 | 建议 |
|---|----------|------|------|
| 1 | 本机无 Rust 工具链，M0 阻塞一切 | 高 | 团队确认是否允许安装 rustup（winget 即可）；这是第一个要拍板的决定 |
| 2 | 两个自测入口：`main.rs` 的 `run_self_test()` 与 `standalone_test.rs`（零依赖自包含测试） | 中 | M2 前决定：合并为一个入口，或明确 standalone_test.rs 定位（纯算法原型，保留但移出 src/ 或标 deprecated） |
| 3 | 跨域 impact 的 `critical_path` 字段固定为 false | 低 | 语义未定，MVP 可接受；在 M4 记录为已知限制 |
| 4 | CLI 无查询命令（traverse/impact/path 只能通过 self-test / 演示脚本看到） | 低 | 遵守硬规则"Engine 未稳不加 CLI 命令"，M2/M3 用演示脚本展示，不加命令 |
| 5 | cluster.rs 单文件 1113 行，超过 AGENTS.md 800 行上限 | 低 | 不在本计划内重构；M4 之后单独立项拆分（如 diff.rs / validate.rs） |
| 6 | 密码通过 `--password` 明文参数传入 | 中 | AGENTS.md 已注明 interactive 模式 TBD；M5 只验证现有行为，不扩界面 |

---

## 6. 下一步

1. 团队确认：**允许安装 Rust 工具链**（M0 前提）
2. 执行 M0（0.5 天），产出绿色基线
3. 之后每个里程碑按本计划推进，一个会话一个

> 本计划只做一件事：把"Cluster 太难"拆成 8 个"看得到成果的一天"。
