# Statuz Knowledge Base

> 项目知识库 —— 记录所有交付成果、研发计划、方法论和架构决策。
> 供后续研发代理（TRAE Agent）快速理解项目上下文，避免重复探索。

---

## 目录结构

```
knowledge-base/
├── README.md                   ← 总览（本文件）
├── 01-achievements/            ← 成果清单
│   ├── engine-achievements.md  ← Rust 图引擎成果
│   ├── website-achievements.md ← 官网成果
│   └── legacy-achievements.md  ← 旧 TypeScript 系统成果
├── 02-plans/                   ← 研发计划
│   ├── current-roadmap.md      ← 当前路线图
│   ├── pending-plans.md        ← 待执行计划索引
│   └── future-directions.md    ← 未来方向
├── 03-methodology/             ← 方法论
│   ├── development-workflow.md ← 开发工作流
│   ├── decision-framework.md   ← 决策框架
│   ├── verification-strategy.md← 验证策略
│   └── research-approach.md    ← 研究方法
├── 04-architecture/            ← 架构设计
│   ├── engine-architecture.md  ← 引擎架构总览
│   ├── storage-format.md       ← 存储格式规格
│   └── design-decisions.md     ← 设计决策记录
├── 05-hard-rules/              ← 硬规则
│   └── hard-rules.md           ← 不可违反的规则
└── 06-unresolved/              ← 未解决问题
    └── open-questions.md       ← 待解决问题与研究方向
```

---

## 项目定位

Statuz 是一个 **图引擎**，不是协议、不是文档系统、不是数据库。

核心口号：**"Better Engine, Better Diagram, Better Loop"**

三条原则：
- 信息必须**主动释放**（像工作记忆），而不是被动检索
- 拓扑结构可计算——通过三个查询（traverse / impact / path）回答所有结构性问题
- Cluster 是唯一存储单元，Field 是子图，Bridge 是跨域通信

---

## 当前状态（2026-07-13）

| 维度 | 状态 | 备注 |
|------|------|------|
| Rust 引擎 | 原型完成 ~2500 行 | 10 Phase 自测通过，11 个 CLI 命令 |
| 官网 | 初次构建完成 | 1471 行单页 HTML，Architectural Blueprint 风格 |
| CI | 配置完成 | GitHub Actions，`cargo build + test + clippy` |
| 旧 TypeScript 代码 | 冻结 | 待 Rust 版本取代 |
| 构建脚本 | 完成 | `scripts/build.ps1` |

---

## 关键文件索引

| 文件路径 | 说明 |
|---------|------|
| `AGENTS.md` | 引擎工作指南（代理必须阅读） |
| `crates/statuz-core/src/main.rs` | CLI 入口 + 自测 |
| `crates/statuz-core/src/lib.rs` | 公开 API 导出 |
| `crates/statuz-core/src/graph/` | 引擎核心（types/engine/query） |
| `crates/statuz-core/src/cluster/` | 存储容器（cluster/field/sharing） |
| `crates/statuz-core/src/storage/` | 序列化格式 |
| `docs/index.html` | 官网 |
| `scripts/build.ps1` | 构建脚本 |
| `.github/workflows/ci.yml` | CI 配置 |
| `.trae/documents/` | 所有计划文档 |
| `leftover/` | 旧范式文档（已归档） |
| `knowledge-base/` | 本知识库 |