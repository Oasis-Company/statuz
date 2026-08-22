# Statuz 算法全景规划（RTC 方法）

> 基于 [Read the Code] 方法，逐行阅读所有核心引擎代码后，系统整理现有算法 + 框架提案所需算法。

---

## 第一部分：现有算法清单

### 1.1 GraphEngine 层面（`crates/statuz-core/src/graph/`）

| # | 算法 | 文件 | 行号 | 复杂度 | 核心逻辑 |
|---|------|------|------|--------|----------|
| A1 | `traverse(from, relation?, cross_field?)` | `query.rs:9-40` | O(degree) | 直接邻接表查找，按 relation 过滤，可选跨域 |
| A2 | `impact(changed)` | `query.rs:44-100` | O(V+E) | 反向 BFS 找传递依赖，调用 `centrality(5)` 判断关键路径 |
| A3 | `path(from, to, cross_field?)` | `query.rs:105-188` | O(V+E) | BFS 最短路径，parent map 重建路径 |
| A4 | `centrality(limit)` | `query.rs:194-212` | O(V+E) | 度中心性（in+out 度总和），降序排序后截断 |
| A5 | `reachable(from)` | `query.rs:215-236` | O(V+E) | BFS 传递闭包，移除起始节点 |
| A6 | `health()` | `query.rs:240-305` | O(V+E) | 孤儿/汇/源节点检测 + 连通分量计数（BFS）+ 中心性 Top-5 |
| A7 | `subgraph(seeds, depth?, relation?)` | `query.rs:312-373` | O(V+E) | BFS 子图提取，深度限制 + relation 过滤，排除 bridge 边 |
| A8 | `validate()` | `query.rs:379-403` | O(E) | 孤儿边检测（source/target 不在 graph 中） |
| A9 | `add_node(node)` | `engine.rs:37-44` | O(1) | HashMap insert + 创建空 AdjacencyCell |
| A10 | `add_edge(edge)` | `engine.rs:48-73` | O(1) | 边注册 + 克隆到 source.outgoing + target.incoming |
| A11 | `remove_node(id)` | `engine.rs:75-89` | O(degree) | 删除所有关联边 → 删除节点 + 邻接单元 |
| A12 | `remove_edge(id)` | `engine.rs:94-116` | O(degree) | 从边注册表 + outgoing + incoming 中 retain 删除 |
| A13 | `outgoing_edges(node_id, relation?)` | `engine.rs:145-156` | O(1) | 邻接表查找，可选 relation 过滤 |
| A14 | `incoming_edges(node_id, relation?)` | `engine.rs:159-170` | O(1) | 邻接表查找，可选 relation 过滤 |
| A15 | `to_json() / from_json()` | `engine.rs:174-196` | O(N+E) | JSON 序列化/反序列化 |
| A16 | `all_nodes() / all_edges()` | `engine.rs:128-134` | O(N) | 收集所有节点/边引用 |

### 1.2 Cluster 层面（`crates/statuz-core/src/cluster/cluster.rs`）

| # | 算法 | 行号 | 复杂度 | 核心逻辑 |
|---|------|------|--------|----------|
| B1 | `register_node(node)` | `cluster.rs:75-81` | O(1) | 中心注册表插入 |
| B2 | `unregister_node(id)` | `cluster.rs:89-98` | O(F×degree) | 从中心注册表 + 所有字段的 graph 中删除 |
| B3 | `create_field(id, name, desc)` | `cluster.rs:103-111` | O(1) | 创建 Field + 注册到 fields HashMap |
| B4 | `remove_field(id)` | `cluster.rs:124-130` | O(1) | 从 fields HashMap 移除 |
| B5 | `add_bridge(from_field, to_field, src, tgt, desc, weight)` | `cluster.rs:141-211` | O(1) | 验证字段+节点存在 → 创建双向 bridge 边 → 写入双方 field + 中心注册表 |
| B6 | `traverse_across_fields(start_field, from_node, relation, max_depth)` | `cluster.rs:219-292` | O(V+E) | 递归 BFS 跨域遍历，按 bridge 边跳转，visited_fields + visited_nodes 去重 |
| B7 | `impact_across_fields(changed)` | `cluster.rs:304-352` | O(F×(V+E)) | 跨所有字段的反向 BFS，bridge 边跟随到其他 field |
| B8 | `path_across_fields(from, to, start_field)` | `cluster.rs:358-419` | O(V+E) | BFS 跨域最短路径，BFS state 包含 (node, field, path, field_path) |
| B9 | `diff(self, other)` | `cluster.rs:450-539` | O(N+E+F+B) | 全量比较：节点（按ID）、边（跨所有字段收集）、字段、桥 |
| B10 | `validate()` | `cluster.rs:563-671` | O(N+E+F+B) | 4 项检查：孤儿边(委托graph)、外来节点、断桥、孤儿节点(警告) |
| B11 | `subgraph(field_id, seeds, depth, relation)` | `cluster.rs:679-691` | O(V+E) | 委托给 GraphEngine.subgraph() |

