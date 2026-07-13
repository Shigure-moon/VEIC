# VEIC Desktop Workspace Docs

This directory contains the first planning package for the VEIC Tauri desktop app.

The product direction is:

```text
Do not design a chatbot. Design a world.
```

The desktop app should feel like a persistent Workspace operating environment for humans, agents and physical resources. Chat is a tool inside the Workspace, not the product shell.

## Documents

- [Outsource Handoff](outsource/README.md)
- [P3 Database Tables](database/P3_DATABASE_TABLES.md)
- [P3 Server Authoritative SQL](database/p3_server_authoritative.sql)
- [P3 Tauri Local Cache SQL](database/p3_tauri_local_cache.sql)
- [C4 Architecture](c4/ARCHITECTURE.md)
- [Project Plan](PROJECT_PLAN.md)

## Outsource Package

- [Onboarding](outsource/ONBOARDING.md)
- [Development Guide](outsource/DEVELOPMENT_GUIDE.md)
- [Backend Sync](outsource/BACKEND_SYNC.md)
- [Backend Update Log](outsource/BACKEND_UPDATE_LOG.md)
- [Current State](outsource/CURRENT_STATE.md)
- [Acceptance](outsource/ACCEPTANCE.md)
- [Task Board](outsource/TASK_BOARD.md)

## Inputs Used

- `E:\workspace\veic-ui\veic-desktop\server`
  - `docs/CONTROL_PLANE_ROADMAP.md`
  - `docs/WORLD_MODEL_READY.md`
  - `docs/RESOURCE_TWIN.md`
  - `migrations/0001_core.sql` through `migrations/0012_reconcile_controllers.sql`
  - domain DTOs under `src/domain`
- `E:\workspace\veic-ui\veic-desktop\veicApiWeb`
  - React/Vite structure
  - JetBrains Mono typography
  - black monochrome visual system
  - Bayer/WebGL background and restrained 8px-radius panels
