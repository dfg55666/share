# Sbird-ui 审查报告 — Task 2

> 审查时间：2026-05-08
> 审查范围：全部 features/、ui/、runtime/、api/、domain/ 层代码
> 审查人：AI Architect（最高决策权）

---

## 一、已确认的问题清单

### 🔴 P0 — 结构/逻辑错误（影响功能正确性）

#### 1. ThinkingCard 位置错误：显示在 Agent 输出区域外部上方
**文件**：`features/chat/ui/ChatTimeline.tsx`
**现状**：在 `messageRow` 中，ThinkingCard 作为 ChatBubble 的 **兄弟节点** 渲染在上方。视觉上"思考过程与工具调用"折叠栏浮在 Agent 回复气泡的上方，而不是嵌入在 Agent 消息体内。

```tsx
// 当前（错误）
<div className={styles.messageRow}>
  {msg.thinking && <ThinkingCard ... />}  {/* ← 在气泡外面 */}
  <ChatBubble ... />
</div>
```

**方案**：ThinkingCard 应嵌入到 ChatBubble 的 `.agentBody` 内部，作为内容的一部分展示。具体做法：
- 方案 A（推荐）：ChatBubble 接受 `thinking` prop，在 `.agentBody` 内渲染 ThinkingCard（内容上方或下方均可）。
- 方案 B：ChatBubble 接受 `children`，由 ChatTimeline 传入 ThinkingCard。

**影响范围**：ChatBubble.tsx、ChatTimeline.tsx、ChatBubble.module.scss

---

#### 2. 虚拟滚动实现有缺陷
**文件**：`features/chat/ui/ChatTimeline.tsx`
**现状**：
- 使用固定 `ESTIMATED_ITEM_HEIGHT = 80` 进行高度估算，但消息气泡高度差异极大（短文 vs 长内容+ThinkingCard），导致滚动位置偏移严重。
- `visibleRange` 只在 `onScroll` 时更新，没有用 `IntersectionObserver` 或 `ResizeObserver`，窗口 resize 后不会重算。
- 当 `messages.length < 50` 时直接全量渲染（无虚拟化），但阈值 50 是硬编码的魔法数字。
- TopPadding / BottomPadding 基于固定高度计算，会导致滚动条抖动。

**方案**：
- 短期：将阈值抽为常量并注释理由；监听 `resize` 事件重算。
- 中期：引入动态高度测量（measureRef + 缓存已渲染行高度），或使用成熟虚拟列表库（如 `@tanstack/react-virtual`，零依赖虚拟化）。

---

### 🟡 P1 — 设计/架构问题（影响可维护性和扩展性）

#### 3. SettingsModal.tsx 是死代码
**文件**：`features/settings/ui/SettingsModal.tsx` + `SettingsModal.module.scss`
**现状**：整个文件 **未被任何模块 import**。当前设置入口是 `SettingsPanel.tsx`。`SettingsModal` 是早期简易版设置弹窗的遗留物。
**方案**：删除 `SettingsModal.tsx` 和 `SettingsModal.module.scss`。

---

#### 4. 设置页面全是纯占位状态（无持久化/无 Runtime 联动）
**文件**：所有 `features/settings/ui/pages/*.tsx`
**现状**：
- 每个设置页面的状态都是 `useState` 局部状态，**切换页面或关闭面板后全部丢失**。
- 没有与 AppRuntime 或任何持久层（localStorage / 服务端）联动。
- 外观设置（主题模式、主题色、字号）修改后完全没有效果，没有实际修改 CSS Variables 或 document class。
- ConnectionPage 中的连接状态（`connected`、`12ms`、`2h 34m`）全是硬编码常量。

**方案**：
- 创建 `SettingsStore`（类似 RuntimeStore 的 useSyncExternalStore 模式）管理全部设置状态。
- 持久化到 `localStorage`。
- 外观相关设置需实际修改 `:root` CSS 变量和 `document.documentElement.className`。
- ConnectionPage 从 `LiveSyncController` 或 AppRuntime 读取真实连接状态。

---

#### 5. ChatComposerPanel 文件上传功能是空壳
**文件**：`features/chat/ui/ChatComposerPanel.tsx`
**现状**：
- 文件选择后只存了 `{ id, name, size }` 到本地状态，完全没有上传逻辑。
- 发送消息时 `onSend(trimmed)` 只传了文本，附件被清空但从未使用。
- FilePreviewBar 显示了文件芯片，但只是视觉装饰。