### 1.3 Cluster Sharing 层面（`crates/statuz-core/src/cluster/sharing.rs`）

| # | 算法 | 行号 | 复杂度 | 核心逻辑 |
|---|------|------|--------|----------|
| B12 | `clone_with_options(options)` | `sharing.rs:95-123` | O(N+E+F+B) | 深拷贝 + 按选项处理密码/名称/时间戳 + 重新生成 ID |
| B13 | `clone_fresh(name?, password?)` | `sharing.rs:127-135` | O(N+E+F+B) | 便捷方法：重置密码和时间戳 |
| B14 | `merge_from(source, strategy)` | `sharing.rs:144-319` | O(N+E+F+B+W) | 按策略合并节点/字段/边/桥，含验证和警告 |
| B15 | `set_password(pwd) / change_password(old, new) / clear_password()` | `sharing.rs:326-358` | O(1) | 密码生命周期管理 |
| B16 | `unlock(pwd)` | `sharing.rs:355-357` | O(1) | 委托给 verify_password |

### 1.4 Storage 层面（`crates/statuz-core/src/storage/mod.rs`）

| # | 算法 | 行号 | 复杂度 | 核心逻辑 |
|---|------|------|--------|----------|
| C1 | `serialize_cluster(cluster)` | `mod.rs:146-148` | O(N+E) | 默认序列化（无压缩/加密） |
| C2 | `serialize_cluster_with_options(cluster, compress, password)` | `mod.rs:151-192` | O(N+E) | msgpack → zstd压缩 → chacha20加密 → blake3哈希 |
| C3 | `deserialize_cluster(data)` | `mod.rs:199-201` | O(N+E) | 默认反序列化 |
| C4 | `deserialize_cluster_with_password(data, password)` | `mod.rs:204-246` | O(N+E) | 解析头 → 验证哈希 → 解密 → 解压 → msgpack解码 |
| C5 | `parse_header(data)` | `mod.rs:251-281` | O(1) | 魔数+版本+标志位解析，确定 content_start 和最小尺寸 |
| C6 | `verify_stz_file(data)` | `mod.rs:292-311` | O(N) | 轻量级完整性验证（无反序列化） |
| C7 | `export_cluster_json(cluster)` | `mod.rs:316-319` | O(N+E) | 人类可读 JSON 导出 |
| C8 | `generate_cluster_id(cluster)` | `mod.rs:331-335` | O(N+E) | blake3 哈希前16字节 → hex 编码 |
| C9 | `verify_password(cluster, password)` | `mod.rs:339-352` | O(1) | argon2 密码验证 |
| C10 | `hash_password(password)` | `mod.rs:355-364` | O(1) | argon2 密码哈希 |
| C11 | `compress_content(data)` | `mod.rs:85-88` | O(N) | zstd level 3 压缩 |
| C12 | `decompress_content(data)` | `mod.rs:90-93` | O(N) | zstd 解压 |
| C13 | `derive_key(password, salt)` | `mod.rs:101-119` | O(1) | argon2id 密钥派生（32字节） |
| C14 | `encrypt_content(content, password, salt)` | `mod.rs:123-131` | O(N) | ChaCha20 流加密 |
| C15 | `decrypt_content(content, password, salt)` | `mod.rs:134-137` | O(N) | ChaCha20 解密（XOR 对称性） |

### 1.5 现有算法全景总结

| 类别 | 数量 | 核心模式 |
|------|------|----------|
| 图遍历/查询 | 7 (A1-A8, 不含A4/A5) | BFS为主，O(V+E)复杂度 |
| 图算法辅助 | 2 (A4 centrality, A5 reachable) | BFS + 度计算 |
| 图变异 | 4 (A9-A12) | HashMap O(1) 操作 |
| 图访问器 | 3 (A13-A15) | 邻接表查找 |
| 集群管理 | 5 (B1-B5) | 注册表+字段生命周期 |
| 跨域查询 | 3 (B6-B8) | 带 field 感知的 BFS |
| 集群分析 | 3 (B9-B11) | 全量比较+验证+委托 |
| 集群共享 | 4 (B12-B16) | 克隆+合并+密码 |
| 存储 | 15 (C1-C15) | 序列化/加密/压缩/验证 |

