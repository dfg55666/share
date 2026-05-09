# Task 3 — 施工计划

> 基于 Task 2 审查报告制定
> 按优先级排序，可逐步执行
> 2026-05-08 更新：Task 3.1 方案经讨论确定为「极简内联折叠行」风格

---

## 第一批：P0 修复（立即执行）

### Task 3.1 — ThinkingCard 重设计 + 嵌入 ChatBubble 内部

**目标**：将"思考过程与工具调用"从 Agent 气泡外部移入气泡内部，并将样式从"重边框卡片"改为**极简内联折叠行**风格。

**设计参考**：参见 `task/think.png` — 一行折叠文字 + 展开后圆点列表 + 嵌套工具卡片。

#### 最终视觉效果

```
┌─ Agent 气泡 ─────────────────────────────────────────┐
│  🤖 玄极助手  Agent                        10:43     │  ← agentMeta
│                                                      │
│    ◎ 思考了 3 步  ∧                                  │  ← 极简折叠行（无背景/无边框）
│      ● 已解析命盘结构、十神配置…                      │  ← 展开：紫色圆点步骤
│      ● 结合大运流年趋势…                              │
│      ┌────────────────────────────────────┐          │  ← 工具调用：保留现有 ToolCallCard
│      │ 📄 命令执行   shell         ✅     │          │     卡片样式，内嵌在列表中
│      └────────────────────────────────────┘          │
│                                                      │
│    从命盘看，你的财富增长更适合走稳健积累…              │  ← 正文内容
│    未来几年事业上有明显上升窗口…                       │
└──────────────────────────────────────────────────────┘
```

#### 设计要点

1. **折叠行**：
   - 无背景色、无边框、无卡片容器
   - 左侧：紫色圆圈图标 `◎`（用 CSS 实现或 lucide `Circle` 图标）
   - 中间：文案 `思考了 N 步`（N = items 总数）
   - 右侧：ChevronUp/ChevronDown 切换
   - 整行可点击，hover 时文字变色即可（不加背景）
   - 字号 13px，颜色 `--sb-text-secondary`

2. **展开区域**：
   - 无背景、无边框（不像现在有 `border-top` 分隔）
   - 步骤项前面用紫色实心圆点 `●`（`--sb-primary`），8px 大小
   - 步骤文本：13px，`--sb-text-secondary`，行高 1.7
   - 步骤之间无分隔线（去掉现有的 `border-top: 1px dashed`）
   - 工具调用：保留现有 `ToolCallCard` 卡片样式不变（有背景、边框、图标、状态），作为列表项之一
   - 整体左侧有 16px padding 形成缩进层次（与圆点对齐）

3. **位置**：
   - 在 `.agentBody` 内部
   - 位于正文内容**上方**
   - 与正文之间有 12px 间距

4. **ToolCallCard 不改**：
   - 保留现有样式（白底、边框、图标盒、状态图标）
   - 它作为 `items` 列表中 `type: 'tool'` 的渲染，嵌在步骤列表中间
   - 只是外层容器从"卡片内"变成了"无背景列表内"

#### 涉及文件 & 逐行改动明细

---

##### 文件 1：`features/chat/ui/ThinkingCard.tsx` — **重写组件**

**改动要点**：
- 删除外层 `.container` div（去掉背景+边框）
- 折叠行改为极简文本行：圆圈图标 + `思考了 N 步` + chevron
- `items` 计数逻辑：`orderedItems.length`
- 展开区域去掉 `border-top`，改为简单列表
- 步骤项前加紫色圆点 `●`（用 `<span className={styles.dot}>` 实现）
- ToolCallCard 保持不变

**新 JSX 结构**：
```tsx
<div className={styles.thinkingInline}>
  {/* 折叠行 */}
  <div className={styles.toggleRow} onClick={toggle} role="button" ...>
    <span className={styles.circleIcon}>◎</span>
    <span className={styles.toggleText}>思考了 {count} 步</span>
    <span className={styles.chevron}>
      <ChevronUp size={14} />  {/* 展开时 Up，收起时 Down */}
    </span>
  </div>

  {/* 展开内容 */}
  {expanded && (
    <div className={styles.stepList}>
      {orderedItems.map((item, i) =>
        item.type === 'tool' ? (
          <ToolCallCard key={...} ... />
        ) : (
          <div key={...} className={styles.stepItem}>
            <span className={styles.dot} />
            <span className={styles.stepText}>{item.text}</span>
          </div>
        )
      )}
    </div>
  )}
</div>
```

---

