# 待执行计划索引

> 所有历史计划文档位于 `.trae/documents/`，按阶段分类

---

## 一、已执行 / 已完成的计划

| 计划 | 对应交付物 | 完成时间 |
|------|-----------|---------|
| `day2-storage-and-crossfield-plan.md` | 存储格式重写 + 双向桥接 | 2026-07-11 |
| `day3-sharing-mechanism-plan.md` | 共享机制（Clone/Merge/Password/Visibility） | 2026-07-12 |
| `day3-sharing-detailed-implementation-plan.md` | 共享机制详细实现 | 2026-07-12 |
| `statuz-website-visual-design-plan.md` | 官网视觉设计 | 2026-07-12 |
| `statuz-website-upgrade-plan.md` | 官网升级实施 | 2026-07-12 |
| `LEASE_MANAGER_CALIBRATION_ENGINE_plan.md` | Lease Manager + Calibration Engine | 2026-06 |
| `MCP_Server_计划.md` | MCP Server 修复 | 2026-06 |
| `user_action_tracker_plan.md` | User Action Tracker | 2026-06 |

---

## 二、待执行 / 部分执行的计划

| 计划 | 内容 | 状态 | 优先级 |
|------|------|------|--------|
| Phase 4 引擎完善 | 加密压缩 + 单元测试 + 端到端脚本 + README | 未执行 | P0 |
| Phase 6 集成发布 | CI 完善 + Release + 官网部署 | 未执行 | P1 |
| `signal-bus-phase1-plan.md` | Signal Bus Phase 1 实施 | ~80% 执行 | P2 |
| `66-layer-verification-plan.md` | 66 层验证与文档 | ~60% 执行 | P2 |
| `cli-testing-plan.md` | CLI 测试 | ~90% 执行 | P2 |
| `phase2-sdk-implementation-plan.md` | SDK YAML 读写 | 未执行 | P2（冻结） |
| `MCP-Server-Niche-工具-计划.md` | Niche 层 MCP 工具 | 未执行 | P2（冻结） |
| `niche_cli_plan.md` | Niche CLI 命令 | 未执行 | P2（冻结） |
| `syn_cli_plan.md` | SYN CLI 命令 | 未执行 | P2（冻结） |
| `arrow_proposal_cli_plan.md` | Arrow Proposal CLI | 未执行 | P2（冻结） |

---

## 三、旧范式计划（冻结）

以下计划基于旧 TypeScript + YAML 范式编写，**在新范式（Rust 引擎）下需要重新评估**：

- `phase2-sdk-implementation-plan.md`：SDK YAML 读写类 → 在 Rust 中对应 storage 模块
- `MCP-Server-Niche-工具-计划.md`：Niche 层 MCP 工具 → 需等 Rust 引擎稳定后重新设计
- `niche_cli_plan.md`：Niche CLI 命令 → 概念需要重新映射到 Cluster/Field 体系
- `syn_cli_plan.md`：SYN CLI 命令 → 概念需要重新映射
- `arrow_proposal_cli_plan.md`：Arrow Proposal CLI → 概念需要重新映射