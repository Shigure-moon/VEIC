# Backend / Frontend Sync Protocol

## Source of Truth

Backend contract:

```text
server/openapi.yaml
```

Frontend generated types:

```text
soft/src/api/schema.ts
```

Frontend API wrapper:

```text
soft/src/api/client.ts
```

## Required Flow For API Changes

1. Backend agent changes server implementation.
2. Backend agent updates `server/openapi.yaml`.
3. Backend agent commits inside `server`.
4. Integrator or frontend agent runs:

```powershell
scripts/coord/veic-coord.ps1 sync-api
```

5. Frontend agent updates `soft/src/api/client.ts`.
6. Frontend agent updates UI.
7. PM agent records status in `.coord/PROJECT_STATUS.md`.

## What Must Be Included In Backend Handoff

- Endpoint method/path.
- Request schema.
- Response schema.
- Auth and workspace role requirement.
- Event written to `workspace_events`, if any.
- Expected 400/401/403/404/409 cases.
- Whether the change is backward-compatible.

## Frontend Red Lines

- Do not edit `soft/src/api/schema.ts` manually.
- Do not call backend endpoints directly from components.
- Do not hide API errors with generic success UI.
- Do not create fake Workspace/Resource/Capability data.