##### 文件 2：`features/chat/ui/ThinkingCard.module.scss` — **完全重写样式**

**删除**：`.container`、`.header`、`.headerTitle`、`.body`、`.step`（`& + &` 的 dashed border）、`.toolsSection`、`.toolsLabel`

**新增**：
```scss
// 整个组件无背景、无边框
.thinkingInline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 12px;  // 与正文内容的间距
}

// ── 折叠行 ──────────────────────────────
.toggleRow {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  padding: 4px 0;
  // 无背景

  &:hover .toggleText {
    color: var(--sb-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--sb-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
}

.circleIcon {
  color: var(--sb-primary);
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

.toggleText {
  font-size: 13px;
  font-weight: 500;
  color: var(--sb-text-secondary);
  transition: color var(--sb-transition-fast);
}

.chevron {
  color: var(--sb-text-muted);
  display: flex;
  align-items: center;
  transition: transform var(--sb-transition-normal);
  margin-left: 2px;
}

.chevronExpanded {
  transform: rotate(180deg);
}

// ── 展开步骤列表 ────────────────────────
.stepList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0 4px 6px;  // 左缩进与圆点对齐
}

.stepItem {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sb-primary);
  flex-shrink: 0;
  margin-top: 7px;  // 视觉对齐文本行中线
}

.stepText {
  font-size: 13px;
  color: var(--sb-text-secondary);
  line-height: 1.7;
  word-break: break-word;
  white-space: pre-wrap;
}
```

---

##### 文件 3：`features/chat/ui/ChatBubble.tsx` — **添加 thinking prop**

**改动要点**：
- import ThinkingCard
- 接口添加 `thinking?` prop（与 ChatTimeline 中定义的 thinking 类型一致）
- Agent 分支的 `.agentBody` 内：先渲染 ThinkingCard（if thinking 存在），再渲染正文

**新增 import**：
```tsx
import ThinkingCard from './ThinkingCard';
```

**接口扩展**：
```tsx
interface ChatBubbleProps {
  role: 'user' | 'agent';
  senderName?: string;
  senderTag?: string;
  time?: string;
  content: string;
  avatarIcon?: boolean;
  thinking?: {                               // ← 新增
    steps: { text: string }[];
    toolCalls?: { label: string; name: string; status: 'success' | 'loading' | 'error' }[];
    items?: Array<
      | { type: 'step'; text: string }
      | { type: 'tool'; label: string; name: string; status: 'success' | 'loading' | 'error' }
    >;
  };
}
```

**Agent 渲染改动**（agentBody 内部）：
```tsx
<div className={styles.agentBody}>
  {/* 思考折叠区（嵌入气泡内部） */}
  {thinking && (
    <ThinkingCard
      steps={thinking.steps}
      toolCalls={thinking.toolCalls}
      items={thinking.items}
      defaultExpanded={false}
    />
  )}
  {/* 正文内容 */}
  {content.split('\n').map((line, i) => (
    <p key={i} className={styles.agentText}>{line}</p>
  ))}
</div>
```

---

##### 文件 4：`features/chat/ui/ChatBubble.module.scss` — **无需改动**

现有 `.agentBody` 的 `padding-left: 44px` 已经提供了正确的缩进。ThinkingCard 新样式无背景无边框，自然继承 agentBody 的布局。ThinkingCard 自带 `margin-bottom: 12px` 与正文隔开。

---

##### 文件 5：`features/chat/ui/ChatTimeline.tsx` — **删除 ThinkingCard 逻辑**

**改动要点**：
- 删除 `import ThinkingCard from './ThinkingCard'`
- 在两处 messages.map 中（<50 和 虚拟滚动路径），删除整个 `{msg.role === 'agent' && msg.thinking && (...)}` 块
- 将 `msg.thinking` 通过新 prop 传给 ChatBubble

**ChatBubble 调用改为**：
```tsx
<ChatBubble
  role={msg.role}
  senderName={msg.senderName}
  senderTag={msg.senderTag}
  time={msg.time}
  content={msg.content}
  avatarIcon={msg.role === 'agent'}
  thinking={msg.role === 'agent' ? msg.thinking : undefined}  // ← 新增
/>
```

---

##### 文件 6：`features/chat/ui/ChatTimeline.module.scss` — **删除 thinkingWrapper**

**删除**：
```scss
.thinkingWrapper {
  width: 100%;
  max-width: 640px;
}
```

---

##### 文件 7（不改）：`features/chat/ui/ToolCallCard.tsx` + `ToolCallCard.module.scss`