**方案**：
- 如果当前不需要文件上传，应在 UI 上移除附件按钮和 FilePreviewBar（或标注为"即将上线"，disable 按钮）。
- 如果需要文件上传，需要：扩展 `onSend` 签名为 `(text, files)` → 经 TurnController 走 multipart 或先上传后引用。

---

#### 6. 语音输入按钮是纯占位
**文件**：`features/chat/ui/ChatComposerPanel.tsx`
**现状**：Mic 按钮没有任何 `onClick` 处理，纯视觉占位。
**方案**：如不实现，应 disable 并加 tooltip "即将上线"；或移除。

---

#### 7. ChartView 是完全静态硬编码 SVG
**文件**：`features/panel/ui/ChartView.tsx`
**现状**：
- 接收 `PlanetPosition[]` props 但 **完全忽略**，组件体内全是硬编码的 `<text>` 和坐标。
- 行星位置、颜色、宫位编号全部写死，无法根据数据动态渲染。
- 宫位编号（1-12）与标准北印度菱形盘的传统布局不完全吻合（House 1 应在正上方菱形中心）。

**方案**：
- 短期：注释标明当前是 Mock 占位。
- 中期：实现数据驱动渲染 — 根据 `planets` prop 计算每个行星在哪个宫位、落在菱形盘的哪个三角区，动态生成 `<text>` 元素。

---

#### 8. MockPreviewPage 未在路由中挂载
**文件**：`MockPreviewPage.tsx`、`main.tsx`
**现状**：`MockPreviewPage` 存在但路由表中没有挂载它（`main.tsx` 只挂了 `WorkbenchRuntimePage`），开发者无法通过访问 `/mock` 来使用 Mock 页面进行 UI 调试。
**方案**：在 `main.tsx` 路由中添加 `<Route path="/mock" element={<MockPreviewPage />} />`（或通过环境变量控制是否启用）。

---

### 🟢 P2 — 代码质量/一致性问题

#### 9. `nowTimeLabel()` 在渲染函数内创建 → 每次 re-render 生成新时间
**文件**：`features/workbench/WorkbenchRuntimePage.tsx`
**现状**：`timelineMessages` 的 `useMemo` 内调用 `nowTimeLabel()`，但依赖项列表不包含时间，所以时间值在同一次 memo 计算中是准确的。但如果其他 deps 变化触发重算，会产生新的时间戳，这在 loading/empty 占位消息上可以接受，但不够严谨。
**方案**：影响较小，但建议用 `useRef` 缓存首次生成的时间，或改用固定文案不带时间。

---

#### 10. CSS 变量回退值不一致
**文件**：`MentionPopup.module.scss`、`FilePreviewBar.module.scss`
**现状**：这两个文件用了 `var(--sb-bg-card, #1e1e2e)` 等暗色系回退值，而全局 tokens 定义的是浅色系（`--sb-bg-white: #ffffff`）。在不定义 `--sb-bg-card` 的情况下，回退到深色背景与整体浅色主题冲突。
**方案**：统一回退值与当前浅色主题一致，或确保 tokens 中定义 `--sb-bg-card`。

---

#### 11. `agentBody` 缺少 Markdown 渲染
**文件**：`features/chat/ui/ChatBubble.tsx`
**现状**：Agent 回复只做了 `content.split('\n')` 按行渲染 `<p>`，没有 Markdown 解析（加粗、列表、代码块、链接等全部当纯文本显示）。
**方案**：中期引入轻量 Markdown 渲染（如 `react-markdown` 或自实现简单解析器），至少支持 `**bold**`、`` `code` ``、列表、链接。

---

#### 12. 重复的 WORKFLOW_LABEL_BY_KEY 定义
**文件**：`WorkbenchRuntimePage.tsx` 和 `run-list-projection.ts`
**现状**：两处都定义了 `WORKFLOW_LABEL_BY_KEY = { yinzhan: '印占', liuyao: '六爻' }`，违反 DRY。
**方案**：统一到 `run-list-projection.ts` 并导出，WorkbenchRuntimePage 引用它。

---

#### 13. ErrorBoundary 缺少恢复机制和样式
**文件**：`ui/ErrorBoundary.tsx`
**现状**：捕获错误后只显示纯文本"Something went wrong"，没有重试按钮、没有样式，用户体验差。
**方案**：添加友好的错误 UI（带 Sbird Logo、错误信息、"重新加载"按钮）。