**统计**: 3 个模块，约 46 个算法/函数，核心引擎约 2500 行 Rust 代码。

---

## 第二部分：框架提案需要的算法

基于 `knowledge-base/07-agent-interaction/` 中的 7 份框架文档，分析每个组件需要的算法。

### 2.1 注入层协议（`01-injection-protocol.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| IP1 | 权重过滤的 subgraph（min_weight 参数） | **是** | A7 subgraph 没有 weight 过滤 |
| IP2 | InjectionConfig 解析（seeds/depth/min_weight/max_tokens等） | **是** | 全新类型 |
| IP3 | 上下文格式化输出（Markdown/JSON/Text） | **是** | 全新序列化 |
| IP4 | ACE 式 Delta 增量更新（比较两个 injection 差异） | **是** | 可复用 B9 diff |
| IP5 | 上下文剪枝（max_tokens 限制下剪枝低权重边） | **是** | 全新算法 |
| IP6 | 优先级排序（按 weight 排序注入内容） | **是** | 可复用 A4 centrality 排序 |

### 2.2 运行时查询协议（`02-runtime-query.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| RQ1 | 6 个 MCP 工具的序列化/反序列化 | **是** | 全新（MCP JSON-RPC 格式） |
| RQ2 | 查询结果错误处理（node_not_found 等） | 部分 | 现有返回空结果，需标准化错误码 |
| RQ3 | 查询结果限流（max_results 参数） | **是** | 全新 |
| RQ4 | 批量查询聚合 | **是** | 全新 |

### 2.3 回写同步协议（`03-sync-protocol.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| SP1 | SynProposal 生命周期管理（Draft→UnderReview→Approved→Implemented） | **是** | 现有 SynStatus/SynProposal 类型，无状态机 |
| SP2 | 提案审批工作流（approve/reject） | **是** | 全新 |
| SP3 | 提案自动合并执行 | **是** | 可复用 B14 merge_from |
| SP4 | 审计日志持续写入 | 部分 | 现有 AuditEntry 类型，无持久化 |
| SP5 | 提案冲突检测 | **是** | 全新 |

### 2.4 Multi-Agent 协调（`04-multi-agent.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| MA1 | DAG 任务调度（TaskGraph 拓扑排序） | **是** | 全新 |
| MA2 | Subagent 生命周期管理（pending→running→completed→failed） | **是** | 全新 |
| MA3 | 任务依赖解析（TaskGraph 的依赖边分析） | **是** | 可复用 A3 path |
| MA4 | 并行任务分组（同层独立任务并行） | **是** | 全新 |
| MA5 | 失败策略执行（Abort/Skip/Retry/Fallback） | **是** | 全新 |
| MA6 | 上下文隔离边界计算 | **是** | 全新 |

### 2.5 表征层集成（`05-representation-layer.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| RL1 | arrow-map 文本解析（自然语言→图结构） | **是** | 全新 crate |
| RL2 | niche 语义漂移检测（3 种漂移类型） | **是** | 全新 crate |
| RL3 | syn 提案审批工作流 | **是** | 全新 crate |
| RL4 | 表征层 pipeline 编排 | **是** | 全新 |

### 2.6 Dashboard 可视化集成（`06-dashboard-integration.md`）

| 需求 | 描述 | 需要新增？ | 现有映射 |
|------|------|-----------|----------|
| DV1 | 子图 SVG 渲染（力导向布局） | **是** | 全新 |
| DV2 | Diff 对比可视化（节点/边增删改颜色编码） | **是** | 可复用 B9 diff |
| DV3 | 影响半径可视化（冲击波扩散动画） | **是** | 可复用 A2 impact/B7 impact_across_fields |
| DV4 | 执行时间线可视化 | **是** | 全新 |

---

## 第三部分：算法依赖图

