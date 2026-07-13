# 旧 TypeScript 系统成果

> 构建时间：2026 年 6 月
> 代码位置：`packages/`（已冻结，待 Rust 版本取代）
> 当前状态：归档参考，不再主动开发

---

## 一、地位说明

旧 TypeScript 系统基于"协议"范式构建，使用 YAML 文件 + JSON Schema 作为核心存储格式。2026-07-11 范式转换后，整个系统被标记为"冻结"——代码保留、测试保留、**不再主动开发**。

所有旧文档已归档至 `leftover/`。

---

## 二、已完成的组件

### 2.1 Core 0.1（~90% 完成）

- `Statuz` 类：`read` / `write` / `validate` / `create` / `checkpoint` 等方法
- CLI：`statuz init` / `statuz validate` / `statuz resume`
- 8 个 MCP 工具：`statuz_init` / `statuz_read` / `statuz_validate` / `statuz_checkpoint` 等
- 73 个测试通过

### 2.2 Signal Bus（~60% 完成）

- HTTP 服务器（8 个端点）
- Agent 注册表 + 发现引擎（4 条规则）
- 频道管理 + Backflow 引擎
- 23 个测试

### 2.3 Arrow Map / 66 层（~40% 完成）

- JSON Schema（arrow-map.schema.json、arrow.schema.json、statu-node.schema.json）
- CLI：`statuz arrow init` / `validate` / `detect` / `infer`
- 5 个示例 YAML 文件
- SDK 类型定义

### 2.4 Lease Manager（完成）

- 生命周期管理：`pending → accepted → active → completed`
- IO 类模式：`create` / `read` / `write` / `validate` / `accept` / `report` / `complete` / `revoke` / `list` / `show`
- CLI 命令
- 77 个测试

### 2.5 Calibration Engine（完成）

- 三种漂移检测：`task_drift` / `collaboration_drift` / `boundary_drift`
- CLI 命令

### 2.6 User Action Tracker（完成）

- 用户行为追踪
- CLI 命令

### 2.7 Schema 体系（完成）

- 7 个 niche JSON Schema
- SYN 提案/决议 Schema
- Arrow Map/Arrow/StatuNode Schema
- Cluster Schema
- Status Keeper Schema

---

## 三、从旧系统学习到的教训

1. **"type_properties" 字段**：在 Arrow Map 示例中导致 schema 校验失败，不应包含
2. **TypeScript 类型安全**：`any` 类型应最小化，使用 proper type declarations
3. **模块解析**：SDK 和 CLI 之间 moduleResolution 设置不一致导致类型导入失败
4. **ValidationResult 类型**：必须在子模块 types.ts 中重新导出，避免编译错误
5. **文档与代码脱节**：100+ 个 `.md` 文件，大量 YAML 模式定义，但代码没有对应的 Cluster 容器——这是范式转换的根本原因