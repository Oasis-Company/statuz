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
    pub id: String,          // 唯一标识符
    pub name: String,        // 人类可读名称
    pub node_type: String,   // 类型标签（如 "service", "person"）
    pub properties: HashMap<String, String>,  // 扩展属性
}

pub struct Edge {
    pub id: String,          // 唯一标识符
    pub from: String,        // 源节点 ID
    pub to: String,          // 目标节点 ID
    pub relation: Relation,  // 关系类型
    pub properties: HashMap<String, String>,  // 扩展属性
}

pub enum Relation {
    DependsOn,      // A 依赖 B
    CommunicatesWith,  // A 与 B 通信
    Contains,       // A 包含 B
    Custom(String), // 自定义关系
}

pub struct Field {
    pub name: String,        // 字段名称
    pub description: String, // 字段描述
    pub engine: GraphEngine, // 子图引擎
}

pub struct Cluster {
    pub name: String,
    pub description: String,
    pub nodes: HashMap<String, Node>,    // 全局节点注册表
    pub fields: HashMap<String, Field>,  // 字段集合
    pub bridges: Vec<Bridge>,            // 跨域桥接
    pub password_hash: Option<String>,   // argon2 密码哈希
    pub visibility: Visibility,
    pub created_at: u64,
    pub updated_at: u64,
}
```

### 4.2 查询结果类型

```rust
pub struct TraverseResult {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

pub struct ImpactResult {
    pub affected: Vec<Node>,
    pub blast_radius: usize,    // 受影响的节点数
    pub propagation_paths: Vec<Vec<Edge>>,  // 传播路径
}

pub struct PathResult {
    pub exists: bool,
    pub path: Vec<Node>,         // 路径节点序列
    pub length: usize,           // 路径长度（边数）
    pub field_path: Vec<String>, // 经过的字段序列
}
```

---

## 五、关键数据结构

### 5.1 GraphEngine 邻接表

```rust
pub struct GraphEngine {
    adjacency: HashMap<NodeId, HashMap<NodeId, Vec<Edge>>>,
    // 外键: 节点ID → 邻接表 → 目标节点ID → 边列表
}
```

### 5.2 存储格式布局

```
Offset  Size  Field
0       4     magic: "STZ\0"
4       2     version: u16 (0x0001)
6       2     flags: u16 (0x0000 = plain, 0x0001 = compressed, 0x0002 = encrypted)
8       var   content: msgpack-encoded Cluster
end     32    hash: [u8; 32] blake3(content)
```

### 5.3 Bridge 结构

```rust
pub struct Bridge {
    pub id: String,
    pub from_field: String,
    pub to_field: String,
    pub from_node: String,
    pub to_node: String,
}
```