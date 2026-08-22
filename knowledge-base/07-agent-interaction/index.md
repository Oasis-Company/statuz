# Agent × Statuz 交互框架

> 框架提案 —— 定义了 Agent、Multi-Agent 与 Statuz 引擎、表征层、Dashboard 之间的交互协议
> 基于 Claude Code 三层 Runtime、ACE 上下文工程、GoT 图推理、GraphRAG 等研究

---

## 目录结构

```
07-agent-interaction/
├── index.md                    ← 框架总览（本文件）
├── 01-injection-protocol.md    ← 注入层协议
├── 02-runtime-query.md         ← 运行时查询协议
├── 03-sync-protocol.md         ← 回写同步协议
├── 04-multi-agent.md           ← Multi-Agent 协调
├── 05-representation-layer.md  ← 表征层集成
├── 06-dashboard-integration.md ← Dashboard 可视化
└── 07-roadmap.md               ← 实现路线图
```