```
┌────────────────────────────────────────────────────────────────┐
│  现有引擎算法（基础层）                                          │
│  A1-A16 (GraphEngine) + B1-B16 (Cluster) + C1-C15 (Storage)  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  引擎扩展（Phase 1）                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IP1: weighted_subgraph ──→ 复用 A7 + 新增 weight 过滤    │  │
│  │ IP2: InjectionConfig   ──→ 全新类型 + 解析器              │  │
│  │ MA2: SubagentLifecycle ──→ 全新状态机                     │  │
│  │ MA3: TaskDependency     ──→ 复用 A3 path 做依赖分析       │  │
│  │ SP5: ConflictDetection  ──→ 复用 B9 diff 做冲突检测       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  注入层 + 查询协议（Phase 2-3）                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ IP3: FormatOutput    ──→ 复用 C7 JSON 导出 + 新增 Markdown│  │
│  │ IP4: DeltaUpdate     ──→ 复用 B9 diff + 增量编码          │  │
│  │ IP5: ContextPruning  ──→ 全新剪枝算法                     │  │
│  │ IP6: PrioritySort    ──→ 复用 A4 centrality 排序          │  │
│  │ RQ1: MCP Serialize   ──→ 全新 JSON-RPC 序列化             │  │
│  │ RQ3: QueryLimit      ──→ 全新限流                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  表征层 + Multi-Agent + Dashboard（Phase 4-6）                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ RL1-RL4:  全新 crate（arrow-map, niche, syn）              │  │
│  │ MA1, MA4-6: 全新协调器算法（DAG, 并行, 失败策略）          │  │
│  │ SP1-SP4:   全新提案工作流 + 复用 B14 merge                 │  │
│  │ DV1-DV4:   全新渲染器 + 复用 A2/B9                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 第四部分：新增算法详细设计

### 4.1 Phase 1 — 引擎扩展（7 天）

#### NEW-1: `weighted_subgraph`（权重过滤的子图提取）

```
所在文件: src/graph/query.rs
签名:   pub fn weighted_subgraph(&self, config: &InjectionConfig) -> SubgraphResult
输入:   InjectionConfig { seeds, depth, min_weight, max_tokens, priority_relations, ... }
输出:   SubgraphResult { nodes, edges }
算法:
  1. BFS 从 seed 节点开始，同 A7 subgraph
  2. 对每条边，检查 weight >= min_weight
  3. 如果指定了 priority_relations，只遍历这些 relation 的边
  4. 如果指定了 max_tokens，在 BFS 过程中维持 token 计数
  5. 达到 max_tokens 时按 weight 优先级剪枝
复杂度: O(V+E) 最坏情况，优先剪枝后 O(min(V, max_tokens/avg))
依赖:   A7 subgraph, A4 centrality（排序用）
测试:   空种子、min_weight=0.0 全量返回、min_weight=0.8 只返回高权重边、max_tokens 剪枝正确性
```

#### NEW-2: `InjectionConfig` 解析器

```
所在文件: src/graph/query.rs（或新文件 src/graph/injection.rs）
签名:   pub fn parse_injection_config(config: &str) -> Result<InjectionConfig, String>
        pub fn parse_injection_config_json(json: &serde_json::Value) -> Result<InjectionConfig, String>
输入:   CLI 参数或 JSON 格式的配置
输出:   InjectionConfig 结构体
算法:   CLI 参数解析（Clap derive）+ JSON 反序列化
复杂度: O(1)
依赖:   serde
测试:   所有字段默认值、非法 min_weight (<0 / >1)、空 seeds、负 depth
```

#### NEW-3: `SubAgentLifecycle` 状态机

```
所在文件: src/graph/agent.rs（新文件）
签名:   pub enum SubAgentStatus { Pending, Running, Completed, Failed, TimedOut }
        pub struct SubAgentLifecycle { id, status, started_at, completed_at, error, ... }
        pub fn transition(&mut self, new_status: SubAgentStatus) -> Result<(), String>
算法:   有限状态机，验证合法转换
        Pending → Running | Failed
        Running → Completed | Failed | TimedOut
        Completed/Failed/TimedOut → 终态（不可转换）
复杂度: O(1)
依赖:   无
测试:   合法转换链、非法转换（Running→Pending）、时间戳更新
```

#### NEW-4: `TaskDependency` 依赖分析

```
所在文件: src/graph/query.rs（或 agent.rs）
签名:   pub fn task_dependency(&self, from: &NodeId, to: &NodeId) -> DependencyResult
        pub struct DependencyResult { dependency_chain: Vec<Edge>, chain_length: usize, has_cycle: bool }
算法:   复用 A3 path + 新增环检测（visited 标记在路径中）
        BFS 过程中如果遇到当前路径中的节点，标记 has_cycle
复杂度: O(V+E)
依赖:   A3 path
测试:   直接依赖、传递依赖、循环依赖检测、无依赖（孤立节点）
```

#### NEW-5: `ConflictDetection` 冲突检测

```
所在文件: src/cluster/cluster.rs
签名:   pub fn detect_conflicts(&self, proposal: &SynProposal) -> Vec<Conflict>
        pub struct Conflict {
            conflict_type: ConflictType, // NodeConflict, EdgeConflict, FieldConflict
            existing_id: String,
            proposal_id: String,
            description: String,
            resolution: Option<Resolution>,
        }
        pub enum ConflictType { NodeConflict, EdgeConflict, FieldConflict, BridgeConflict, WeakConflict }
        pub enum Resolution { Overwrite, Skip, Merge, Rename }
