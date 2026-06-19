# Statuz Coordination Pool - 架构设计文档

## 概述

**Status:** 概念提案  
**Version:** 0.1  
**Author:** Statuz Core Team  
**Last Updated:** 2026-05-31

### 设计原则

1. **文件优先 (File-First):** 保持当前本地文件系统架构，不破坏现有功能
2. **可选增强 (Optional):** Coordination Pool 是**可选**的，不强制使用
3. **渐进式 (Incremental):** 可以分阶段部署，每个阶段都有独立价值
4. **兼容现有 (Compatible):** 与现有的 Statuz Core/niche/SYN 100% 兼容

---

## 问题陈述

### 当前架构的限制

1. **跨机器协作障碍**
   - Agent A 在机器 1，Agent B 在机器 2，无法共享信号
   - 没有统一的信号分发机制

2. **重复监听效率低**
   - 每个 agent 独立监听 VCS、API、依赖更新等事件
   - 相同的信号被重复处理

3. **缺少生态全景视图**
   - 只能看到单个项目的状态
   - 无法了解多项目的协调情况

4. **SYN 流程分散**
   - SYN 请求分散在各个本地文件中
   - 没有统一的审批队列和工作流

---

## 架构设计

### 三层架构（增强版）

```
Layer 3: Coordination Pool (可选，云服务)
  ├── Signal Hub         - 统一信号广播
  ├── SYN Queue          - 统一审批队列
  ├── Ecosystem View     - 全景状态视图
  └── REST API           - 与本地 Statuz 交互

Layer 2: niche + SYN (本地，保持不变)
  ├── niche              - 生态定位层
  └── SYN                - 人类治理层

Layer 1: Statuz Core (本地，保持不变)
  └── 运行时状态协议
```

### Coordination Pool 组件

#### 1. Signal Hub

**功能:**
- 统一监听外部事件源
- 信号标准化和去重
- 智能路由到相关 agent
- Webhook 支持

**事件源:**
- VCS (GitHub, GitLab, Bitbucket)
- 依赖管理 (npm, PyPI, Docker Hub)
- API 网关
- CI/CD 系统
- 自定义 Webhooks

#### 2. SYN Queue

**功能:**
- 统一的 SYN 请求队列
- 审批工作流
- 通知和提醒
- 审计日志

**集成点:**
- GitHub Issues
- Linear
- Slack/Discord
- Email

#### 3. Ecosystem View

**功能:**
- 多项目状态概览
- Agent 关系图谱
- 漂移监测仪表盘
- 历史趋势分析

---

## API 设计

### REST API 规范

```
POST   /api/v1/signals            - 发送信号
GET    /api/v1/signals            - 获取信号列表
POST   /api/v1/syn/requests       - 创建 SYN 请求
GET    /api/v1/syn/requests       - 获取 SYN 队列
POST   /api/v1/syn/:id/resolve    - 解决 SYN 请求
GET    /api/v1/ecosystem/overview - 获取生态全景
```

### 本地 SDK 集成

```typescript
// Statuz Coordination SDK (可选)
import { StatuzCoordinationClient } from "@statuz/coordination";

const client = new StatuzCoordinationClient({
  apiKey: "sk_...",
  projectId: "proj_123"
});

// 发送信号到 Coordination Pool
await client.emitSignal({
  type: "dependency_update",
  payload: {
    package: "react",
    version: "19.0.0"
  }
});

// 拉取 SYN 队列
const synQueue = await client.getSynQueue();
```

---

## 实施路径

### Phase 1: Signal Hub MVP (2-3 周)

**目标:** 解决跨机器信号共享

**功能:**
- [ ] Webhook 接收端点
- [ ] 信号标准化 (JSON Schema)
- [ ] 基础信号路由
- [ ] 本地 SDK 集成

**价值:** 即使只有这个，也能大幅提升多 agent 协作效率

### Phase 2: SYN Queue (2-3 周)

**目标:** 统一的审批工作流

**功能:**
- [ ] SYN 请求队列
- [ ] 状态管理 (pending/approved/rejected)
- [ ] 通知集成 (Slack/Email)
- [ ] 基础审计日志

### Phase 3: Ecosystem View (3-4 周)

**目标:** 全景视图

**功能:**
- [ ] 多项目仪表盘
- [ ] Agent 关系图谱
- [ ] 漂移监测
- [ ] 历史趋势

---

## 与现有架构的兼容性

### 保持不变的部分

- ✅ Statuz Core (`spec/statuz.schema.json`)
- ✅ niche 规范 (`docs/NICHE_MANIFEST.md`)
- ✅ SYN 规范
- ✅ 所有 SDK
- ✅ MCP Server
- ✅ CLI

### 新增部分（可选）

- ➕ Coordination Pool 服务
- ➕ 可选的 Coordination SDK
- ➕ 云服务部署文档

---

## 部署选项

### 选项 1: Self-Hosted

```
docker-compose.yml
├── statuz-coordination (主服务)
├── postgres (数据存储)
└── redis (队列/缓存)
```

### 选项 2: Statuz Cloud (未来)

托管服务，提供：
- 免费层 (个人/小团队)
- 付费层 (企业功能)
- SLA 保障

---

## 安全考虑

### 数据隔离

- 多租户架构
- 项目级数据隔离
- 细粒度访问控制

### 认证

- API Key 认证
- OAuth2 集成 (GitHub, GitLab)
- 可选的 SSO (企业版)

---

## 下一步行动

1. **技术验证 (1-2 天)**
   - 验证 Signal Hub 技术可行性
   - 做一个简单的 Webhook 接收器原型

2. **架构细化 (1 周)**
   - 完成详细的 API 设计
   - 完成数据库 Schema 设计

3. **MVP 开发 (2-3 周)**
   - 开发 Phase 1: Signal Hub
   - 集成到现有 SDK
