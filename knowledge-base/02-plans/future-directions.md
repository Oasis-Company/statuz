# 未来方向

> 战略级思考，不是任务列表。这些是"可能的方向"，不是"必须做的事"。

---

## 一、短期（Phase 4 完成后）

### 1.1 跨 Cluster 引用

当前问题：Cluster A 的节点如何引用 Cluster B 的节点？

可能方案：
- 引用 ID + 文件路径：`cluster://path/to/file.stz#node_id`
- 惰性加载：只存储引用路径，不加载目标 Cluster
- 共享节点注册表：多个 Cluster 维护一个公共节点注册文件

### 1.2 版本管理

当前问题：多人同时修改同一 Cluster 的不同副本，如何合并？

可能方案：
- 版本号嵌入 Cluster 元数据
- 三路合并（当前 Merge 是"两路"：源 vs 目标，缺少共同祖先）
- 冲突标记 + 手动解决（类似 Git 的 merge conflict）

### 1.3 可视化

当前问题：有图引擎，但没有图渲染。

可能方案：
- Web 版：Canvas/SVG 渲染引擎，嵌入官网
- TUI 版：终端中的 ASCII 图渲染
- 导出为 Graphviz DOT 格式

---

## 二、中期（Phase 6 完成后）

### 2.1 MCP 集成

Statuz 通过 MCP 被 LLM 工具调用。当前 MCP 是 TypeScript 版本，需要：

- 用 Rust 重写 MCP Server（或继续使用 TypeScript 版本作为桥接）
- 暴露三个核心查询作为 MCP 工具：`statuz_traverse`、`statuz_impact`、`statuz_path`
- 暴露存储操作：`statuz_init`、`statuz_save`、`statuz_load`

### 2.2 惰性克隆

当前问题：大 Cluster 的克隆是全量深拷贝，O(n) 内存。

可能方案：
- 写时复制（Copy-on-Write）：只克隆元数据，节点数据共享直到被修改
- 引用计数：共享未修改的节点

### 2.3 索引优化

当前问题：长路径查询需要索引优化。

可能方案：
- 节点标签索引：按标签快速查找节点
- 关系类型索引：按关系类型快速过滤边
- 全文本搜索：节点名称/描述的模糊搜索

---

## 三、长期（战略方向）

### 3.1 图计算引擎

从"存储 + 查询"升级为"图计算平台"：

- 图算法库：PageRank、社区发现、Betweenness Centrality
- 自定义查询 DSL：在图引擎上运行任意查询
- 增量计算：只计算变化的部分，不重新计算全图

### 3.2 协作平台

从"离线文件共享"升级为"协同编辑平台"：

- 实时同步：WebSocket 或 CRDT 实现多用户实时协作
- 变更日志：记录所有变更，可回放、可审计
- 权限管理：细粒度权限（读/写/管理）

### 3.3 生态系统

- MCP 工具生态：围绕 Statuz 构建 MCP 工具插件
- 可视化仪表盘：Web 版图浏览器
- CI/CD 集成：在 CI 流程中自动分析拓扑变更