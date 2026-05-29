# @oasis-npm/statuz-mcp

MCP (Model Context Protocol) Server for the Statuz AI Agent Runtime Status Protocol - 为 AI 代理提供状态管理功能的 MCP 服务器。

## 项目介绍

Statuz MCP Server 是一个基于 Model Context Protocol 的服务器，它为 AI 助手（如 Claude Desktop）提供了管理和跟踪 AI 代理运行时状态的工具集。通过这个 MCP 服务器，AI 助手可以轻松地读取、更新和验证 Statuz YAML 文件，实现会话间的状态持久化和恢复。

主要功能：
- 初始化新的 Statuz 文件
- 读取和解析现有 Statuz 文件
- 验证 Statuz 文件的合法性
- 更新代理状态和任务信息
- 添加检查点记录进度
- 生成人类可读的状态摘要

## 安装说明

使用 npm 安装：

```bash
npm install @oasis-npm/statuz-mcp
```

使用 yarn 安装：

```bash
yarn add @oasis-npm/statuz-mcp
```

使用 pnpm 安装：

```bash
pnpm add @oasis-npm/statuz-mcp
```

## 配置 Claude Desktop

### 1. 找到配置文件

Claude Desktop 的配置文件位置：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. 添加 Statuz MCP Server 配置

在配置文件中添加以下内容：

```json
{
  "mcpServers": {
    "statuz": {
      "command": "npx",
      "args": [
        "-y",
        "@oasis-npm/statuz-mcp"
      ]
    }
  }
}
```

如果您是从源码安装或在开发环境中使用：

```json
{
  "mcpServers": {
    "statuz": {
      "command": "node",
      "args": [
        "/path/to/statuz/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

### 3. 重启 Claude Desktop

保存配置文件后，重启 Claude Desktop 以使更改生效。

## 使用示例

### 初始化 Statuz 文件

```javascript
// 使用 statuz_init 工具
{
  "agentName": "project-assistant",
  "projectName": "my-awesome-project",
  "filePath": ".statuz/statuz.yaml"
}
```

### 读取当前状态

```javascript
// 使用 statuz_read 或 statuz_get_resume_brief
{
  "filePath": ".statuz/statuz.yaml"
}
```

### 更新状态

```javascript
// 使用 statuz_update_status
{
  "filePath": ".statuz/statuz.yaml",
  "status": "in_progress",
  "stage": "implementation",
  "task": "实现用户认证功能",
  "nextAction": "编写测试用例"
}
```

### 添加检查点

```javascript
// 使用 statuz_checkpoint
{
  "filePath": ".statuz/statuz.yaml",
  "summary": "完成了数据库模型设计和 API 接口定义",
  "nextAction": "开始实现业务逻辑层"
}
```

### 验证文件

```javascript
// 使用 statuz_validate
{
  "path": ".statuz/statuz.yaml"
}
```

## 可用工具

Statuz MCP Server 提供以下工具：

| 工具名称 | 描述 |
|---------|------|
| `statuz_init` | 初始化新的 Statuz 文件 |
| `statuz_read` | 读取并解析 Statuz YAML 文件 |
| `statuz_get_resume_brief` | 获取人类可读的状态摘要 |
| `statuz_resume` | 获取详细的状态恢复信息 |
| `statuz_update_status` | 更新 current_state 字段 |
| `statuz_update` | 更新任意字段（使用点号表示法） |
| `statuz_checkpoint` | 添加检查点记录进度 |
| `statuz_validate` | 验证 Statuz 文件的合法性 |

## 许可证

本项目采用 Apache-2.0 许可证。详见 [LICENSE](https://github.com/zbbsdsb/MuseRock/blob/main/LICENSE) 文件。

## 链接

- [GitHub 仓库](https://github.com/zbbsdsb/MuseRock)
- [Statuz 规范文档](https://github.com/zbbsdsb/MuseRock/blob/main/SPEC.md)
- [MCP 协议文档](https://modelcontextprotocol.io/)
- [问题反馈](https://github.com/zbbsdsb/MuseRock/issues)
