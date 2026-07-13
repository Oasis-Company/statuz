# Rust 图引擎成果

> 构建时间：2026-07-11 至 2026-07-12（Day 1-3）
> 代码位置：`crates/statuz-core/src/`

---

## 一、引擎核心（~2500 行 Rust 代码）

### 1.1 GraphEngine — 内存邻接表

`crates/statuz-core/src/graph/engine.rs`（~180 行）

- 基于 `HashMap<NodeId, HashMap<NodeId, Vec<Edge>>>` 的邻接表实现
- 支持节点增删（`add_node` / `remove_node`）
- 支持有向边增删（`add_edge` / `remove_edge`）
- 支持边类型标注（Relation 枚举）
- 图遍历：`neighbors`、`reverse_neighbors`、`all_nodes`、`all_edges`

### 1.2 三项查询

`crates/statuz-core/src/graph/query.rs`（~200 行）

| 查询 | 方法 | 算法 | 回答 |
|------|------|------|------|
| traverse | `traverse(from, relation?)` | 直接邻接查找 | "这个节点连着什么？" |
| impact | `impact(node_id)` | 反向 BFS（爆炸半径） | "这个东西变了，谁受影响？" |
| path | `path(from, to)` | BFS 最短路径 | "我该怎么过去？" |

额外能力：`centrality`（度中心性）、`health`（孤立节点/汇/源/连通分量分析）

### 1.3 Cluster 容器

`crates/statuz-core/src/cluster/cluster.rs`（~420 行）

- 集中节点注册表：所有节点在 Cluster 级别注册，Field 只存边
- 多 Field 子图：每个 Field 是一个独立 GraphEngine 实例
- 双向 Bridge 桥接：`add_bridge` 在源域和目标域都存储桥接边
- 跨域查询：traverse/impact/path 自动跨越 Bridge 边
- 路径字段元数据追踪：`PathResult.field_path` 记录路径经过的字段

### 1.4 Field 子图

`crates/statuz-core/src/cluster/field.rs`（~60 行）

- 每个 Field 包含：名称、描述、GraphEngine 实例
- 提供视角隔离（不同团队看到不同视图）
- 节点共享：节点在 Cluster 级别注册，Field 只管理边关系

### 1.5 共享机制

`crates/statuz-core/src/cluster/sharing.rs`（~370 行）

- 克隆：`CloneOptions`（keep_ids / keep_password / keep_visibility / new_name）
- 四种合并策略：
  - **Skip**：跳过冲突节点
  - **Overwrite**：目标覆盖源
  - **Rename**：冲突节点自动重命名
  - **MergeMeta**：合并元数据，保留两者
- 密码管理：`set_password` / `change_password` / `clear_password` / `unlock`
- 可见性管理：`Public` / `Private` / `Organization`

### 1.6 存储格式

`crates/statuz-core/src/storage/mod.rs`（~230 行）

二进制布局：
```
[magic: 4 bytes]   "STZ\0"
[version: 2 bytes] 0x0001 (MIN_SUPPORTED: 0x0001)
[flags: 2 bytes]   encryption/compression (占位，未实现)
[content: var]     msgpack-encoded Cluster
[hash: 32 bytes]   blake3 integrity hash
```

- 结构化错误处理：`StorageError` 枚举（7 种错误类型）
- 版本兼容性检查：`MIN_SUPPORTED_VERSION`
- 密码验证：argon2 密钥派生

---

## 二、CLI 命令（11 个）

| 命令 | 功能 | 关键参数 |
|------|------|---------|
| `init` | 创建新 Cluster | `-n name`, `-v visibility` |
| `show` | 显示 Cluster 信息 | 无 |
| `save` | 保存到 .stz 文件 | `-o output` |
| `load` | 从 .stz 文件加载 | `-p path` |
| `verify` | 验证文件完整性 | `-p path`, `--password` |
| `export` | 导出为 JSON | `-p path`, `-o output` |
| `clone` | 克隆 Cluster | `-i input`, `-o output`, `--name` |
| `merge` | 合并两个 Cluster | `-t target`, `-s source`, `-o output`, `--strategy` |
| `set-password` | 密码管理 | `-p path`, `--set`, `--clear`, `--change` |
| `set-visibility` | 可见性管理 | `-p path`, `--visibility` |
| `self-test` | 10 Phase 自测 | 无 |

---

## 三、自测套件（10 Phase）

| Phase | 测试内容 | 断言数 |
|-------|---------|-------|
| Phase 1 | Build Cluster（节点+字段+桥接） | ~6 |
| Phase 2 | Traverse 查询 | ~4 |
| Phase 3 | Impact 查询 | ~4 |
| Phase 4 | Path 查询 | ~4 |
| Phase 5 | Centrality & Health | ~6 |
| Phase 6 | 存储格式（序列化/反序列化/验证） | ~8 |
| Phase 7 | 双向桥接 + 跨域 Impact + 路径字段追踪 | ~8 |
| Phase 8 | 克隆（完整/轻量/选项） | ~6 |
| Phase 9 | 合并（4种策略） | ~8 |
| Phase 10 | 密码管理 + 可见性管理 | ~6 |

---

## 四、依赖策略

```
[dependencies]
serde, serde_json        ← 序列化
rmp-serde                ← MessagePack
blake3                   ← 内容哈希
argon2                   ← 密码派生
uuid                     ← 节点 ID 生成
clap                     ← CLI 参数解析
hex, rand                ← 辅助
```

**零非 serde 依赖**：图算法全部使用 std 集合（HashMap、VecDeque 等）

---

## 五、验证方式

```bash
cd crates/statuz-core
cargo run -- self-test
```

所有 10 Phase 通过后，所有断言通过，无 panic。