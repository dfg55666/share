# Domain Layer Rules

- `domain/` 只允许纯类型与纯函数。
- 禁止网络请求、IndexedDB、定时器、EventSource、副作用状态机。
- `domain/` 不持有 React state，也不引用 runtime singleton。