保持原样。ToolCallCard 的白底卡片样式在无背景的步骤列表中依然合适——它天然有边框和背景来区分自己，形成步骤文本与工具调用之间的视觉层次。

---

#### 验收标准

1. ✅ ThinkingCard 在 Agent 气泡**内部**（`.agentBody` 区域），位于正文上方
2. ✅ 折叠行无背景、无边框，只有文字 `◎ 思考了 N 步 ∧`
3. ✅ 展开后步骤用紫色圆点列表，无分隔线
4. ✅ ToolCallCard 嵌在步骤列表中，保留卡片样式
5. ✅ 折叠/展开动画：chevron 旋转 180°
6. ✅ 与 `.agentBody` 的 `padding-left: 44px` 缩进对齐
7. ✅ MockPreviewPage 中的 Mock 数据能正常渲染
8. ✅ 虚拟滚动路径和非虚拟路径都已更新

---

### Task 3.2 — 虚拟滚动健壮性修复

**目标**：修复虚拟滚动在消息高度不一致时的跳动问题。

**涉及文件**：
1. `features/chat/ui/ChatTimeline.tsx`
   - 将 `ESTIMATED_ITEM_HEIGHT` 和 `BUFFER_COUNT` 以及阈值 50 改为命名常量并注释
   - 添加 `resize` 事件监听，窗口变化时重算 visibleRange
   - 在虚拟化路径中，给每个消息行加 `ref` + `ResizeObserver` 记录实际高度到 `Map<string, number>`
   - 用实际高度（如有）替代估算值计算 topPadding / bottomPadding

**验收标准**：滚动时不出现明显跳动；窗口 resize 后可见范围正确更新。

---

## 第二批：P1 清理与补全

### Task 3.3 — 删除 SettingsModal 死代码
- 删除 `SettingsModal.tsx` 和 `SettingsModal.module.scss`
- 确认无其他引用

### Task 3.4 — 文件上传 / 语音按钮处理
- 文件附件按钮和语音按钮添加 `disabled` + tooltip "功能开发中"
- 或：完全隐藏（根据产品决策）

### Task 3.5 — MockPreviewPage 路由挂载
- `main.tsx` 添加 `/mock` 路由
- 仅在 `import.meta.env.DEV` 时启用

### Task 3.6 — CSS 变量回退值统一
- `MentionPopup.module.scss` 和 `FilePreviewBar.module.scss` 中的暗色回退值改为与浅色 tokens 一致
- 或在 `workbench.tokens.scss` 中补充 `--sb-bg-card`、`--sb-bg-hover` 定义

### Task 3.7 — WORKFLOW_LABEL_BY_KEY 去重
- 从 `run-list-projection.ts` 导出 `workflowLabel()` 函数
- `WorkbenchRuntimePage.tsx` 删除重复定义，改为 import

### Task 3.8 — 全局 button reset
- `globals.scss` 添加 button 元素 reset 样式

---

## 第三批：P2 增强（中期规划，按需执行）

### Task 3.9 — Agent 消息 Markdown 渲染
- 引入轻量 Markdown 解析
- ChatBubble 的 agentBody 支持富文本渲染

### Task 3.10 — ErrorBoundary 增强
- 添加友好错误 UI + 重试按钮

### Task 3.11 — Skeleton / Loading 状态
- 为聊天时间线和右侧面板添加骨架屏

### Task 3.12 — 设置持久化（大任务）
- 创建 SettingsStore
- localStorage 持久化
- 外观设置实际生效（主题模式、主题色、字号）
- ConnectionPage 对接真实 Runtime 状态

### Task 3.13 — ChartView 数据驱动化
- 根据 `planets` prop 动态计算行星位置并渲染

### Task 3.14 — 测试基础设施
- 为投影层（agent-group-projection, run-list-projection）添加 Vitest 单元测试
- 为 domain 层纯函数添加测试

---

## 执行建议

1. **Task 3.1 应最先执行**：这是用户提出的首要问题，设计方案已确定，涉及 6 个文件。
2. **Task 3.3-3.8 可批量执行**：都是小改动，可在一个 PR 中完成。
3. **Task 3.2 需谨慎**：虚拟滚动改动影响面广，建议独立 PR + 人工滚动测试。
4. **第三批任务按需启动**：优先做 Task 3.12（设置持久化），因为不持久化的设置页面对用户来说毫无意义。

---

## 下一步 Action

等待指令开始 Task 3.1 施工。方案已锁定，6 个文件改动明细已全部写清。