算法:
  1. 遍历 proposal.diff 中的 added_nodes/added_edges/added_fields
  2. 对每个添加项，检查 self 中是否存在相同 ID
  3. 存在 → 硬冲突（ConflictType::NodeConflict 等）
  4. 对于 weight 差异小于 EPSILON 的边 → 软冲突（WeakConflict）
  5. 返回冲突列表
复杂度: O(N+E)
依赖:   B9 diff, WEIGHT_EPSILON
测试:   无冲突、节点ID冲突、边ID冲突、字段冲突、桥冲突、软冲突（weight 差异）
```

### 4.2 Phase 2 — 注入层（14 天）

#### NEW-6: `FormatOutput` 上下文格式化器

```
所在文件: src/graph/formatter.rs（新文件）
签名:   pub fn format_context(result: &SubgraphResult, format: &OutputFormat) -> String
        pub enum OutputFormat { Markdown, Json, Text }
算法:
  Markdown: 节点列表 + 边列表 + 关系的 Markdown 表格
  Json:     serde_json::to_string_pretty（复用 C7）
  Text:     缩进文本格式，层级深度表示
复杂度: O(N+E)
依赖:   A7 subgraph
测试:   空结果三种格式、Markdown 表格格式正确性、JSON 合法性
```

#### NEW-7: `DeltaUpdate` ACE 式增量更新

```
所在文件: src/graph/delta.rs（新文件）
签名:   pub struct DeltaUpdate { added_nodes, removed_nodes, changed_nodes, added_edges, removed_edges, changed_edges, timestamp }
        pub fn compute_delta(old: &InjectionContext, new: &InjectionContext) -> DeltaUpdate
算法:
  1. 复用 B9 diff 的逻辑，但作用于 InjectionContext 而非 Cluster
  2. 增量 = new - old 的差异集
  3. 返回仅包含变化部分的 DeltaUpdate
复杂度: O(N+E)
依赖:   B9 diff（核心逻辑复用）
测试:   无变化 → 空 delta、节点新增、节点删除、节点修改、边增删改
```

#### NEW-8: `ContextPruning` 上下文剪枝

```
所在文件: src/graph/pruner.rs（新文件）
签名:   pub fn prune_context(
            context: &SubgraphResult,
            max_tokens: usize,
            avg_tokens_per_node: usize,
            avg_tokens_per_edge: usize,
        ) -> SubgraphResult
算法:
  1. 估算 token 消耗：node_count * avg_tokens_per_node + edge_count * avg_tokens_per_edge
  2. 如果超出 max_tokens：
     a. 按 weight 升序排列边
     b. 从最低 weight 的边开始移除
     c. 移除孤立节点（所有边被移除的节点）
     d. 重复直到 token 估算 <= max_tokens
  3. 保留 seed 节点（即使被孤立）
复杂度: O(E log E)（排序）
依赖:   A4 centrality（排序可用）
测试:   不超限 → 不剪枝、超限 → 低权重边被移除、seed 节点保留
```

### 4.3 Phase 3 — MCP 桥接（21 天）

#### NEW-9: `MCPQuerySerializer` 查询序列化

```
所在文件: src/mcp/mod.rs（新文件，新 crate 或模块）
签名:   pub fn serialize_query_result(query: &str, result: &QueryResult) -> serde_json::Value
        pub fn deserialize_query_request(json: &serde_json::Value) -> QueryRequest
        pub enum QueryResult {
            Traverse { nodes: Vec<NodeId>, edges: Vec<Edge> },
            Impact(ImpactResult),
            Path(PathResult),
            Subgraph(SubgraphResult),
            Validate(ValidationResult),
            Diff(DiffResult),
        }
        pub struct QueryRequest {
            query: String,        // "traverse" | "impact" | "path" | "subgraph" | "validate" | "diff"
            params: HashMap<String, serde_json::Value>,
        }
算法:
  序列化: 匹配 query 类型 → 对应的 JSON-RPC Response 格式
  反序列化: 解析 JSON-RPC Request → QueryRequest 枚举
  错误格式: 标准 JSON-RPC Error 对象（code, message, data）
