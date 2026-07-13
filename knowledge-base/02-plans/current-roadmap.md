# 当前路线图

> 状态：活跃规划中（2026-07-13）
> 对应文档：`.trae/documents/statuz-roadmap-website-plan.md`

---

## 一、路线图全景

```
Phase 4 (Day 4-5)  ──→  引擎完善 + 端到端验证
    ↓
Phase 5 (Day 6-8)  ──→  官网构建（已完成）
    ↓
Phase 6 (Day 9-10) ──→  集成与发布
```

---

## 二、Phase 4：引擎完善

### 2.1 方向选择：三个方向合并为一个

放弃仪表盘 TUI（它是 UI 层的先兆，但官网是更高优先级的 UI），专注于：

**存储格式升级 + 自测增强**

### 2.2 任务 4.1：存储格式升级 — 加密与压缩

当前 `flags` 字段的加密/压缩位是占位符，未实现真实功能。

- **压缩**：使用 `zstd`（`zstd` crate）压缩 msgpack 后的 content
  - `flags = 0x0001`（`FLAG_COMPRESSED`）
  - 解压时检查 flags，有压缩标记则先解压再反序列化
- **加密**：使用 `chacha20`（`chacha20` crate）加密 content，密钥派生自 argon2
  - `flags = 0x0002`（`FLAG_ENCRYPTED`）
  - 加密密钥 = argon2(password, salt, ...) 输出前 32 字节
  - salt 存储在 msgpack 内（Cluster 的 `encryption_salt` 字段）
  - 同时加密 + 压缩：`flags = 0x0003`
- **CLI 参数**：`statuz save --compress` / `statuz save --encrypt`
- **新增依赖**：`zstd`、`chacha20`

### 2.3 任务 4.2：`#[cfg(test)]` 单元测试

当前 self-test 是集成测试，无法测试边界情况。

| 文件 | 测试场景 |
|------|---------|
| `graph/engine.rs` | 空图 add_edge、删除不存在节点、重复边、自环 |
| `graph/query.rs` | 空图查询、不存在节点、不连通路径 |
| `cluster/cluster.rs` | 空字段创建、重复桥接、删除字段后桥接残留 |
| `cluster/sharing.rs` | 克隆空 Cluster、合并空 Cluster、密码边界（空字符串、超长） |
| `storage/mod.rs` | 空内容反序列化、截断数据、版本不匹配、magic 错误 |

### 2.4 任务 4.3：AGENTS.md 更新

- 添加 CLI 11 个命令列表
- 添加 sharing.rs 模块描述
- 更新存储格式描述（加密/压缩 flags）

### 2.5 任务 4.4：端到端脚本

创建 `scripts/e2e.ps1`，测试完整工作流：

```
# 1. 创建 → 保存 → 验证
statuz init -n "Team Alpha" -v private
statuz save -o team-alpha.stz
statuz verify -p team-alpha.stz

# 2. 克隆 → 修改 → 合并
statuz clone -i team-alpha.stz -o fork.stz --name "Fork"
statuz merge -t team-alpha.stz -s fork.stz -o merged.stz --strategy skip

# 3. 密码保护
statuz set-password -p merged.stz --set "secret"
statuz clone -i merged.stz -o shared.stz --keep-password
statuz set-password -p shared.stz --clear

# 4. 导出调试
statuz export -p merged.stz -o merged.json
```

### 2.6 任务 4.5：README.md 撰写

内容结构：
- 项目简介（一句话：Statuz 是一个图引擎）
- 快速开始（`cargo run -- init` + `cargo run -- self-test`）
- CLI 命令速查表（11 个命令）
- 架构概述（Cluster → Field → GraphEngine）
- 构建方式（`cargo build` / `cargo test`）
- 贡献指南

---

## 三、Phase 6：集成与发布

### 3.1 GitHub CI 完善

- 确保 `cargo build` + `cargo test` + `cargo clippy` 在每次 push/PR 时自动运行
- 添加 `cargo fmt --check`

### 3.2 GitHub Release

- 创建 v0.1.0-alpha release
- 包含构建好的二进制文件（Windows、macOS、Linux）

### 3.3 官网部署

- 配置 GitHub Pages 从 `docs/` 目录发布
- 配置自定义域名（如有）