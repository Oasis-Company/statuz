# 硬规则

> 不可违反的规则。任何违反这些规则的变更必须被拒绝。

---

## 一、Identity Rules（身份规则）

> Statuz 是什么，不是什么

### 1.1 Statuz 不是传输协议

Statuz 定义图结构、查询和存储。Signal Bus 是伴侣基础设施，但不是 Statuz 协议的一部分。

**违反示例**：在 Cluster 中添加网络端点、传输配置、协议协商字段。

### 1.2 Statuz 不替代 MCP

Statuz 只能通过 MCP 被 LLM 工具调用，不能替代 MCP。

**违反示例**：在 Statuz 中实现 LLM 工具发现、调用、参数注入。

### 1.3 Statuz 不实现 A2A

A2A 字段是预留占位符，必须休眠到 A2A 1.0 发布且所有子系统 >80% 可用。

**违反示例**：在 Cluster 元数据中实现 A2A 兼容性逻辑。

---

## 二、范式规则

> 当前范式（Rust 图引擎）的约束

### 2.1 不添加 YAML 文件

旧范式已死。引擎使用 msgpack+blake3 存储格式。

**违反示例**：添加新的 `.yaml` 或 `.yml` 配置文件、schema 文件。

### 2.2 不复活 niche、SYN、Arrow Map 文件格式

这些概念如果仍然有价值，应该作为 Rust 方法实现，而不是作为文件格式复活。

**正确做法**：`cluster.impact("node_id")` 而不是 `niche.yaml`
**错误做法**：在 `crates/` 中创建新的 YAML 文件处理逻辑

### 2.3 Rust crate 实现允许，但不允许独立存储/CLI/Schema

niche、SYN、Arrow Map 可以作为 Rust crate 实现（依赖 statuz-core），但必须遵守以下约束：
- **不能创建独立存储格式**：所有数据存储在 `.stz` 文件中
- **不能创建独立 CLI 命令**：所有操作通过 statuz CLI 或引擎 API
- **不能创建独立 Schema/验证**：使用 statuz-core 的 type system
- **不能创建独立序列化**：使用 storage module 的 msgpack+blake3 格式

**正确做法**：`crates/niche/src/lib.rs` → 依赖 statuz-core → 调用 `cluster.subgraph()` / `cluster.diff()`
**错误做法**：创建新的 `.niche` 文件格式、新的 `niche` CLI 命令、新的 JSON Schema

### 2.4 不添加 CLI 命令在 Engine 稳固之前

当前 11 个 CLI 命令已经足够。在 Engine 通过所有单元测试、边界情况测试、性能测试之前，不添加新命令。

### 2.4 不添加数据库、服务器、网络调用

Statuz 是单机图引擎，所有操作在本地内存中完成。网络功能（MCP、Signal Bus）是伴侣基础设施，不在引擎核心中。

---

## 三、质量规则

> 代码质量约束

### 3.1 不修改 LICENSE

Apache-2.0 许可证。没有明确的人类批准，不得更改。

### 3.2 不修改 AGENTS.md 中的硬规则（本规则集）

硬的规则只能通过用户明确同意才能修改。

### 3.3 self-test 必须在每次变更后通过

```bash
cd crates/statuz-core
cargo run -- self-test
```

所有 11 Phase 必须全部通过，所有断言通过，无 panic。

### 3.4 代码语言必须是英文

变量名、函数名、注释、commit message 全部使用英文。不允许中英文混合代码。

---

## 四、存储规则

> 存储格式的约束

### 4.1 Cluster 是唯一的存储单元

没有 Arrow Map 文件、niche 文件、SYN 提案文件。所有数据存储在 `.stz` 文件中。

### 4.2 存储格式不可变

一旦发布版本，`[magic: 4 bytes]` 和 `[version: 2 bytes]` 不能更改。新版本必须通过增加 version 字段来兼容。

### 4.3 内容可寻址

blake3 哈希是所有内容验证的基础。相同内容必须永远产生相同哈希。

---

## 五、设计规则

> 架构设计约束

### 5.1 零非 serde 依赖

图算法必须使用 std 集合（HashMap、VecDeque 等），不引入第三方图库。

### 5.2 内存优先

所有图操作在内存中完成。序列化（save/load）是显式操作，不是自动的。

### 5.3 子系统可用性优先于协议兼容性

在实现 A2A 或其他协议兼容性之前，必须确保所有子系统（存储、查询、共享、CLI）可用性 >80%。

---

## 六、决策规则

> 决策约束

### 6.1 旧概念必须映射到新范式

如果 niche、SYN、Arrow Map 的概念有价值，必须作为 Rust 方法实现，不能作为文件格式复活。

**检查**：`can the engine compute it?` → 是 → 作为 Rust 方法
**检查**：`is it a UI concern?` → 是 → 推迟到 Dashboard 阶段
**检查**：`is it a YAML file pattern?` → 是 → 丢弃

### 6.2 AGENTS.md 是本文件的权威来源

如果 `knowledge-base/` 和 `AGENTS.md` 冲突，以 `AGENTS.md` 为准。