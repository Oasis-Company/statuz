# 引擎架构总览

> 代码位置：`crates/statuz-core/src/`

---

## 一、架构分层

```
CLI Layer (main.rs)
  ↓
Public API (lib.rs)
  ↓
┌─────────────────────────────────────┐
│  Cluster Layer                      │
│  ┌───────────────────────────────┐  │
│  │  Field (子图)                 │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │  GraphEngine (图引擎)   │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │  Graph (邻接表)   │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Bridge (跨域桥接)           │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Sharing (共享机制)          │  │
│  │  Clone | Merge | Password    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
  ↓
Storage Layer (storage/mod.rs)
  ├── Serialize (Cluster → msgpack)
  ├── Deserialize (msgpack → Cluster)
  ├── Integrity (blake3 hash)
  └── Encryption (argon2 + chacha20) [占位]
```

---

## 二、数据流

```
用户输入
  ↓
CLI 解析 (clap)
  ↓
Cluster 操作
  ├── 创建/修改节点 → GraphEngine.add_node/remove_node
  ├── 创建/修改边   → GraphEngine.add_edge/remove_edge
  ├── 查询          → GraphEngine.traverse/impact/path
  └── 跨域操作      → Cluster.add_bridge / Cluster.query_across_fields
  ↓
存储
  ├── Serialize → msgpack → [magic][version][flags][content][hash]
  ├── Save → 写入 .stz 文件
  └── Load → 读取 .stz 文件 → 验证 → Deserialize
```

---

## 三、模块依赖图

```
main.rs
  ├── lib.rs
  │   ├── graph::types       ← Node, Edge, Relation, 查询结果类型
  │   ├── graph::engine      ← GraphEngine（邻接表）
  │   ├── graph::query       ← traverse/impact/path/centrality/health
  │   ├── cluster::cluster   ← Cluster（容器 + 注册表 + 桥接）
  │   ├── cluster::field     ← Field（子图）
  │   ├── cluster::sharing   ← Clone/Merge/Password/Visibility
  │   └── storage::mod       ← Serialize/Deserialize/Verify
  └── （CLI 逻辑 + self-test）
```

---

## 四、类型系统

### 4.1 核心类型

```rust
pub struct Node {
    pub id: NodeId,                          // 唯一标识符
    pub type_: String,                       // 类型标签（如 "service", "person", "task"）
    pub label: String,                       // 人类可读名称
    pub status: NodeStatus,                  // Active, Dormant, Blocked, Done, Planned
    pub meta: Option<HashMap<String, String>>, // 扩展属性（不参与比较）
}

pub struct Edge {
    pub id: EdgeId,                          // 唯一标识符
    pub source: NodeId,                      // 源节点 ID
    pub target: NodeId,                      // 目标节点 ID
    pub relation: Relation,                  // 关系类型
    pub weight: f64,                         // 连接强度 (0.0 .. 1.0)
    pub description: String,                 // 关系描述
    pub target_field: Option<FieldId>,       // 桥接边的目标字段
    pub meta: Option<HashMap<String, String>>, // 扩展属性（不参与比较）
}

pub enum Relation {
    DependsOn,      // A 依赖 B
    Produces,       // A 生产 B
    Consumes,       // A 消费 B
    Validates,      // A 验证 B
    Informs,        // A 通知 B
    Contains,       // A 包含 B
    DelegatesTo,    // A 委托给 B
    Bridges,        // 跨 Field 桥接边
    Custom(String), // 自定义关系
}

pub enum NodeStatus {
    Active,     // 活跃
    Dormant,    // 休眠
    Blocked,    // 阻塞
    Done,       // 完成
    Planned,    // 计划中
}
```

### 4.2 查询结果类型

```rust
pub struct SubgraphResult {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

pub struct ImpactResult {
    pub changed: NodeId,
    pub affected: Vec<NodeId>,
    pub blast_radius: Vec<NodeId>,
    pub critical_path: bool,
}

pub struct PathResult {
    pub from: NodeId,
    pub to: NodeId,
    pub path: Vec<Edge>,
    pub field_path: Vec<FieldId>,
    pub length: i32,
    pub exists: bool,
}

pub struct HealthReport {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub orphans: Vec<NodeId>,
    pub sinks: Vec<NodeId>,
    pub sources: Vec<NodeId>,
    pub high_centrality: Vec<NodeId>,
    pub disconnected_components: usize,
}
```

