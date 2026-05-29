# NPM 发布指南

本指南介绍如何将 Statuz 项目的 npm 包发布到 npm 注册表。

## 发布的包

项目包含以下 npm 包：

1. `@oasis-npm/statuz-sdk` - TypeScript SDK
2. `@oasis-npm/statuz-cli` - 命令行工具
3. `@oasis-npm/statuz-mcp` - MCP 服务器

## 前置要求

- npm 账号
- 对 `@oasis-npm` 组织的发布权限
- Git 标签命名规范：`v{major}.{minor}.{patch}`（例如 `v0.3.0`）

## 自动发布（推荐）

### 1. 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

1. 进入仓库 → Settings → Secrets and variables → Actions
2. 添加新的 Repository secret：
   - **Name**: `NPM_TOKEN`
   - **Value**: 你的 npm 访问令牌（需有发布权限）

### 2. 创建并推送标签

```bash
# 创建带注释的标签
git tag -a v0.3.0 -m "Release version 0.3.0"

# 推送标签到远程仓库
git push origin v0.3.0
```

### 3. 等待发布完成

- GitHub Actions 会自动触发 `Publish to npm` 工作流
- 工作流会构建并发布所有三个包
- 你可以在 Actions 标签页查看进度

## 手动发布

### 1. 更新版本号

确保所有包的 `package.json` 中的版本号一致且正确：

- `packages/sdk-ts/package.json`
- `packages/cli/package.json`
- `packages/mcp-server/package.json`

### 2. 登录 npm

```bash
npm login
```

### 3. 构建包

```bash
npm run build:packages
```

### 4. Dry-run 发布（验证）

```bash
npm run publish:packages
```

### 5. 实际发布

```bash
npm run publish:packages:real
```

## 单独发布某个包

如果需要单独发布某个包，可以在对应的包目录下执行：

```bash
# 进入包目录
cd packages/sdk-ts

# 构建
npm run build

# 发布（带 provenance）
npm publish --provenance --access public
```

## 常见问题

### Q: 发布失败提示 "403 Forbidden"
**A:** 检查以下几点：
- npm token 是否有正确的权限
- 是否对 `@oasis-npm` 组织有发布权限
- 包名是否已被占用

### Q: 如何创建 npm 访问令牌？
**A:** 
1. 登录 npmjs.com
2. 进入 Access Tokens → Generate New Token
3. 选择 "Automation" 类型（适合 CI/CD）
4. 复制生成的 token 并保存

### Q: provenance 是什么？
**A:** npm provenance 提供了包来源的可验证证明，增加了包的安全性和可信度。使用 `--provenance` 标志发布时，npm 会自动生成并附加 provenance 信息。

### Q: 发布后如何验证？
**A:** 
1. 访问 npmjs.com 查看包页面
2. 使用 `npm view @oasis-npm/statuz-sdk` 查看最新版本
3. 在测试项目中安装并验证功能

## 版本管理建议

- 遵循语义化版本规范（Semantic Versioning）
- 在 CHANGELOG.md 中记录版本变更
- 发布前确保所有测试通过
