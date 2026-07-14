# 当前实现状态

Updated: 2026-07-14

## 已实现

### Shell

- Tauri 2 桌面壳；
- React/Vite/TypeScript；
- 默认后端地址 `https://api.veic.tech`；
- 状态栏显示 Shell/API/DB/Workspace/Timeline 状态；
- Windows NSIS 安装包可构建。

### Auth

- 登录；
- token 写入 native keychain；
- 启动时恢复登录；
- logout 清理 token 和本地状态。

### Backend health

- `/health`；
- `/health/ready`；
- API Base URL 保存；
- Health check 状态展示。

### Workspace

- Workspace 列表；
- Workspace 选择；
- Workspace 详情；
- Workspace state snapshot；
- 最近选择 Workspace 本地保存。

### Runtime probe

- 本机 hostname、username、OS、arch；
- LAN IPv4/IPv6 hints；
- stableResourceId；
- Tailscale/Headscale status 检测；
- overlay address 与 machineId 自动填充。

### Resource lifecycle

- 发布 runtime resource；
- heartbeat；
- offline；
- Resource Explorer 第一版；
- endpoint/capability/twin 摘要展示。
- Resource Detail 只读 hydrate：
  - `GET /resources/{resourceId}/capabilities`；
  - `GET /resources/{resourceId}/twin`；
  - `GET /resources/{resourceId}/twin/drifts`；
  - `GET /invocations?resourceId=`；
  - `GET /invocations/{capabilityInvocationId}/execution-events`。

### Resource Twin Detail

- 独立只读面板；
- 展示 selected Resource 的 desired / reported / observed 三个分区；
- 展示 active drift 数量；
- 展示 Drift Timeline；
- API error / loading / ready 状态可见；
- 不执行 mutation。

### Timeline

- `/events/wait` long poll；
- `/sync?afterRevision=` 手动同步；
- revision cursor 保存；
- workspace_event_cache SQLite；
- Timeline 清空；
- Runtime Log。

### Runtime Records

- `GET /runtime-records` 只读拉取；
- 当前 Workspace / 当前 Resource 过滤；
- 可附带 execution events；
- 用于 Workspace Search 溯源，不执行任何 capability。

### Workspace Search

- 本地只读搜索入口；
- 搜索范围：
  - Workspace；
  - Members；
  - Resources / Endpoints / Capabilities；
  - 当前选中 Resource 的 Twin / Drift / Invocations / Execution Events；
  - Runtime Records / Runtime Record execution events；
  - Timeline events；
  - Runtime logs；
- 不调用 LLM；
- 不编造答案；
- 结果显示 source、time/revision/meta；
- Resource 相关命中只打开本地 Resource detail，不执行 invocation。

### Command Palette

- `Ctrl+K` 全局命令入口；
- 本地索引 Resource；
- 本地索引 Capability；
- 支持打开 Resource detail；
- Capability 结果只写入本地 command intent log；
- 拉取 `GET /workspaces/{workspaceId}/policies/providers` 做只读 provider policy 预检；
- 预检展示 Provider disabled / Role blocked / Risk blocked / Needs session / Policy OK；
- 预检会结合当前用户 Workspace role 和 active session 状态；
- 不执行 invocation；
- 不绕过后端 provider policy。

### Smoke Tests

- Vitest + Testing Library + jsdom；
- `npm run test:run`；
- soft CI workflow；
- API client mock smoke；
- keychain token fallback smoke；
- WorkspaceList 渲染 smoke；
- App 401 启动恢复 logout state smoke。

## 尚未实现

- Workspace 创建/加入/审批 UI；
- Resource invite/onboarding UI；
- Capability invocation UI；
- 后端 command intent 持久化入口；
- MCP server/tool UI；
- Simulation；
- Agent Goals/Tasks/Notices；
- Runtime installer/repair UI；
- 真正的 Headscale/Tailscale 安装封装；
- 自动 relay fallback 客户端执行链；
- E2E UI 自动测试。

## 当前风险

- `src-tauri/src/main.rs` 也会继续膨胀，需要按 cache/keychain/probe/window 拆模块；
- Timeline 目前用 long-poll，不是 SSE；
- 本地 runtime probe 依赖 `tailscale` CLI 是否存在；
- API 错误展示还比较原始。

## 下一阶段建议任务

1. 补 Capability invocation 只读详情入口。
2. 等 server 暴露 command intent API 后，把 Command Palette 本地 intent log 升级为后端 intent 记录。
3. M9 阶段补 Playwright/Cypress E2E smoke。