复杂度: O(N+E)
依赖:   serde_json
测试:   6种查询的序列化/反序列化、非法请求、空结果
```

#### NEW-10: `QueryRateLimiter` 查询限流

```
所在文件: src/mcp/limiter.rs（新文件）
签名:   pub struct QueryRateLimiter {
            max_results_per_query: usize,
            default_max_results: usize,
        }
        pub fn limit_query_result(&self, result: &mut QueryResult)
算法:
  1. 对 SubgraphResult: 截断 edges 到 max_results，保留关联节点
  2. 对 ImpactResult: 截断 affected 列表
  3. 对 PathResult: 截断 path 列表
  4. 其他结果类型直接返回
复杂度: O(1)（截断操作）
依赖:   无
测试:   不超限不截断、超限截断正确性、截断后数据一致性
```

### 4.4 Phase 4 — 表征层（35 天）

#### NEW-11: `ArrowMapParser` 文本解析器

```
所在文件: arrow-map/src/parser.rs（箭头图 crate）
签名:   pub fn parse_arrow_map(text: &str) -> Result<ArrowMap, String>
        pub struct ArrowMap { map_id: String, nodes: Vec<ArrowMapNode>, arrows: Vec<ArrowMapArrow> }
        pub struct ArrowMapNode { id: String, label: String, type_: String, properties: HashMap<String, String> }
        pub struct ArrowMapArrow { source: String, target: String, relation: String, weight: f64, description: String }
算法:
  1. 按行解析文本
  2. 识别节点定义行（"node: id, label, type" 格式）
  3. 识别箭头定义行（"arrow: source -> target [relation, weight, desc]" 格式）
  4. 构建 ArrowMap 结构
复杂度: O(N)（N = 行数）
依赖:   statuz-core 类型系统
测试:   标准箭头图、空图、非法行处理、重复节点
```

#### NEW-12: `DriftDetection` 语义漂移检测

```
所在文件: niche/src/drift.rs（niche crate）
签名:   pub fn detect_drift(
            old_context: &InjectionContext,
            new_context: &InjectionContext,
            config: &DriftConfig,
        ) -> DriftReport
        pub struct DriftConfig { min_confidence: f64, sensitivity: String }
        pub struct DriftReport {
            drift_type: DriftType, // Improvement, Degradation, Neutral, BoundaryViolation
            confidence: f64,
            interpretation: String,
            suggestions: Vec<String>,
        }
算法:
  1. 计算 DeltaUpdate（复用 NEW-7）
  2. 分析变化模式：
     - 新增高权重边 → Improvement
     - 移除高权重边 → Degradation
     - 新增低权重边 → Neutral
     - 添加未注册的外部节点引用 → BoundaryViolation
  3. confidence = 变化量 / 总边数
  4. 生成自然语言解释
复杂度: O(N+E)
依赖:   NEW-7 DeltaUpdate
测试:   改进型漂移、退化型漂移、中性漂移、边界违规
```

### 4.5 Phase 5 — Multi-Agent 协调器（45 天）

#### NEW-13: `TaskGraph` DAG 调度器

```
所在文件: coordinator/src/task_graph.rs（新 crate）
签名:   pub struct TaskGraph {
            tasks: HashMap<String, TaskNode>,
            dependencies: Vec<(String, String)>, // (depends_on, task)
        }
        pub struct TaskNode { id: String, description: String, agent_type: String, estimated_cost: usize, status: TaskStatus }
        pub enum TaskStatus { Pending, Ready, Running, Completed, Failed, Blocked }
        pub fn topological_sort(&self) -> Result<Vec<Vec<String>>, CycleError>
        pub fn get_ready_tasks(&self) -> Vec<String>
算法:
  1. Kahn 算法拓扑排序
  2. 统计每个节点的入度
  3. 入度为 0 的节点加入第一层（并行执行层）
  4. 移除该层节点及其出边，重复直到所有节点被分配
  5. 环检测：如果剩余节点都有入度 > 0，报告 CycleError
复杂度: O(V+E)
依赖:   无（纯 std 算法）
测试:   空图、线性依赖链、并行分支、Diamond 依赖、循环依赖报错
```

#### NEW-14: `SubAgentExecutor` 子代理执行器

```
所在文件: coordinator/src/executor.rs（新文件）
签名:   pub struct SubAgentExecutor {
            task_graph: TaskGraph,
            failure_policy: FailurePolicy,
            results: HashMap<String, SubAgentResult>,
        }
        pub struct SubAgentResult {
            task_id: String,
            status: SubAgentStatus,
            output: Option<String>,
            artifact_paths: Vec<String>,
            tool_calls_count: usize,
            error: Option<String>,
            started_at: u64,
            completed_at: Option<u64>,
        }
        pub fn execute_ready_tasks(&mut self) -> Vec<SubAgentResult>
        pub fn handle_failure(&mut self, task_id: &str, error: &str)