---

#### 14. `vite-env.d.ts` 存在但未检查是否与实际 Vite 版本匹配
**文件**：`vite-env.d.ts`
**现状**：文件存在是好的，确保 `import.meta.env` 类型正确。需确认 `/// <reference types="vite/client" />` 与 Vite 6 兼容。
**方案**：确认即可，低优先级。

---

#### 15. button 元素缺少统一的 reset 样式
**文件**：多处组件（ThreadList、ThinkingCard、SettingsNav 等）
**现状**：多个组件中的 `<button>` 依赖各自 SCSS Module 中的样式去覆盖浏览器默认按钮样式（border、background、padding），但 `globals.scss` 中没有全局 button reset。导致每个按钮组件都要重复写 `border: none; background: transparent; padding: 0;`。
**方案**：在 `globals.scss` 中添加 `button { border: none; background: transparent; font: inherit; cursor: pointer; padding: 0; }` reset。

---

#### 16. 缺少 loading / skeleton 状态
**文件**：整个 chat 和 panel 区域
**现状**：数据加载中只显示文字"正在同步运行列表，请稍候…"，没有骨架屏或 shimmer 动画。
**方案**：中期添加 skeleton 组件，提升感知性能。

---

## 二、问题汇总优先级矩阵

| # | 问题 | 优先级 | 复杂度 | 涉及文件数 |
|---|------|--------|--------|-----------|
| 1 | ThinkingCard 位置错误 | 🔴 P0 | 中 | 3 |
| 2 | 虚拟滚动缺陷 | 🔴 P0 | 高 | 1-2 |
| 3 | SettingsModal 死代码 | 🟡 P1 | 低 | 2（删除） |
| 4 | 设置无持久化/无联动 | 🟡 P1 | 高 | 8+ |
| 5 | 文件上传空壳 | 🟡 P1 | 中 | 2 |
| 6 | 语音按钮占位 | 🟡 P1 | 低 | 1 |
| 7 | ChartView 静态硬编码 | 🟡 P1 | 中 | 1 |
| 8 | MockPreviewPage 未挂载 | 🟡 P1 | 低 | 1 |
| 9 | nowTimeLabel 渲染内调用 | 🟢 P2 | 低 | 1 |
| 10 | CSS 变量回退值不一致 | 🟢 P2 | 低 | 2 |
| 11 | 缺少 Markdown 渲染 | 🟢 P2 | 中 | 2 |
| 12 | WORKFLOW_LABEL 重复定义 | 🟢 P2 | 低 | 2 |
| 13 | ErrorBoundary 缺恢复机制 | 🟢 P2 | 低 | 1 |
| 14 | vite-env.d.ts 版本兼容 | 🟢 P2 | 低 | 1 |
| 15 | button reset 缺失 | 🟢 P2 | 低 | 1 |
| 16 | 缺少 skeleton/loading | 🟢 P2 | 中 | 3+ |

---

## 三、架构层面评价

### 优点 ✅
1. **分层清晰**：api → domain → runtime → features 四层边界明确，无跨层穿透。
2. **投影层设计优秀**：`agent-group-projection.ts` 的 Segment 聚合逻辑处理了多 Agent、turnId 去重、displaySeq 排序等复杂场景，纯函数可测试。
3. **状态管理自研合理**：SSE 重连、同步状态机、乐观 UI 的复杂度确实不适合通用状态库。
4. **SCSS Modules + Design Tokens**：样式隔离良好，`--sb-*` 前缀统一。
5. **设置面板架构可扩展**：SettingsNav 的分组导航 + SettingsPanel 的注册制设计，新增页面只需三步。
6. **contracts.ts 类型完整**：前后端共享类型定义覆盖面广。

### 需要改进 ⚠️
1. **缺少测试**：整个项目没有单元测试或集成测试文件。投影层和 domain 层是纯函数，最适合单测。
2. **headless 层是否需要**：`runtime/headless/` 目录有大量 TUI 渲染代码（50+ 文件），但 Web 端完全不使用。如果 Web 和 TUI 确实需要共享 runtime，headless 应该独立为一个包；否则应移出 Web 项目以减少代码量。
3. **缺少类型导出的 barrel 文件**：`features/chat/index.ts` 导出了组件但没有导出类型（如 TimelineMessage），导致 MockPreviewPage 需要手工定义类型。
