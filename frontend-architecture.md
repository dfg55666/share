# Sbird-ui 前端架构文档

> 最后更新：2026-05-07

## 1. 项目概览

Sbird-ui 是 Sbird 平台的 Web 工作台前端，用于实时展示 AI Agent 引擎的运行时间线（Timeline）、管理多线程对话（Thread）、发送消息并处理服务端请求。

### 技术栈

| 层面 | 选型 |
|------|------|
| 框架 | React 18 (StrictMode) |
| 语言 | TypeScript 5.6 |
| 构建 | Vite 6 |
| 样式 | SCSS Modules |
| 图标 | lucide-react |
| 状态管理 | 自研 Runtime Store（基于 `useSyncExternalStore`） |
| 实时通信 | SSE (EventSource) |

### 无外部状态库

项目**不使用** Redux / Zustand / MobX 等第三方状态库，而是用一个手写的 `AppRuntime` 类 + `useSyncExternalStore` 桥接 React。

---

## 2. 目录结构

```
Sbird-ui/src/
├── main.tsx                    # 入口，挂载 WorkbenchRuntimePage
├── api/                        # 网络层（HTTP + SSE）
│   ├── ApiClient.ts            # fetch 封装（GET/POST, 超时, 错误提取）
│   ├── RuntimeApi.ts           # URL 模板构建（路径解析）
│   ├── EventStream.ts          # SSE 事件流封装
│   ├── contracts.ts            # 所有前后端共享类型定义
│   └── index.ts                # barrel export
├── domain/                     # 纯逻辑域层（无 IO、无 React）
│   ├── timeline/               # Timeline 状态归约器
│   │   ├── index.ts            # normalizeTimelineItem, applyTimelineEvent, fromSnapshot...
│   │   └── history_count.ts    # 历史计数工具
│   ├── input/                  # PendingInputEntry 类型
│   ├── server-request/         # ServerRequestReply 构建
│   └── index.ts
├── runtime/                    # 应用运行时（核心状态机）
│   ├── AppRuntime.ts           # 顶层状态容器 + 协调器
│   ├── AppServerSession.ts     # 服务端会话层（HTTP 调用封装）
│   ├── RuntimeStore.ts         # useSyncExternalStore 桥接 hook
│   ├── LargePayloadStore.ts    # 大体积内容延迟加载
│   ├── ThreadTimelineCache.ts  # Timeline 本地缓存
│   ├── TimelineWindowing.ts    # 虚拟滚动 / 窗口裁剪
│   ├── controllers/            # 功能子控制器
│   │   ├── LiveSyncController.ts      # SSE 连接 + 重连 + 同步状态机
│   │   ├── ThreadCatalogController.ts # 线程列表管理
│   │   ├── TimelineController.ts      # Timeline 读写 + 缓存
│   │   └── TurnController.ts          # 消息发送 + 中断 + 回滚 + 队列
│   ├── internal/               # 内部实现细节
│   │   ├── app_event.ts / app_event_sender.ts
│   │   ├── app_server_adapter.ts
│   │   ├── app_server_requests.ts
│   │   ├── app_backtrack.ts
│   │   ├── agent_navigation.ts
│   │   ├── loaded_threads.ts
│   │   └── pending_interactive_replay.ts
│   ├── headless/               # TUI 终端渲染层（非 Web 使用）
│   │   ├── bottom_pane/        # 底部面板各子视图
│   │   ├── chatwidget/         # 聊天组件 headless 逻辑
│   │   ├── render/             # 终端渲染引擎（颜色、diff、markdown…）
│   │   └── streaming/          # 流式分块控制器
│   └── index.ts
├── features/                   # 按业务功能切分的 Feature 模块
│   ├── workbench/              # 页面入口 + 业务编排
│   ├── chat/                   # 聊天区域组件
│   ├── threads/                # 侧边栏线程列表
│   ├── panel/                  # 右侧面板（图表/摘要）
│   └── session/                # 布局壳
└── ui/                         # 通用 UI 基础组件
    ├── primitives/             # Avatar, Badge, Button, IconButton, Panel
    └── styles/                 # 全局样式 + 设计 Token
```

