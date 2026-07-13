# 官网成果

> 构建时间：2026-07-12
> 代码位置：`docs/index.html`（1471 行，单页内联 HTML/CSS/JS）

---

## 一、技术架构

- **零框架**：单页 HTML + 内联 CSS + 内联 JavaScript
- **零依赖**：不依赖任何外部 JS 库或 CSS 框架
- **零构建**：直接打开 `docs/index.html` 即可工作
- **部署方式**：GitHub Pages（`docs/` 目录）

外部资源：仅 Google Fonts（Instrument Serif、DM Sans、JetBrains Mono），通过 `font-display: swap` 确保加载失败时优雅回退。

---

## 二、设计系统

### 设计方向：Architectural Blueprint（架构蓝图）

网站的视觉语言像一份**建筑蓝图**或**电路原理图**：线条是骨干，点（节点）是实体，空白是呼吸空间。

### 色彩系统

| Token | 深色模式 | 浅色模式 |
|-------|---------|---------|
| `--bg-deep` | `#0a0a0f` | `#fafaf8` |
| `--bg-surface` | `#12121a` | `#f0f0ee` |
| `--bg-elevated` | `#1a1a26` | `#e8e8e6` |
| `--text-primary` | `#e8e8ed` | `#1a1a22` |
| `--text-secondary` | `#8888a0` | `#6b6b80` |
| `--brand` | `#4a7cf7`（冷峻蓝灰） | 同左 |
| `--amber` | `#f59e0b`（唯一强调色） | 同左 |
| `--line` | `#2a2a3a` | `#d0d0ce` |
| `--grid` | `#1a1a28` | `#e0e0de` |

### 字体系统

- 标题：`Instrument Serif`（有衬线，非典型，有"蓝图手写标注"感）
- 正文：`DM Sans`（干净、可读、非典型无衬线体）
- 代码：`JetBrains Mono`（等宽、清晰、开发者首选）

### 蓝图网格

每个 `.blueprint` section 的背景使用 40px 等距网格线（`linear-gradient` 实现），作为视觉纹理。

---

## 三、页面结构（7 个 Section）

```
Navigation ──→ 固定顶部，毛玻璃效果，深色/浅色切换
Hero ────────→ 全屏，Logo 自绘动画，背景 SVG 节点图
Problem ─────→ 两列布局，3 个痛点，SVG 线团 hover 变为拓扑图
Solution ────→ 3 个查询卡片（traverse/impact/path），微 SVG + 代码块
How It Works → 2×2 网格，4 个概念卡片（Cluster/Field/Bridge/Three Queries）
CLI Demo ────→ 终端窗口，打字机动画
Use Cases ───→ 2 个场景（AI Agent 协作 / 组织架构）+ SVG 架构图
CTA ─────────→ 品牌色渐变背景，"Start building your topology today"
Footer ──────→ Logo + 三列链接 + "Built with Rust"
```

---

## 四、动画系统

| 元素 | 动画类型 | 触发方式 |
|------|---------|---------|
| Logo | stroke-dasharray 自绘 | 页面加载 |
| H1 标题 | translateY + opacity | 页面加载 |
| 查询卡片 | translateY + opacity | 滚动进入视口 |
| Problem 图 | 线团→拓扑 hover 变换 | 鼠标悬停 |
| CLI 代码块 | 打字机效果 | 滚动进入视口 |
| 概念卡片 | 边框发光 | 鼠标悬停 |
| 导航栏 | 背景透明度变化 | 滚动 |

所有动画支持 `prefers-reduced-motion`。

---

## 五、SVG 图清单（10+ 个内联 SVG）

| 位置 | SVG 内容 | 尺寸 |
|------|---------|------|
| Hero 背景 | 7 节点星型拓扑图 | 800×600 |
| Problem | 6 节点线团图 → 4 边有向图 hover 变换 | 400×300 |
| traverse 卡片 | 3 节点 2 边微图 | 60×40 |
| impact 卡片 | 4 节点微图（amber 高亮变更点） | 60×40 |
| path 卡片 | 5 节点线性微图（品牌色高亮最短路径） | 80×40 |
| Cluster 概念 | 虚线框 + 6 节点有向图 + 锁图标 | 200×100 |
| Field 概念 | 双层框（Architecture / Data Flow） | 200×100 |
| Bridge 概念 | 双框双向箭头 | 200×100 |
| Three Queries | 三图标并排（节点图/闪电/折线） | 200×100 |
| Solution 完整图 | 5 节点架构（API Gateway → Auth/Orchestrator → DB） | 600×220 |
| Use Case 1 | 7 节点微服务依赖图 | 400×220 |
| Use Case 2 | 5 节点组织架构树 | 400×180 |

所有 SVG 内联，使用 CSS 变量（`var(--brand)`、`var(--line)`、`var(--amber)`），支持深色/浅色模式自动适配。

---

## 六、差异化设计

| 方面 | 大多数工具网站 | Statuz 官网 |
|------|---------------|-------------|
| 品牌色 | 紫色渐变 | 冷峻蓝灰 `#4a7cf7` |
| 字体 | Inter / Space Grotesk | Instrument Serif + DM Sans |
| 背景 | 纯色 + 渐变 | 蓝图网格纹理 |
| 视觉语言 | 图标 + 插图 | 节点 + 边 + 线条 |
| 核心展示 | 截图 + 功能列表 | 内联 SVG 图 + 代码块 |
| 隐喻 | 营销页面 | 技术图纸 |