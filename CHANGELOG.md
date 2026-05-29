# Changelog

## 0.4.1

**Implementation Hardening** - 修复关键问题，提高代码可信度

### Fixed
- **TypeScript SDK**: 修复验证逻辑 bug，现在验证逻辑正确工作
- **JSON Schema & Ajv**: 使用 Ajv 2020 正确支持 JSON Schema Draft 2020-12
- **Schema**: 在 updated_at 和 checkpoints.at 字段添加 date-time 格式验证
- **MCP server**: 为所有文件访问操作添加安全边界，防止路径遍历攻击，默认禁止访问敏感目录
- **MCP server**: 完成所有工具实现（statuz_validate, statuz_resume, statuz_update）
- **Agent paths**: 统一 agent 文件路径规则为 `.statuz/agents/{agentName}.yaml`
- **CI**: 扩展 CI 覆盖所有包（CLI, TypeScript SDK, Python SDK, MCP server）

### Added
- **ajv-formats**: 添加到 CLI 和 TypeScript SDK 以支持 date-time 格式验证
- **MCP security**: 添加 `setAllowedRoots` 配置函数和 `assertSafePath` 验证函数

## 0.4.0

**MCP Server** - 添加 MCP 服务器，支持本地 agent 访问

### Added
- MCP server 包，提供以下工具：
  - `statuz_init`: 初始化新的 Statuz 文件
  - `statuz_read`: 读取现有 Statuz 文件
  - `statuz_checkpoint`: 添加检查点
  - `statuz_get_resume_brief`: 获取人类可读的恢复摘要
  - `statuz_update_status`: 更新状态字段
- MCP server 文档

## 0.3.0

**Dual SDKs** - 添加 TypeScript 和 Python SDK

### Added
- TypeScript SDK 包：
  - Statuz 类，支持读写、验证、创建
  - `forAgent` 便捷方法
  - 检查点管理
- Python SDK 包：
  - Statuz 类，支持读写、验证、创建
  - `for_agent` 便捷方法
  - 检查点管理
- Pydantic 类型定义

## 0.2.0

**Practical CLI** - 可用的命令行工具

### Added
- CLI 包，提供以下命令：
  - `statuz init`: 初始化新的 Statuz 文件
  - `statuz validate`: 验证 Statuz 文件
  - `statuz resume`: 显示人类可读的恢复摘要
- 完整的 CLI 实现，使用 Ajv 进行验证

## 0.1.0-draft

- Initial repository seed.
- Added Statuz 0.1 specification draft.
- Added schema, examples, CLI scaffold, and bootstrap Skill draft.
