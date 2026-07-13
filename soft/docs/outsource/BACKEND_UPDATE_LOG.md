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

## 2026-07-13 - Server v2 backend baseline commit

Owner:
  backend-agent / Codex side.

OpenAPI:
  `server` commit `1ad51b7` (`VEIC-005 server: establish v2 backend baseline`)

Changed endpoints:
  - `GET /health/ready`
  - Workspace membership, invite, join request, leave/delete/member removal APIs
  - Resource publish, heartbeat, offline, release, endpoint release/disable APIs
  - Resource Twin desired/reported/observed/drift APIs
  - Capability provider policy APIs
  - Generic capability invocation execution event APIs
  - MCP server/tool/invocation lifecycle APIs
  - Transport plan, session, connection, relay allocation, overlay enrollment and device onboarding APIs

Frontend impact:
  - `soft` should run `npm run generate:api` before continuing API work.
  - Current desktop MVP can keep using the existing read paths.
  - Next frontend work should hydrate Resource Detail from twin/drift/capability/invocation APIs instead of relying only on Workspace snapshot.
  - LAN-only publishing remains invalid; UI should keep requiring overlay, IPv6 or relay endpoints.
  - Headscale overlay endpoints still require `machineId`.

Migration:
  - `cd soft`
  - `npm run generate:api`
  - Update `src/api/client.ts` only for endpoints the UI actually consumes.
  - Do not edit `src/api/schema.ts` manually.

Acceptance:
  - Backend verified with `python scripts\test_backend.py --suite contract`
  - Result: 50 contract tests passed.
  - Frontend handoff check: `npm run check`.

Notes:
  - Server `.veicrun.json` is ignored as local agent configuration.
  - `deploy/headscale/config/config.yaml` contains staging config only, no private key material.
  - Full `--suite all` was not rerun during this commit; contract suite is the baseline verification.

## 2026-07-13 - Post-baseline server commits, no OpenAPI contract delta

Owner:
  backend-agent / frontend-agent sync.

OpenAPI:
  Current `server` commit `70004dd` (`VEIC-011 server: add multi-turn runtime evaluation workflow`).
  `git diff 1ad51b7..70004dd -- openapi.yaml` returned no changes.

Changed endpoints:
  - None.

Backend commits reviewed:
  - `672ee0b` VEIC-006 server: upsert resource capabilities by key
  - `c4f8a01` VEIC-007 server: archive workspace events by retention policy
  - `d070b65` VEIC-008 server: guard maintenance with postgres lease
  - `70cddee` VEIC-009 server: export agent runtime trajectories
  - `8a91d69` VEIC-010 server: evaluate agent runtime trajectories
  - `70004dd` VEIC-011 server: add multi-turn runtime evaluation workflow

Frontend impact:
  - No new endpoint wrapper required.
  - Existing Resource Detail hydration remains aligned with the baseline OpenAPI.
  - Agent Runtime trajectory export/evaluation is currently backend tooling, not a desktop API surface.

Migration:
  - `scripts/coord/veic-coord.ps1 sync-api`
  - `scripts/coord/veic-coord.ps1 check -Area soft`

Acceptance:
  - `sync-api` passed.
  - `check -Area soft` passed.

Notes:
  - If Agent Runtime trajectory export/evaluation becomes user-facing, request a dedicated OpenAPI endpoint and update `src/api/client.ts` only after the contract lands.