### 4.3 新增类型（Phase 4）

```rust
pub struct DiffResult {
    pub added_nodes: Vec<Node>,
    pub removed_nodes: Vec<Node>,
    pub changed_nodes: Vec<(Node, Node)>,  // (old, new)
    pub added_edges: Vec<Edge>,
    pub removed_edges: Vec<Edge>,
    pub changed_edges: Vec<(Edge, Edge)>,  // (old, new)
    pub added_fields: Vec<FieldId>,
    pub removed_fields: Vec<FieldId>,
    pub added_bridges: Vec<Edge>,
    pub removed_bridges: Vec<Edge>,
}

pub struct ValidationResult {
    pub issues: Vec<ValidationIssue>,
    pub is_valid: bool,
}

pub struct ValidationIssue {
    pub severity: IssueSeverity,  // Error / Warning
    pub category: IssueCategory,  // OrphanEdge / ForeignNode / BrokenBridge / OrphanNode
    pub message: String,
    pub affected_ids: Vec<String>,
}
```

### 4.4 SYN 类型（core 中定义以避免循环依赖）

```rust
pub struct SynProposal {
    pub id: String,
    pub summary: String,
    pub description: String,
    pub options: Vec<SynOption>,
    pub diff: DiffResult,
    pub audit_trail: Vec<AuditEntry>,
    pub status: SynStatus,  // Draft / UnderReview / Approved / Rejected / Implemented
}
```

### 4.5 Cluster 架构

```
Cluster
├── id: ClusterId              ← blake3 内容寻址哈希
├── name: String
├── visibility: Visibility     ← Public / Private / Organization
├── password_hash: Option<String>  ← argon2
├── nodes: HashMap<NodeId, Node>   ← 中央节点注册表（所有 Field 共享）
├── fields: HashMap<FieldId, Field> ← 子图集合
│   ├── Field "System Architecture"
│   │   └── graph: GraphEngine  ← 邻接表
│   └── Field "Data Flow"
│       └── graph: GraphEngine  ← 邻接表
├── bridges: Option<HashMap<EdgeId, Edge>>  ← 桥接注册表
└── meta: Option<HashMap<String, String>>
```

### 4.6 存储格式布局

```
Offset  Size  Field
0       4     magic: "STZ\0"
4       2     version: u16 (0x0001 = plain, 0x0002 = compressed/encrypted)
6       2     flags: u16 (bit 0 = compressed, bit 1 = encrypted)
8       16    salt: [u8; 16] (argon2 salt, v0x0002+, zeros when not encrypted)
24      var    content: msgpack-encoded Cluster (opt. compressed + encrypted)
end     32    hash: [u8; 32] blake3(content)
```

---

## 五、关键数据结构

### 5.1 GraphEngine 邻接表

```rust
pub struct GraphEngine {
    nodes: HashMap<NodeId, Node>,
    edges: HashMap<EdgeId, Edge>,
    adj: HashMap<NodeId, AdjacencyCell>,
}

pub struct AdjacencyCell {
    pub node_id: NodeId,
    pub outgoing: HashMap<String, Vec<Edge>>,  // relation → edges
    pub incoming: HashMap<String, Vec<Edge>>,  // relation → edges
}
```

### 5.2 模块依赖图

```
main.rs
  ├── lib.rs
  │   ├── graph::types       ← Node, Edge, Relation, 查询结果类型
  │   ├── graph::engine      ← GraphEngine（邻接表 + remove_edge）
  │   ├── graph::query       ← traverse/impact/path/subgraph/validate/centrality/health
  │   ├── cluster::cluster   ← Cluster（容器 + 注册表 + 桥接 + diff/validate/subgraph）
  │   ├── cluster::field     ← Field（子图）
  │   ├── cluster::sharing   ← Clone/Merge/Password/Visibility
  │   └── storage::mod       ← Serialize/Deserialize/Verify/Compress/Encrypt
  └── （CLI 逻辑 + 11 阶段 self-test）
```