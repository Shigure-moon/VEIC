# 后端更新同步流程

外包团队可以做前端和 Tauri 客户端，但后端合同必须集中同步，不能靠猜。

## 总原则

```text
server/openapi.yaml is the contract.
Frontend follows the contract.
Backend changes are synchronized before UI implementation.
```

如果接口不存在，前端不能自行 mock 成“已完成”。应该提交接口需求，由后端更新 OpenAPI 后再实现。

## 后端更新进入前端的标准流程

1. 后端完成实现或至少确认 API 合同。
2. 后端更新：

```text
E:\workspace\veic-ui\veic-desktop\server\openapi.yaml
```

3. 前端执行：

```powershell
cd E:\workspace\veic-ui\veic-desktop\soft
npm run generate:api
```

4. 前端只在 `src/api/client.ts` 增加薄封装。
5. UI 组件调用 `src/api/client.ts`。
6. 跑：

```powershell
npm run check
npm run build
```

7. 涉及 Tauri 时跑：

```powershell
cd src-tauri
cargo check
```

## 后端需求模板

外包团队需要新增后端能力时，按这个格式提交：

```text
Title:
  Short feature name.

User flow:
  The exact UI action that needs backend support.

Current API gap:
  Which existing endpoint is insufficient or missing.

Proposed endpoint:
  Method + path + request + response.

Auth and policy:
  Who can call it, workspace role requirement, resource ownership rule.

Events:
  Should this write workspace_events? Which eventType and payload?

State impact:
  Which resource/session/capability/twin/runtime record changes?

Failure cases:
  Expected 400/401/403/404/409 behavior.

Frontend fallback:
  What the UI should show while this API is missing.
```

## 当前已接 API

当前 `soft` 已直接使用：

| Feature | API |
| --- | --- |
| Health | `GET /health`, `GET /health/ready` |
| Login | `POST /api/v2/auth/login` |
| Current user | `GET /api/v2/auth/me` |
| Workspace list | `GET /api/v2/workspaces` |
| Workspace detail | `GET /api/v2/workspaces/{workspaceId}` |
| Workspace snapshot | `GET /api/v2/workspaces/{workspaceId}/state` |
| Workspace sync | `GET /api/v2/workspaces/{workspaceId}/sync` |
| Event wait | `GET /api/v2/workspaces/{workspaceId}/events/wait` |
| Publish resource | `POST /api/v2/workspaces/{workspaceId}/resources/publish` |
| Resource heartbeat | `POST /api/v2/workspaces/{workspaceId}/resources/{resourceId}/heartbeat` |
| Resource offline | `POST /api/v2/workspaces/{workspaceId}/resources/{resourceId}/offline` |

## 当前前端等待的后端能力

这些属于后续可推进项，不能在前端假装完成：

- normalized runtime records endpoint；
- runtime causality edge endpoint；
- workspace facts/search endpoint；
- participant presence endpoint；
- command intent endpoint；
- simulation run/event endpoint；
- goal/plan endpoint；
- notice endpoint；
- resource invocation history hydration；
- resource twin drift detail hydration。

## 我方同步角色

后端更新由项目 owner/Codex 侧统一同步给外包团队：

- 给出 OpenAPI diff；
- 说明新增/废弃 endpoint；
- 说明权限和事件语义；
- 标记前端需要改的 `client.ts` 方法；
- 标记验收路径。

外包团队不应绕过该流程直接修改后端生产语义。

