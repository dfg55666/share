# Task 3 — 施工计划

> 基于 Task 2 审查报告制定
> 按优先级排序，可逐步执行
> 2026-05-08 更新：Task 3.1 方案经讨论确定为「极简内联折叠行」风格

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