算法:
  1. 调用 get_ready_tasks() 获取当前可执行任务
  2. 对每个任务，创建 SubAgentLifecycle（NEW-3）
  3. 执行任务（通过 MCP 或 CLI 通道）
  4. 收集结果到 SubAgentResult
  5. 失败处理：根据 FailurePolicy 执行
     - Abort: 标记所有下游任务为 Failed
     - Skip: 跳过该任务，继续执行其他任务
     - Retry(n): 重试最多 n 次
     - Fallback: 执行备选任务
  6. 更新 TaskGraph 状态
复杂度: O(V+E) 调度 + O(T) 执行（T = 任务数）
依赖:   NEW-13 TaskGraph, NEW-3 SubAgentLifecycle
测试:   全部成功、一个任务失败(Abort)、一个任务失败(Skip)、重试成功、重试超过次数
```

### 4.6 Phase 6 — Dashboard 可视化渲染（50 天）

#### NEW-15: `SubgraphRenderer` 子图 SVG 渲染

```
所在文件: dashboard/src/renderer.rs（新文件）
签名:   pub fn render_subgraph_svg(result: &SubgraphResult, options: &RenderOptions) -> String
        pub struct RenderOptions { width: u32, height: u32, directed: bool, show_labels: bool, color_by_type: bool }
算法:
  1. 力导向布局（Fruchterman-Reingold 简化版）：
     - 随机初始化节点位置
     - 迭代：排斥力（所有节点对）+ 吸引力（有边连接的节点对）
     - 固定迭代次数（如 100 次）
  2. SVG 生成：
     - 边：带箭头的线条，颜色按 relation 类型
     - 节点：带标签的圆形/矩形，颜色按 type_ 或 status
     - 高权重边用粗线表示
复杂度: O(I × V²) 布局（I=迭代次数，V=节点数）
依赖:   A7 subgraph
测试:   空子图、单节点、链式图、带权重的图、多种 relation 类型
```

#### NEW-16: `DiffRenderer` 变更对比可视化

```
所在文件: dashboard/src/diff_renderer.rs（新文件）
签名:   pub fn render_diff_svg(diff: &DiffResult, options: &DiffRenderOptions) -> String
        pub struct DiffRenderOptions { side_by_side: bool, show_unchanged: bool, color_scheme: ColorScheme }
算法:
  1. 布局：左侧 = old，右侧 = new（side-by-side）或合并视图
  2. 颜色编码：
     - 绿色 = 新增
     - 红色 = 删除
     - 黄色 = 修改
     - 灰色 = 未变更
  3. 节点间用虚线连接表示对应关系
复杂度: O(N+E)
依赖:   B9 diff
测试:   无变更 → 全灰、新增节点、删除节点、修改节点、边增删改
```

#### NEW-17: `ImpactRenderer` 影响半径可视化

```
所在文件: dashboard/src/impact_renderer.rs（新文件）
签名:   pub fn render_impact_svg(impact: &ImpactResult, graph: &GraphEngine, options: &ImpactRenderOptions) -> String
        pub struct ImpactRenderOptions { show_blast_radius: bool, animate: bool, max_nodes: usize }
算法:
  1. 力导向布局影响子图
  2. 层级渲染：changed 节点在中心，直接依赖在内圈，传递依赖在外圈
  3. 冲击波扩散效果（同心圆环）
  4. 颜色：红色 = changed，橙色 = 直接依赖，黄色 = 传递依赖
复杂度: O(I × V²) 布局
依赖:   A2 impact, NEW-15 SubgraphRenderer
测试:   无影响节点、单层影响、多层影响、跨域影响
```

#### NEW-18: `TimelineRenderer` 执行时间线可视化

```
所在文件: dashboard/src/timeline_renderer.rs（新文件）
签名:   pub fn render_timeline_svg(executions: &[SubAgentResult], options: &TimelineRenderOptions) -> String
        pub struct TimelineRenderOptions { show_tool_calls: bool, group_by: GroupBy }
算法:
  1. 按时间排序执行记录
  2. 甘特图风格：横向条形表示每个任务的执行时间
  3. 依赖关系用箭头连接
  4. 失败任务用红色标记
