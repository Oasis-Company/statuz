# 存储格式规格

> 代码位置：`crates/statuz-core/src/storage/mod.rs`

---

## 一、文件格式（.stz）

### 1.1 二进制布局

```
┌─────────────────────────────────────────┐
│  Magic: "STZ\0" (4 bytes)              │
│  Version: 0x0001 (2 bytes)             │
│  Flags: 0x0000 (2 bytes)               │
│  Content: msgpack Cluster (variable)   │
│  Hash: blake3 (32 bytes)               │
└─────────────────────────────────────────┘
```

### 1.2 字段说明

| 字段 | 大小 | 类型 | 说明 |
|------|------|------|------|
| magic | 4 字节 | ASCII | 文件标识符 `STZ\0` |
| version | 2 字节 | u16 | 版本号，当前 0x0001 |
| flags | 2 字节 | 位掩码 | 0x0001=压缩，0x0002=加密 |
| content | 变长 | msgpack | Cluster 的 msgpack 序列化 |
| hash | 32 字节 | [u8; 32] | content 的 blake3 哈希 |

### 1.3 Flags 定义

```rust
pub const FLAG_NONE: u16 = 0x0000;
pub const FLAG_COMPRESSED: u16 = 0x0001;  // zstd 压缩
pub const FLAG_ENCRYPTED: u16 = 0x0002;   // chacha20 加密
// FLAG_COMPRESSED | FLAG_ENCRYPTED = 0x0003 (同时加密 + 压缩)
```

---

## 二、序列化协议

### 2.1 序列化流程

```
Cluster
  → msgpack::to_vec() → content bytes
  → blake3(content) → hash bytes
  → [magic][version][flags][content][hash]
  → 写入 .stz 文件
```

### 2.2 反序列化流程

```
.stz 文件
  → 读取前 8 字节（magic + version + flags）
  → 验证 magic == "STZ\0"
  → 验证 version >= MIN_SUPPORTED_VERSION
  → 读取 content（剩余字节 - 32）
  → 验证 blake3(content) == stored_hash
  → msgpack::from_slice(content) → Cluster
```

### 2.3 错误处理

```rust
pub enum StorageError {
    InvalidMagic,      // magic 不是 "STZ\0"
    UnsupportedVersion, // version 低于 MIN_SUPPORTED_VERSION
    IntegrityMismatch,  // hash 不匹配
    SerializationError,  // msgpack 序列化失败
    DeserializationError, // msgpack 反序列化失败
    IoError,            // 文件读写错误
    PasswordRequired,   // 需要密码才能解密
}
```

---

## 三、内容可寻址

### 3.1 ID 生成

```rust
// 节点 ID
let node_id = format!("node-{}", &blake3(name)[..16]);

// Cluster ID（内容可寻址）
let cluster_id = blake3(content);
```

### 3.2 不变性

- 相同内容的 Cluster 永远产生相同的 blake3 哈希
- 修改任何节点或边都会改变哈希
- 文件名不参与哈希计算

---

## 四、密码保护

### 4.1 密码设置

```rust
let salt = rand::random::<[u8; 16]>();
let hash = Argon2::default()
    .hash_password(password.as_bytes(), &salt)
    .unwrap();
cluster.password_hash = Some(hash.to_string());
cluster.password_salt = Some(salt);
```

### 4.2 密码验证

```rust
let hash = Argon2::default()
    .hash_password(password.as_bytes(), &cluster.password_salt.unwrap())
    .unwrap();
assert_eq!(hash.to_string(), cluster.password_hash.unwrap());
```

### 4.3 加密密钥派生（占位）

```rust
// 加密密钥 = argon2(password, salt, ...) 输出前 32 字节
// 用于 chacha20 加密 content
```

---

## 五、版本兼容性

```rust
pub const CURRENT_VERSION: u16 = 0x0001;
pub const MIN_SUPPORTED_VERSION: u16 = 0x0001;
```

- 当前版本：0x0001
- 最低支持版本：0x0001
- 未来版本升级时，如果版本不兼容，反序列化返回 `UnsupportedVersion` 错误