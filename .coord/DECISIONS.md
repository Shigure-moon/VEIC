# Coordination Decisions

## 2026-07-13 - Repository Layout

- `server` remains an independent git repository.
- `veic-desktop` root is a meta repository for `soft`, coordination docs and scripts.
- Root `.gitignore` excludes `server/` to avoid accidentally committing the nested backend repo as a gitlink.
- Backend changes must be committed inside `server`.
- Desktop/client coordination changes are committed in the root meta repository.

## 2026-07-13 - API Contract

- `server/openapi.yaml` is the frontend contract.
- `soft/src/api/schema.ts` is generated and must not be edited manually.
- Frontend agents update `soft/src/api/client.ts` after OpenAPI regeneration.

## 2026-07-13 - Agent Roles

- `frontend-agent`: implements `soft`.
- `backend-agent`: implements `server`.
- `pm-agent`: monitors task state, status reports and stale work.
- `integrator`: resolves cross-stack contract issues and release gates.

