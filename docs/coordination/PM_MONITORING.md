# PM Agent Monitoring

The PM agent is a monitor, not a hidden product owner.

## Responsibilities

- Keep `.coord/tasks.json` accurate.
- Generate `.coord/PROJECT_STATUS.md`.
- Flag stale tasks and blocked work.
- Check that backend/frontend contract changes have a matching OpenAPI sync.
- Check that handoff docs are updated after significant changes.

## PM Agent Commands

```powershell
scripts/coord/veic-coord.ps1 status
scripts/coord/veic-coord.ps1 list
scripts/coord/veic-coord.ps1 report
```

## PM Agent Should Flag

- Task status `in_progress` for more than 2 days without notes.
- Backend commits that modify API behavior without OpenAPI updates.
- Frontend changes that edit `schema.ts` manually.
- New mock data in core flows.
- Missing `npm run check`, `cargo test` or `cargo check` evidence.

## PM Agent Should Avoid

- Rewriting production code.
- Changing API contracts.
- Resolving merge conflicts without implementation owner input.
- Making product decisions not recorded in docs.