---

## 3. 分层架构

```
┌─────────────────────────────────────────────────┐
│                  features/                        │  ← React 组件层
│   workbench │ chat │ threads │ panel │ session   │
└────────────────────────┬────────────────────────┘
                         │ useWorkbenchRuntime()
┌────────────────────────▼────────────────────────┐
│                  runtime/                         │  ← 状态机层
│   AppRuntime (状态容器 + 事件分发)                 │
│   ├─ LiveSyncController   (SSE 实时同步)         │
│   ├─ ThreadCatalogController (线程目录)          │
│   ├─ TimelineController   (时间线读写)           │
│   └─ TurnController       (消息轮次)            │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│                  domain/                          │  ← 纯逻辑层
│   timeline 归约 │ server-request 构建 │ input    │
└────────────────────────┬────────────────────────┘
                         │
┌────────────────────────▼────────────────────────┐
│                  api/                             │  ← 网络 IO 层
│   ApiClient (fetch) │ EventStream (SSE)          │
└─────────────────────────────────────────────────┘
```

---

## 4. Runtime 状态模型

### 4.1 核心状态 (`AppRuntimeState`)

```typescript
type AppRuntimeState = {
  threads: ThreadSummary[];                          // 所有线程摘要
  selectedThreadId: string;                          // 当前选中线程
  projectDisplayNameById: Record<string, string>;    // 项目显示名映射
  timelineByThreadId: Record<string, TimelineMutableState>; // 各线程时间线
  syncByThreadId: Record<string, ThreadSyncState>;   // 各线程同步状态
  error: string;                                     // 全局错误信息
  warning: string;                                   // 全局警告信息
  flags: RuntimeFlags;                               // 加载/发送等标志位
};
```

### 4.2 同步状态机 (`ThreadSyncPhase`)

```
hydrating ──→ live ──→ live_degraded
     ↑          │
     └──────────┴──→ resync_required ──→ live
```

| 阶段 | 含义 |
|------|------|
| `hydrating` | 正在回填历史事件，发送被阻塞 |
| `live` | 正常实时同步 |
| `resync_required` | 需要重建基线，发送被阻塞 |
| `live_degraded` | 同步不完整但仍可操作 |

### 4.3 状态订阅机制

```typescript
// AppRuntime 暴露 subscribe/getState，符合 React 外部 Store 协议
class AppRuntime {
  subscribe(listener: (state) => void): () => void;
  getState(): AppRuntimeState;
}

// React 侧用 useSyncExternalStore 桥接
function useRuntimeStore(store): AppRuntimeState {
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(() => onStoreChange()),
    () => store.getState(),
  );
}
```

**数据流向**：`Server Event → AppRuntime.applyThreadEvent → patchState → emit → React re-render`

---

## 5. API 网络层

### 5.1 HTTP 客户端 (`ApiClient`)

- 基于原生 `fetch`，无第三方 HTTP 库
- 统一 `/api` 前缀
- 内置 30s 超时（AbortController）
- 自动 JSON 序列化/反序列化
- 错误消息提取（支持 `error` / `message` / `status` 字段）

### 5.2 REST 端点

| 方法 | 路径模板 | 用途 |
|------|----------|------|
| GET | `/runs` | 获取运行列表 |
| GET | `/runs/{runId}/read` | 读取运行基线快照 |
| POST | `/threads/{threadId}/turn/send` | 发送消息 |
| POST | `/threads/{threadId}/turn/context/override` | 覆盖轮次上下文（模型/effort） |
| POST | `/threads/{threadId}/interrupt` | 中断当前轮次 |
| POST | `/threads/{threadId}/rollback` | 回滚 N 轮 |
| POST | `/threads/{threadId}/rename` | 重命名线程 |
| POST | `/threads/{threadId}/archive` | 归档线程 |
| POST | `/threads/{threadId}/fork` | 分叉线程 |
| POST | `/threads/{threadId}/server-requests/respond` | 响应服务端请求 |

