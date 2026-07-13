# 验证策略

> 如何确保代码正确性

---

## 一、Self-Test 体系（核心验证机制）

### 1.1 设计原则

- **集成测试优先**：self-test 验证端到端工作流，从创建 Cluster 到查询到存储
- **逐步扩展**：每个新功能对应一个新的 Phase
- **确定性**：所有测试使用固定种子，不依赖随机性
- **独立**：每个 Phase 可以独立运行，可以在任何顺序下执行

### 1.2 运行方式

```bash
cd crates/statuz-core
cargo run -- self-test
```

当前 10 Phase，~60 个断言。所有 Phase 通过后，所有断言通过，无 panic。

### 1.3 Phase 设计模式

```
Phase N: 功能名称
├── 1. 准备测试数据（创建节点、边、字段等）
├── 2. 执行操作
├── 3. 断言结果
└── 4. 清理（可选）
```

---

## 二、单元测试策略

### 2.1 适用场景

- 边界情况（空图、空字段、不存在节点）
- 错误路径（非法输入、格式错误）
- 契约测试（输入输出格式）

### 2.2 测试文件组织

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_graph_traverse() {
        let engine = GraphEngine::new();
        let result = engine.traverse("nonexistent", None);
        assert!(result.is_empty());
    }

    #[test]
    fn test_duplicate_edge() {
        // 重复添加边不应导致错误
    }
}
```

### 2.3 测试覆盖目标

| 模块 | 边界场景数 | 关键测试 |
|------|-----------|---------|
| `graph/engine.rs` | 5 | 空图 add_edge、删除不存在节点、重复边、自环、空图 remove_node |
| `graph/query.rs` | 3 | 空图查询、不存在节点、不连通路径 |
| `cluster/cluster.rs` | 3 | 空字段创建、重复桥接、删除字段后桥接残留 |
| `cluster/sharing.rs` | 4 | 克隆空 Cluster、合并空 Cluster、密码边界（空字符串、超长）、不可见性 |
| `storage/mod.rs` | 4 | 空内容反序列化、截断数据、版本不匹配、magic 错误 |

---

## 三、编译验证

### 3.1 本地验证

```bash
cd crates/statuz-core
cargo build      # 编译
cargo check      # 快速类型检查（不生成二进制）
cargo clippy     # lint 检查
cargo fmt --check # 格式检查
```

### 3.2 CI 验证

`.github/workflows/ci.yml` 在每次 push/PR 时自动运行：

```yaml
- name: Build
  run: cargo build

- name: Test
  run: cargo test

- name: Clippy
  run: cargo clippy -- -D warnings

- name: Format
  run: cargo fmt --check
```

### 3.3 已知问题

sandbox 环境中 `link.exe` 无法写入 `%TEMP%`，导致 `cargo check` / `cargo build` 失败。这是一个环境限制，不影响代码质量。

---

## 四、端到端验证

### 4.1 手动验证（E2E 脚本）

`scripts/e2e.ps1` 测试完整工作流：

```
1. 创建 → 保存 → 验证
2. 克隆 → 修改 → 合并
3. 密码保护 → 克隆 → 清除密码
4. 导出调试
```

### 4.2 官网验证

- 打开 `docs/index.html` 确认所有 section 渲染正常
- 切换深色/浅色模式，确认颜色一致
- 滚动触发动画（查询卡片揭示、CLI 打字机）
- 缩小窗口到 768px 和 480px 测试响应式
- 确认所有 SVG 内联且无外部依赖
- 确认无 JavaScript 控制台错误