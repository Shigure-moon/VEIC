# VEIC Desktop Workspace Project Plan

## Objective

Build a Tauri desktop app that feels like a persistent operating environment for a physical-world Workspace.

The app should not lead with chat. It should lead with presence, state, resources, events, simulation and command.

```text
Workspace is the product.
Chat is one tool inside it.
```

## Product Shape

The first screen after installation should communicate that the Workspace is already alive:

- connected state;
- public/local/home workspaces;
- people, agents, robots, resources and capabilities;
- last invocation and current timeline activity;
- proactive notices;
- command palette access.

The primary navigation:

- Workspace
- Resources
- Agents
- History
- Simulation
- Tasks
- Settings

The global affordances:

- status bar: connected, robots, agents, resources, watching;
- bottom-right Workspace Search: "Ask Workspace...";
- `Ctrl+K` Command Palette;
- live Timeline as event stream, not message stream.

## Visual Direction

Follow `veicApiWeb`:

- JetBrains Mono as the main typeface;
- black background and monochrome panels;
- 8px radius or less;
- thin hairlines and dense information;
- Bayer/WebGL texture as environmental background where useful;
- no marketing hero, no SaaS cards as the main product surface;
- restrained motion that suggests live state without distracting from operations.

For the desktop app, prefer operational density over a landing-page composition. The app should feel closer to VSCode plus flight recorder plus control room than ChatGPT or an enterprise dashboard.

## Technical Baseline

| Layer | Choice |
| --- | --- |
| Desktop shell | Tauri |
| UI | React + TypeScript + Vite, aligned with `veicApiWeb` |
| Server API | `E:\workspace\veic-ui\veic-desktop\server` |
| Server contract | `server/openapi.yaml` |
| Local cache | SQLite behind Tauri Rust commands |
| Auth secret storage | OS keychain or platform secure storage; local DB stores only references |
| Live updates | Server SSE event stream plus `/sync?afterRevision=` fallback |
| Packaging | Tauri platform bundles after MVP UI/API loop is stable |

## Current Implementation Snapshot

Updated: 2026-07-13

| Area | Status |
| --- | --- |
| Tauri shell | Implemented first pass |
| API client | Implemented from `server/openapi.yaml` |
| Auth persistence | Implemented with native secure-token boundary |
| Workspace selection | Implemented |
| Runtime log | Implemented with local SQLite cache |
| Health check | Implemented |
| Runtime probe | Implemented, including Tailscale/Headscale overlay detection where available |
| Resource publish / heartbeat / offline | Implemented first pass |
| Timeline live sync | Implemented with long-poll `/events/wait` plus `/sync` cursor cache |
| Resource Explorer | Implemented first pass from Workspace state snapshot |
| C4 documentation | SVG diagrams are the primary rendered diagrams |

Progress estimate:

- Current `soft` desktop MVP: about 42%.
- Full P3 Agent Runtime desktop vision: about 24%.

## Milestones

### M0 - Planning Package

Status: this document set.

Deliverables:

- P3 database table plan;
- C4 architecture diagrams;
- implementation roadmap;
- local cache boundary.

Exit criteria:

- the app has a stable product direction;
- server P3 additions are separated from desktop local cache;
- the first implementation pass can start without inventing architecture in the UI code.

### M1 - Tauri Shell and API Foundation

Scope:

- scaffold Tauri app in `soft`;
- reuse `veicApiWeb` font/assets/style primitives where legally and technically appropriate;
- configure React/Vite/TypeScript;
- implement API base URL configuration;
- implement login/session bootstrap against server auth;
- implement local SQLite cache and keychain-token boundary;
- implement app status bar and persistent shell.

Exit criteria:

- app launches as a desktop window;
- user can point it at local or staging API;
- auth works;
- workspace list loads;
- last workspace restores on restart.

### M2 - Workspace Entry and Presence

Scope:

- installation-complete style first-run screen;
- "Searching available workspaces..." state;
- workspace join/create flow;
- Workspace overview with counts:
  - people;
  - agents;
  - robots;
  - resources;
  - capabilities;
  - invocations today;
- live status bar.

Server APIs:

- `GET /api/v2/workspaces`
- `POST /api/v2/workspaces`
- `GET /api/v2/workspaces/{workspaceId}`
- `GET /api/v2/workspaces/{workspaceId}/state`

Exit criteria:

- opening the app feels like re-entering a running world;
- no chat panel dominates the first screen.

### M3 - Live Sync and Timeline

Scope:

- SSE connection to Workspace event stream;
- `/sync?afterRevision=` fallback;
- revision cursor persistence;
- Timeline page with event grouping;
- invocation execution event hydration;
- visible reconnect/offline states.

Server APIs:

- `GET /api/v2/workspaces/{workspaceId}/events/stream`
- `GET /api/v2/workspaces/{workspaceId}/events/wait`
- `GET /api/v2/workspaces/{workspaceId}/sync`
- `GET /api/v2/workspaces/{workspaceId}/invocations`
- `GET /api/v2/workspaces/{workspaceId}/invocations/{id}/execution-events`

Exit criteria:

- user can answer "what just happened?" from Timeline;
- timeline keeps updating without manual refresh;
- local cache can restore recent events on restart.

### M4 - Resource Explorer

Scope:

- VSCode-like tree:
  - Robots
  - Cameras
  - PLC
  - Sensors
  - Agents
  - Models
  - Users
- resource detail:
  - Identity
  - Resource
  - Capabilities
  - History
  - Current State
  - Recent Invocation
- Resource Twin partition view:
  - desired;
  - reported;
  - observed;
  - drift.

Server APIs:

- resource list and publish/read APIs;
- capability list/register/lifecycle APIs;
- twin get/update/drift APIs.

Exit criteria:

- every object has a consistent detail structure;
- resource state is not reduced to one status pill.

### M5 - Workspace Search

Scope:

- bottom-right "Ask Workspace..." entry;
- local-first query over cache:
  - workspace facts;
  - recent runtime records;
  - observations;
  - resource twin state;
  - invocation errors;
- answer format as trace:
  - Looking...
  - fact found;
  - event chain;
  - likely cause;
  - next available command.

Exit criteria:

- common questions such as "Why Robot A stopped?" answer from Workspace data;
- generated language never hides the source records.

### M6 - Command Palette

Scope:

- `Ctrl+K` global command palette;
- command index from resources and capabilities;
- target disambiguation:
  - Restart Robot A;
  - Restart Robot B;
  - Restart Camera;
  - Restart Agent;
- risk-aware route:
  - direct read-only action;
  - simulation first;
  - human approval;
  - real invocation.

Server APIs:

- capability invocation start/complete;
- provider policies;
- future `workspace_command_intents`.

Exit criteria:

- common operations are keyboard-first;
- high-risk commands do not jump straight to real-world movement.

### M7 - Simulation

Scope:

- Current World vs Prediction layout;
- run simulation from command, task or resource;
- prediction timeline;
- probability and risk summary;
- explicit copy: "No real robot moved.";
- store/reopen simulation runs.

Server APIs:

- future `simulation_runs`;
- future `simulation_events`;
- current invocation/runtime history as replay input.

Exit criteria:

- simulation is clearly separate from real invocation;
- a user can inspect predicted consequences before approval.

### M8 - Agent Goals, Tasks and Notices

Scope:

- Tasks page backed by goals and plans;
- Agent page showing active agents, current goals and recent plans;
- proactive notices:
  - battery anomaly;
  - drift detected;
  - failed invocation;
  - simulation available;
- notice actions can open simulation, resource detail or command palette.

Server APIs:

- future `agent_goals`;
- future `agent_plans`;
- future `workspace_notices`;
- existing controller/drift/invocation records.

Exit criteria:

- Workspace can initiate attention without becoming a chatbot;
- user sees what agents are trying to do and why.

### M9 - Hardening and Packaging

Scope:

- error and offline states;
- secure token handling;
- cache migration strategy;
- Windows packaging first;
- smoke test against local `server`;
- visual QA at desktop and compact window sizes;
- accessibility pass for keyboard navigation.

Exit criteria:

- app can be installed and used against local server;
- no blocking layout overlap in primary views;
- all high-risk real-world paths show policy/simulation/approval state.

## Implementation Order

1. Scaffold Tauri shell.
2. Port style primitives from `veicApiWeb`.
3. Build API client and auth.
4. Build local cache commands.
5. Build Workspace overview.
6. Add live event sync.
7. Build Timeline.
8. Build Resource Explorer.
9. Add Workspace Search.
10. Add Command Palette.
11. Add Simulation.
12. Add Agent goals/tasks/notices.
13. Package and harden.

## API Contract Work Needed In Server

The current server is enough for M1-M4.

For M5-M8, add or expose:

- normalized runtime records endpoint;
- runtime edge endpoint for timeline causality;
- workspace facts endpoint;
- participant presence endpoint;
- command intent endpoint;
- simulation run/event endpoints;
- goal/plan endpoints;
- notice endpoints;
- optional workspace search endpoint that returns source-linked answers.

These should be backed by the P3 server tables in `docs/database/p3_server_authoritative.sql`.

## Acceptance Criteria

- The app starts at Workspace state, not chat.
- Timeline is the strongest information surface.
- Resource Explorer treats robots, cameras, PLCs, sensors, agents and services with one consistent object model.
- Workspace Search cites state/events instead of producing unsupported assistant prose.
- Command Palette can operate the system without mouse-heavy workflows.
- Simulation makes a hard distinction between predicted actions and real invocations.
- Presence and notices make the Workspace feel continuously alive.
