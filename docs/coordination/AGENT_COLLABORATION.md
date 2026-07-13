# VEIC Agent Collaboration System

This workspace uses a lightweight multi-agent workflow:

- Git for traceable changes.
- `.coord/tasks.json` for machine-readable task state.
- `scripts/coord/veic-coord.ps1` for task updates, reports and checks.
- `soft/docs/outsource` for external frontend handoff.
- `server` keeps its own git history and API contract.

## Roles

| Agent | Main scope | Writes production code |
| --- | --- | --- |
| `frontend-agent` | `soft` Tauri desktop app | Yes |
| `backend-agent` | `server` API and runtime | Yes |
| `pm-agent` | `.coord`, status reports, docs | Normally no |
| `integrator` | cross-stack fixes and release gates | Yes |

## Repository Model

```text
veic-desktop/          meta repo: soft + coordination docs/scripts
  .coord/
  docs/coordination/
  scripts/coord/
  soft/
  server/              separate git repo, ignored by meta repo
```

Do not add `server/` to the root meta repo. Commit backend work inside `server`.

## Branch Naming

Use task IDs in branches:

```text
agent/frontend/VEIC-001-split-soft-app
agent/backend/VEIC-010-runtime-records
agent/pm/VEIC-004-weekly-status
agent/integrator/VEIC-003-openapi-sync
```

## Commit Message Format

```text
VEIC-001 soft: split runtime panels
VEIC-010 server: add runtime records endpoint
VEIC-004 pm: refresh project status
```

## Coordination Rules

- Claim a task before editing.
- One agent owns one task at a time unless explicitly paired.
- Do not edit the same files as another active task without coordinating in task notes.
- Backend API changes must update OpenAPI before frontend adaptation.
- Frontend must not add mock data to bypass missing backend behavior.
- PM agent should flag stale tasks, blocked tasks and missing checks.

## Daily Loop

```powershell
scripts/coord/veic-coord.ps1 status
scripts/coord/veic-coord.ps1 claim -TaskId VEIC-001 -Owner frontend-agent
scripts/coord/veic-coord.ps1 start -TaskId VEIC-001 -Owner frontend-agent
# work
scripts/coord/veic-coord.ps1 check -Area soft
scripts/coord/veic-coord.ps1 done -TaskId VEIC-001 -Owner frontend-agent -Note "Split shell/workspace/timeline components."
scripts/coord/veic-coord.ps1 report
```

