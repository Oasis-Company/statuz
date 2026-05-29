# @oasis-npm/statuz-sdk

TypeScript SDK for the Statuz AI Agent Runtime Status Protocol - 管理和跟踪 AI 代理运行时状态的工具包。

## 项目介绍

Statuz SDK 是一个用于管理 AI 代理运行时状态的 TypeScript 库，提供了读取、写入、验证 Statuz YAML 文件的功能。它帮助你跟踪代理的当前状态、记录检查点、管理进度，并确保状态符合 Statuz 规范。

主要功能：
- 读取和解析 Statuz YAML 文件
- 创建和更新 Statuz 文档
- 验证 Statuz 文件的合法性
- 添加检查点记录进度
- 访问和修改代理状态、任务等信息

## 安装说明

使用 npm 安装：

```bash
npm install @oasis-npm/statuz-sdk
```

使用 yarn 安装：

```bash
yarn add @oasis-npm/statuz-sdk
```

使用 pnpm 安装：

```bash
pnpm add @oasis-npm/statuz-sdk
```

## 快速开始

### 基本使用示例

```typescript
import { Statuz } from "@oasis-npm/statuz-sdk";

// 1. 创建一个新的 Statuz 文件
const statuz = Statuz.create("my-agent", "my-project");
statuz.write(".statuz/statuz.yaml");

// 2. 读取现有的 Statuz 文件
const existingStatuz = Statuz.read(".statuz/statuz.yaml");

// 3. 更新当前状态
existingStatuz.currentState = {
  stage: "implementation",
  task: "开发新功能",
  status: "in_progress",
  last_checkpoint: "完成了架构设计",
  next_action: "开始编码实现"
};

// 4. 添加检查点
existingStatuz.appendCheckpoint(
  "实现了核心功能模块",
  "进行单元测试"
);

// 5. 保存更改
existingStatuz.write(".statuz/statuz.yaml");

// 6. 验证文件
const validation = Statuz.validate(".statuz/statuz.yaml");
if (validation.valid) {
  console.log("Statuz 文件有效！");
} else {
  console.error("验证错误：", validation.errors);
}
```

### 代理专用文件

```typescript
import { Statuz } from "@oasis-npm/statuz-sdk";

// 为特定代理创建或读取 Statuz 文件
const agentStatuz = Statuz.forAgent("my-agent", "my-project");

// 更新状态并添加检查点
agentStatuz.currentState.status = "in_progress";
agentStatuz.appendCheckpoint("开始处理任务");
agentStatuz.write();
```

## API 文档

### Statuz 类

#### 静态方法

- `Statuz.create(agentName: string, projectName: string): Statuz` - 创建新的 Statuz 实例
- `Statuz.read(filePath: string): Statuz` - 读取并解析 Statuz 文件
- `Statuz.validate(filePath: string): ValidationResult` - 验证 Statuz 文件
- `Statuz.validateDocument(doc: unknown): ValidationResult` - 验证 Statuz 文档对象
- `Statuz.forAgent(agentName: string, projectName: string): Statuz` - 为特定代理创建或读取文件

#### 实例方法

- `write(filePath: string): void` - 将当前状态写入文件
- `validate(): ValidationResult` - 验证当前文档
- `appendCheckpoint(summary: string, nextAction?: string): Checkpoint` - 添加检查点
- `getDocument(): StatuzDocument` - 获取文档的完整副本

#### 属性

- `identity` - 代理身份信息（只读）
- `currentState` - 当前状态（可读写）
- `checkpoints` - 检查点列表（只读）

### 类型定义

主要类型包括：
- `StatuzDocument` - 完整的 Statuz 文档
- `Identity` - 代理身份信息
- `CurrentState` - 当前状态
- `Checkpoint` - 检查点
- `Progress` - 进度信息
- `ValidationResult` - 验证结果

## 许可证

本项目采用 Apache-2.0 许可证。详见 [LICENSE](https://github.com/zbbsdsb/MuseRock/blob/main/LICENSE) 文件。

## 链接

- [GitHub 仓库](https://github.com/zbbsdsb/MuseRock)
- [Statuz 规范文档](https://github.com/zbbsdsb/MuseRock/blob/main/SPEC.md)
- [问题反馈](https://github.com/zbbsdsb/MuseRock/issues)
