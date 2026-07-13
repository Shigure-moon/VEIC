# P3 Database Tables

This document defines the database target for the VEIC desktop Workspace app assuming the `server` project reaches its roadmap P3 Agent Runtime goal.

Naming note: the current server already contains `migrations/0008_p3_provider_policy.sql`, and `docs/CONTROL_PLANE_ROADMAP.md` also says provider-level policy rules are implemented for the current backend. This document treats that provider-policy P3 as baseline, and uses "P3" to mean the roadmap P3 Agent Runtime scope: goals, beliefs, planner memory, evaluation and simulation.

The server remains authoritative. The Tauri desktop app keeps only a local cache, client preferences, command history and an outbox for retryable client mutations.

## Server Baseline Already Present

The current `server` migrations already cover the control-plane and early runtime foundation:

| Area | Current tables |
| --- | --- |
| Account and scope | `users`, `user_profiles`, `organizations`, `workspaces`, `workspace_members` |
| Invites and access | `workspace_invites`, `resource_invites`, `workspace_join_requests` |
| Resource model | `resources`, `resource_endpoints`, `resource_capabilities` |
| Sessions and transport | `sessions`, `connections`, `transport_attempts`, `relay_allocations`, `overlay_enrollments`, `device_onboarding_plans` |
| Events and audit | `workspace_events`, `audit_events` |
| Identity and MCP | `identities`, `mcp_servers`, `mcp_tools`, `mcp_invocations` |
| Invocation runtime | `capability_invocations`, `invocation_execution_events` |
| Policy and limits | `capability_provider_policies`, `rate_limit_buckets` |
| Resource Twin | `resource_twin_states`, `resource_twin_drifts` |
| Controllers | `controller_runs` |

The desktop UI should use these as the visible world-state foundation: Workspace overview, Resource Explorer, Timeline, Capability detail, Invocation detail, Twin state and Drift state.

## P3 Completion Definition

P3 adds Agent Runtime on top of the existing Connectivity Platform:

- Goal Runtime: long-running objectives, plan versions, plan steps and append-only goal events.
- Belief Layer: observed, believed and desired facts that can span workspace, resources, participants and goals.
- Planner Memory: durable episodes, procedures, failures and outcomes.
- Evaluation Harness: test cases and runs for plans before real-world invocation.
- Simulation Runtime: prediction/replay runs and simulated event timelines.
- Proactive Workspace Notices: observations that surface as "Workspace noticed..." prompts.
- Unified Runtime Timeline: a queryable event graph across workspace events, invocations, controller runs, twin drift, goals, simulations and notices.

## Authoritative P3 Server Tables

The SQL draft is in [p3_server_authoritative.sql](p3_server_authoritative.sql).

### Runtime Timeline

| Table | Purpose |
| --- | --- |
| `workspace_runtime_records` | Normalized timeline records across events, invocations, controllers, twin drift, goals, plans, simulations and notices. |
| `workspace_runtime_edges` | Directed graph links such as `caused_by`, `produced`, `consumed`, `approved_by`, `predicted_by`. |
| `workspace_runtime_snapshots` | Frozen Workspace snapshots used by planner, simulation and evaluation runs. |

### World State and Presence

| Table | Purpose |
| --- | --- |
| `workspace_facts` | Derived current facts for Workspace Search, summaries and agent context. |
| `workspace_participant_presence` | Unified presence for humans, agents, robots, cameras, PLCs, sensors and services. |
| `agent_beliefs` | Belief layer spanning observed, believed and desired state beyond a single Resource Twin. |

### Agent Runtime

| Table | Purpose |
| --- | --- |
| `agent_goals` | Long-running goals with ownership, priority, status, constraints and desired outcomes. |
| `agent_goal_events` | Append-only goal event stream. |
| `agent_plans` | Planner outputs and human approval lifecycle. |
| `agent_plan_steps` | Executable or simulated plan steps. |
| `planner_memories` | Planner memory items derived from prior events, goals, failures and outcomes. |

### Simulation and Evaluation

| Table | Purpose |
| --- | --- |
| `simulation_runs` | Replay, prediction and evaluation simulation requests. |
| `simulation_events` | Predicted or replayed timeline events produced by a simulation. |
| `evaluation_suites` | Named evaluation suites for a workspace or resource family. |
| `evaluation_cases` | Fixtures, success criteria and risk limits. |
| `evaluation_runs` | Evaluation execution records, scores and reports. |

### Interaction

| Table | Purpose |
| --- | --- |
| `workspace_notices` | Proactive observations shown in the desktop app. |
| `workspace_command_intents` | Auditable command-palette intents before they become invocations or simulations. |

## Tauri Local Cache Tables

The SQLite draft is in [p3_tauri_local_cache.sql](p3_tauri_local_cache.sql).

The local database is not a second source of truth. It exists for:

- fast startup into the last Workspace;
- offline read-only inspection of recent world state;
- resilient event stream resume;
- local command history and palette ranking;
- retrying safe client mutations through an outbox;
- user preferences and window/layout state.

Authoritative state must be reconciled through server APIs:

- `GET /api/v2/workspaces`
- `GET /api/v2/workspaces/{workspaceId}`
- `GET /api/v2/workspaces/{workspaceId}/state`
- `GET /api/v2/workspaces/{workspaceId}/sync`
- `GET /api/v2/workspaces/{workspaceId}/events/wait`
- `GET /api/v2/workspaces/{workspaceId}/events/stream`
- Resource, Capability, Invocation, MCP, Twin, Transport and Session APIs from `server/openapi.yaml`.

## Design Rules

- The Timeline is event-first. UI should not reconstruct causality from chat transcripts.
- Resource Explorer is object-first. Every resource opens into Identity, Resource, Capabilities, History, Current State and Recent Invocation.
- Workspace Search answers from snapshots, facts, runtime records, execution events and twin state before asking an LLM.
- Command Palette writes auditable command intents and then routes to simulation, approval or invocation.
- Simulation must preserve the guarantee: no real robot moved.
- Local cache never stores plaintext long-lived secrets. Use OS keychain or Tauri-side secure storage for token material.