复杂度: O(T log T)（排序）
依赖:   NEW-14 SubAgentExecutor
测试:   空时间线、串行执行、并行执行、有失败任务
```

---

## 第五部分：算法统计与优先级

### 5.1 按 Phase 分布

| Phase | 新增算法数 | 复用现有算法数 | 核心 crates |
|-------|-----------|---------------|-------------|
| Phase 1：引擎扩展 | 5 | 4 | `statuz-core` |
| Phase 2：注入层 | 3 | 2 | `statuz-core` |
| Phase 3：MCP 桥接 | 2 | 0 | `statuz-core-mcp`（新） |
| Phase 4：表征层 | 2 | 1 | `arrow-map`, `niche`（新） |
| Phase 5：Multi-Agent | 2 | 2 | `coordinator`（新） |
| Phase 6：Dashboard | 4 | 2 | `dashboard`（新） |
| **总计** | **18** | **11** | **6 个 crates** |

### 5.2 算法复杂度评价

| 复杂度 | 数量 | 算法列表 |
|--------|------|----------|
| O(1) | 2 | NEW-3 状态机，NEW-10 限流 |
| O(N) | 3 | NEW-6 格式化，NEW-11 解析，NEW-14 执行 |
| O(N+E) | 6 | NEW-1, NEW-5, NEW-7, NEW-8, NEW-12, NEW-16 |
| O(V+E) | 4 | NEW-4, NEW-13, NEW-14（调度部分） |
| O(I×V²) | 2 | NEW-15, NEW-17（力导向布局） |
| O(T log T) | 1 | NEW-18 |

### 5.3 核心依赖链

```
NEW-1  ←  A7 (subgraph) + A4 (centrality)
NEW-4  ←  A3 (path)
NEW-5  ←  B9 (diff)
NEW-7  ←  B9 (diff)  [核心逻辑复用]
NEW-8  ←  NEW-1 (weighted_subgraph)
NEW-12 ←  NEW-7 (DeltaUpdate)
NEW-13 →  NEW-14 (TaskGraph → Executor)
NEW-15 ←  NEW-1 (weighted_subgraph)
NEW-16 ←  B9 (diff)
NEW-17 ←  A2 (impact) + NEW-15 (SubgraphRenderer)
NEW-18 ←  NEW-14 (SubAgentResult)
```

---

## 第六部分：实现策略建议

### 6.1 复用策略

| 现有算法 | 复用方式 | 目标算法 |
|----------|----------|----------|
| `A7 subgraph` | 扩展 weight 参数 | NEW-1 |
| `B9 diff` | 核心逻辑提取为独立函数 | NEW-5, NEW-7 |
| `A3 path` | 加环检测 | NEW-4 |
| `A4 centrality` | 排序函数 | NEW-1, NEW-8 |
| `C7 JSON export` | 格式包装 | NEW-6 |
| `B14 merge_from` | 提案合并执行 | SP3 |

### 6.2 增量开发原则

1. **先在 `statuz-core` 内扩展** — 新增算法作为现有模块的方法，保持 crate 内聚
2. **新 crate 只在需要新依赖时创建** — MCP、coordinator、dashboard 各自独立
3. **每个新增算法必须包含 `#[cfg(test)]` 测试** — 覆盖正常路径 + 边界 + 错误
4. **自测试不断更新** — `cargo run -- self-test` 增加更多 Phase
5. **不引入第三方依赖** — 所有新增算法使用 std 集合 + serde（已有依赖）

### 6.3 算法优先级排序

```
高优先级（Phase 1-2，引擎核心）：
  NEW-1 > NEW-2 > NEW-5 > NEW-4 > NEW-3
  → 注入层是框架的入口，必须先完成

中优先级（Phase 3-4，查询协议 + 表征层）：
  NEW-9 > NEW-6 > NEW-7 > NEW-8 > NEW-10 > NEW-11 > NEW-12
  → MCP 桥接决定了 agent 如何访问引擎

低优先级（Phase 5-6，协调器 + 可视化）：
  NEW-13 > NEW-14 > NEW-15 > NEW-16 > NEW-17 > NEW-18
  → 这些依赖前面所有算法，可以并行开发
```

---

## 附录：现有算法完整索引

```
statuz-core/
├── src/graph/
│   ├── types.rs        — 所有类型定义（Node, Edge, Relation, 查询结果, SYN 类型）
│   ├── engine.rs       — A9-A16: 数据结构和变异操作
│   └── query.rs        — A1-A8: 图查询和算法
├── src/cluster/
│   ├── field.rs        — Field 结构体（包含 GraphEngine）
│   ├── cluster.rs      — B1-B11: 集群管理 + 跨域查询 + diff + validate
│   └── sharing.rs      — B12-B16: 克隆 + 合并 + 密码管理
└── src/storage/
    └── mod.rs          — C1-C15: 序列化 + 压缩 + 加密 + 验证
```