### 5.3 SSE 实时推送

- 连接地址：`GET /api/runs/{runId}/notifications`
- 事件格式：`EventSource`，支持 `message` 和 `timeline` 两种事件名
- 每条事件携带 `threadId` 用于路由到对应线程
- 支持批量事件（`{ events: [...] }`）
- 断线自动重连（指数退避：1s ~ 10s）

---

## 6. 控制器职责

| 控制器 | 职责 |
|--------|------|
| `LiveSyncController` | 管理 SSE 连接生命周期、重连策略、同步阶段转换 |
| `ThreadCatalogController` | 线程列表加载/选中/缓存水合/runId 映射 |
| `TimelineController` | 时间线快照加载、增量事件归约、大负载延迟加载、本地缓存持久化 |
| `TurnController` | 消息发送队列、乐观 UI、中断/回滚、服务端请求响应、待处理输入管理 |

---

## 7. Feature 组件树

### 7.1 页面入口

```
main.tsx
└── <WorkbenchRuntimePage />     ← features/workbench/
    ├── useWorkbenchRuntime()     ← 唯一状态桥接 hook
    └── <WorkbenchShell />        ← 三栏布局壳
        ├── sidebar: <WorkbenchSidebar />
        ├── chat:
        │   ├── <ChatHeader />
        │   ├── <ChatTimeline />
        │   └── <ChatComposerPanel />
        └── panel: <RightPanel />
```

### 7.2 各 Feature 职责

| Feature | 路径 | 组件 | 说明 |
|---------|------|------|------|
| **workbench** | `features/workbench/` | `WorkbenchRuntimePage` | 页面编排、运行时桥接 |
| **session** | `features/session/` | `WorkbenchShell` | 纯布局壳（sidebar / chat / panel 三栏） |
| **threads** | `features/threads/` | `WorkbenchSidebar`, `ThreadList`, `SubjectList` | 导航 + 运行列表 + 主题列表 |
| **chat** | `features/chat/` | `ChatHeader`, `ChatTimeline`, `ChatBubble`, `ChatComposerPanel`, `ThinkingCard`, `ToolCallCard` | 聊天区域全部 UI |
| **panel** | `features/panel/` | `RightPanel`, `ChartView`, `SummaryCard` | 右侧面板（图表/摘要/导出） |

### 7.3 投影层 (`model/`)

Feature 组件**不直接读取** `AppRuntimeState`，而是通过投影函数将原始状态转换为视图模型：

```
AppRuntimeState
    │
    ├─ projectRunList()                 → RunListProjection (侧边栏分组)
    │   输入: runs + threads + selectedThreadId
    │   输出: groups[], selectedRunId, runIdToThreadId, runById
    │
    └─ projectTimelineMessages()        → WorkbenchTimelineMessage[] (聊天气泡)
        输入: selectedRun + timelineByThreadId + fallbackTimeline
        输出: 扁平化消息数组（含 thinking/toolCalls 展开）
```

#### `RunListProjection`

将引擎运行列表按 `workflowKey`（如 `yinzhan`/`liuyao`）分组，生成侧边栏的 `ThreadGroup[]` 结构。

#### `WorkbenchTimelineMessage`

```typescript
type WorkbenchTimelineMessage = {
  id: string;
  role: 'user' | 'agent';
  senderName: string;
  senderTag?: string;
  time: string;
  content: string;
  thinking?: {
    steps: { text: string }[];
    toolCalls?: { label: string; name: string; status: ToolCallStatus }[];
    items?: ThinkingTimelineItem[];
  };
};
```

