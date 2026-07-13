# 当前实现状态

Updated: 2026-07-13

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

### Timeline

- `/events/wait` long poll；
- `/sync?afterRevision=` 手动同步；
- revision cursor 保存；
- workspace_event_cache SQLite；
- Timeline 清空；
- Runtime Log。

## 尚未实现

- Workspace 创建/加入/审批 UI；
- Resource invite/onboarding UI；
- Resource Twin 独立详情页；
- Capability invocation UI；
- MCP server/tool UI；
- Invocation execution events hydration；
- Workspace Search；
- Command Palette；
- Simulation；
- Agent Goals/Tasks/Notices；
- Runtime installer/repair UI；
- 真正的 Headscale/Tailscale 安装封装；
- 自动 relay fallback 客户端执行链；
- E2E UI 自动测试。

## 当前风险

- `App.tsx` 已经偏大，继续加功能前应拆分组件和 hooks；
- `src-tauri/src/main.rs` 也会继续膨胀，需要按 cache/keychain/probe/window 拆模块；
- Timeline 目前用 long-poll，不是 SSE；
- Resource Explorer 只使用 snapshot，不主动 hydrate twin drift/history；
- 本地 runtime probe 依赖 `tailscale` CLI 是否存在；
- API 错误展示还比较原始。

## 下一阶段建议任务

1. 拆分 `App.tsx`。
2. 做 Workspace Search 的本地只读版本。
3. 增加 Command Palette 骨架，但只生成本地 command intent 日志，不执行高风险动作。
4. 补 Resource Detail 页面，接 twin/drift/history 接口。
5. 补最小 UI smoke test。

