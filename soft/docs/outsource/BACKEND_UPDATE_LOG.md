# 后端更新同步日志

这个文件用于记录从后端同步给 `soft` 外包团队的接口变化。每次后端 API 合同变化后，先更新这里，再安排前端适配。

## 使用方式

每次新增一条：

```text
## YYYY-MM-DD - Short title

Owner:
  Who confirmed the backend change.

OpenAPI:
  Which openapi.yaml revision or commit.

Changed endpoints:
  - METHOD /path

Frontend impact:
  - Which screen/component/client method should change.

Migration:
  - npm run generate:api
  - Update src/api/client.ts
  - Update UI state/error handling

Acceptance:
  - How to verify this in soft.

Notes:
  - Risk, compatibility, rollout order.
```

## 2026-07-13 - Current baseline

Owner:
  Project owner / Codex side.

OpenAPI:
  `E:\workspace\veic-ui\veic-desktop\server\openapi.yaml`

Currently consumed endpoints:

- `GET /health`
- `GET /health/ready`
- `POST /api/v2/auth/login`
- `GET /api/v2/auth/me`
- `GET /api/v2/workspaces`
- `GET /api/v2/workspaces/{workspaceId}`
- `GET /api/v2/workspaces/{workspaceId}/state`
- `GET /api/v2/workspaces/{workspaceId}/sync`
- `GET /api/v2/workspaces/{workspaceId}/events/wait`
- `POST /api/v2/workspaces/{workspaceId}/resources/publish`
- `POST /api/v2/workspaces/{workspaceId}/resources/{resourceId}/heartbeat`
- `POST /api/v2/workspaces/{workspaceId}/resources/{resourceId}/offline`

Frontend impact:

- Current client methods already exist in `src/api/client.ts`.
- UI uses real API only.
- Timeline uses long-poll rather than SSE.

Acceptance:

- `npm run check`
- `npm run build`
- Login to real API.
- Select Workspace.
- Probe runtime.
- Publish Resource with overlay/IPv6/relay endpoint.
- Observe Timeline and Resource Explorer.

Notes:

- LAN-only Resource publish is intentionally rejected by backend.
- Headscale overlay endpoint requires `machineId`.
- Missing future APIs must go through `BACKEND_SYNC.md`.