投影逻辑（`agent-group-projection.ts`）会：
1. 收集 Run 下所有 Agent 线程的 Timeline 条目
2. 按 `displaySeq` + 时间排序
3. 将连续同 Agent 的非用户条目聚合为一个 Segment
4. 每个 Segment 生成一条带 `thinking` 折叠的消息气泡
5. 用户消息按 `turnId` 去重（多 Agent 线程共享同一用户输入）

---

## 8. UI 基础层

### 8.1 Primitives (`ui/primitives/`)

| 组件 | 说明 |
|------|------|
| `Avatar` | 头像（支持颜色/文字） |
| `Badge` | 标签/徽章 |
| `Button` | 通用按钮 |
| `IconButton` | 图标按钮 |
| `Panel` | 卡片面板容器 |

### 8.2 样式体系

- **SCSS Modules**：每个组件一个 `*.module.scss`，样式完全隔离
- **Design Tokens**：`workbench.tokens.scss` 定义颜色/间距/圆角等变量
- **全局样式**：`globals.scss` 仅 reset + 字体

---

## 9. 数据流总览

```
┌──────────┐  SSE events    ┌─────────────┐  applyEvent   ┌──────────────┐
│  Server  │ ──────────────→│ LiveSync    │ ─────────────→│  AppRuntime  │
│  Engine  │                │ Controller  │               │  (state)     │
└──────────┘                └─────────────┘               └──────┬───────┘
     ↑                                                           │ emit()
     │  POST /turn/send                                          ↓
     │                                               useSyncExternalStore
     │                                                           │
┌────┴─────┐  sendMessage()  ┌─────────────┐  projection   ┌────▼────────┐
│  Turn    │ ←───────────────│ Workbench   │ ←─────────────│   React     │
│Controller│                 │ RuntimePage │               │  Components │
└──────────┘                 └─────────────┘               └─────────────┘
```

1. **Engine → UI**：Server 通过 SSE 推送 `UiTimelineEvent`
2. **LiveSyncController** 路由事件到对应 `threadId`
3. **AppRuntime** 用 domain 层的归约器更新 `TimelineMutableState`
4. **React** 通过 `useSyncExternalStore` 订阅状态变更
5. **投影函数** 将原始状态转化为视图模型
6. **UI → Engine**：用户发消息经 `TurnController` → `AppServerSession` → HTTP POST

---

## 10. 关键设计决策

| 决策 | 理由 |
|------|------|
| 自研 Runtime 而非 Redux | 需要精细控制 SSE 重连、同步状态机、乐观更新等复杂逻辑 |
| 投影层与组件分离 | 投影函数纯粹可测试，组件保持薄壳 |
| SCSS Modules 而非 CSS-in-JS | 构建性能好、无运行时开销、与 Vite 原生集成 |
| 极简依赖（仅 react + lucide） | 减少包体积、降低升级风险 |
| Headless 终端渲染层并存 | 同一 runtime 逻辑可驱动 Web UI 和 CLI TUI 两套界面 |
| `displaySeq` 排序而非时间戳 | 保证事件顺序与 Engine 一致，避免时钟偏移 |

---

## 11. 扩展指南

### 添加新 Feature

1. 在 `features/` 下创建目录，结构为 `ui/` + `model/`（如需投影）
2. 组件通过 `useWorkbenchRuntime()` 获取所有状态
3. 用投影函数将 `AppRuntimeState` 转化为视图模型
4. 用 SCSS Module 编写样式

### 添加新 API 端点

1. 在 `api/contracts.ts` 定义请求/响应类型
2. 在 `AppServerSession.ts` 添加调用方法
3. 在对应 Controller 中编排调用逻辑

### 添加新事件类型

1. 在 `domain/timeline/index.ts` 的 `applyTimelineEvent` 中添加归约分支
2. 在 `agent-group-projection.ts` 中处理新条目类型的投影逻辑
