-- VEIC server P3 authoritative schema draft.
--
-- Scope:
-- - Postgres tables added after the current server baseline reaches Agent Runtime.
-- - Existing tables are not repeated here.
-- - Uses pgcrypto gen_random_uuid(), already enabled by migrations/0001_core.sql.

CREATE TABLE workspace_runtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    record_kind TEXT NOT NULL,
    subject_type TEXT NOT NULL DEFAULT 'workspace',
    subject_key TEXT NOT NULL,
    subject_id UUID,
    parent_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    trace_id UUID,
    span_id UUID,
    parent_span_id UUID,
    correlation_id UUID,
    actor_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    title TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_runtime_records_workspace_time_idx
    ON workspace_runtime_records(workspace_id, occurred_at DESC);

CREATE INDEX workspace_runtime_records_subject_idx
    ON workspace_runtime_records(workspace_id, subject_type, subject_key, occurred_at DESC);

CREATE INDEX workspace_runtime_records_trace_idx
    ON workspace_runtime_records(trace_id, occurred_at)
    WHERE trace_id IS NOT NULL;

CREATE INDEX workspace_runtime_records_correlation_idx
    ON workspace_runtime_records(correlation_id, occurred_at)
    WHERE correlation_id IS NOT NULL;

CREATE INDEX workspace_runtime_records_payload_gin_idx
    ON workspace_runtime_records USING GIN (payload);

CREATE TABLE workspace_runtime_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    from_record_id UUID NOT NULL REFERENCES workspace_runtime_records(id) ON DELETE CASCADE,
    to_record_id UUID NOT NULL REFERENCES workspace_runtime_records(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, from_record_id, to_record_id, relation_type)
);

CREATE INDEX workspace_runtime_edges_from_idx
    ON workspace_runtime_edges(workspace_id, from_record_id, relation_type);

CREATE INDEX workspace_runtime_edges_to_idx
    ON workspace_runtime_edges(workspace_id, to_record_id, relation_type);

CREATE TABLE workspace_runtime_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_revision BIGINT NOT NULL,
    snapshot_kind TEXT NOT NULL DEFAULT 'live',
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    resources JSONB NOT NULL DEFAULT '[]'::jsonb,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    facts JSONB NOT NULL DEFAULT '[]'::jsonb,
    beliefs JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_by TEXT NOT NULL DEFAULT 'server',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_runtime_snapshots_workspace_revision_idx
    ON workspace_runtime_snapshots(workspace_id, source_revision DESC, created_at DESC);

CREATE TABLE workspace_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    subject_id UUID,
    fact_key TEXT NOT NULL,
    fact_value JSONB NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    source_kind TEXT NOT NULL DEFAULT 'derived',
    source_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX workspace_facts_active_unique_idx
    ON workspace_facts(workspace_id, subject_type, subject_key, fact_key)
    WHERE status = 'active';

CREATE INDEX workspace_facts_workspace_key_idx
    ON workspace_facts(workspace_id, fact_key, updated_at DESC);

CREATE INDEX workspace_facts_value_gin_idx
    ON workspace_facts USING GIN (fact_value);

CREATE TABLE workspace_participant_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    participant_key TEXT NOT NULL,
    participant_kind TEXT NOT NULL,
    identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    activity_state TEXT NOT NULL DEFAULT 'watching',
    last_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    last_seen_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, participant_key)
);

CREATE INDEX workspace_participant_presence_workspace_status_idx
    ON workspace_participant_presence(workspace_id, status, updated_at DESC);

CREATE TABLE agent_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_goal_id UUID REFERENCES agent_goals(id) ON DELETE SET NULL,
    owner_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    goal_type TEXT NOT NULL DEFAULT 'workspace',
    objective JSONB NOT NULL DEFAULT '{}'::jsonb,
    success_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    desired_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority INTEGER NOT NULL DEFAULT 100,
    risk_level TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'proposed',
    due_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX agent_goals_workspace_status_idx
    ON agent_goals(workspace_id, status, priority, updated_at DESC);

CREATE INDEX agent_goals_owner_idx
    ON agent_goals(workspace_id, owner_identity_id, status);

CREATE TABLE agent_goal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES agent_goals(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    actor_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    runtime_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, goal_id, sequence)
);

CREATE INDEX agent_goal_events_goal_idx
    ON agent_goal_events(workspace_id, goal_id, sequence);

CREATE TABLE agent_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES agent_goals(id) ON DELETE CASCADE,
    planner_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    input_snapshot_id UUID REFERENCES workspace_runtime_snapshots(id) ON DELETE SET NULL,
    plan_version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    rationale TEXT NOT NULL DEFAULT '',
    memory_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, goal_id, plan_version)
);

CREATE INDEX agent_plans_goal_status_idx
    ON agent_plans(workspace_id, goal_id, status, created_at DESC);

CREATE TABLE agent_plan_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES agent_plans(id) ON DELETE CASCADE,
    parent_step_id UUID REFERENCES agent_plan_steps(id) ON DELETE SET NULL,
    step_index INTEGER NOT NULL,
    title TEXT NOT NULL,
    action_kind TEXT NOT NULL,
    target_resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
    target_capability_id UUID REFERENCES resource_capabilities(id) ON DELETE SET NULL,
    capability_key TEXT,
    expected_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    invocation_kind TEXT,
    invocation_id UUID,
    simulation_run_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, plan_id, step_index)
);

CREATE INDEX agent_plan_steps_plan_status_idx
    ON agent_plan_steps(workspace_id, plan_id, status, step_index);

CREATE TABLE agent_beliefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    subject_id UUID,
    belief_key TEXT NOT NULL,
    observed_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    believed_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    desired_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 0.5000,
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX agent_beliefs_active_unique_idx
    ON agent_beliefs(workspace_id, subject_type, subject_key, belief_key)
    WHERE status = 'active';

CREATE INDEX agent_beliefs_workspace_key_idx
    ON agent_beliefs(workspace_id, belief_key, updated_at DESC);

CREATE TABLE planner_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL,
    scope_type TEXT NOT NULL DEFAULT 'workspace',
    scope_key TEXT NOT NULL,
    scope_id UUID,
    title TEXT NOT NULL,
    text_summary TEXT NOT NULL DEFAULT '',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding_ref TEXT,
    confidence NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    importance INTEGER NOT NULL DEFAULT 50,
    source_goal_id UUID REFERENCES agent_goals(id) ON DELETE SET NULL,
    source_plan_id UUID REFERENCES agent_plans(id) ON DELETE SET NULL,
    source_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX planner_memories_workspace_scope_idx
    ON planner_memories(workspace_id, scope_type, scope_key, importance DESC, updated_at DESC);

CREATE INDEX planner_memories_content_gin_idx
    ON planner_memories USING GIN (content);

CREATE TABLE simulation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    requested_by_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES agent_goals(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES agent_plans(id) ON DELETE SET NULL,
    input_snapshot_id UUID REFERENCES workspace_runtime_snapshots(id) ON DELETE SET NULL,
    simulator_adapter TEXT NOT NULL DEFAULT 'workspace_replay',
    mode TEXT NOT NULL DEFAULT 'prediction',
    scenario JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending',
    result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX simulation_runs_workspace_time_idx
    ON simulation_runs(workspace_id, created_at DESC);

CREATE INDEX simulation_runs_goal_plan_idx
    ON simulation_runs(workspace_id, goal_id, plan_id, status);

CREATE TABLE simulation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    simulation_run_id UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    subject_type TEXT NOT NULL DEFAULT 'workspace',
    subject_key TEXT NOT NULL,
    probability NUMERIC(5, 4) NOT NULL DEFAULT 1.0000,
    occurred_offset_ms BIGINT NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, simulation_run_id, sequence)
);

CREATE INDEX simulation_events_run_idx
    ON simulation_events(workspace_id, simulation_run_id, sequence);

CREATE TABLE evaluation_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope_type TEXT NOT NULL DEFAULT 'workspace',
    scope_key TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, name)
);

CREATE TABLE evaluation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    suite_id UUID NOT NULL REFERENCES evaluation_suites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    input_fixture JSONB NOT NULL DEFAULT '{}'::jsonb,
    success_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    risk_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, suite_id, name)
);

CREATE TABLE evaluation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    suite_id UUID REFERENCES evaluation_suites(id) ON DELETE SET NULL,
    case_id UUID REFERENCES evaluation_cases(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES agent_goals(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES agent_plans(id) ON DELETE SET NULL,
    simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE SET NULL,
    evaluator_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    score NUMERIC(6, 3),
    report JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX evaluation_runs_workspace_time_idx
    ON evaluation_runs(workspace_id, created_at DESC);

CREATE TABLE workspace_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    notice_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    candidate_action JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_fact_id UUID REFERENCES workspace_facts(id) ON DELETE SET NULL,
    source_record_id UUID REFERENCES workspace_runtime_records(id) ON DELETE SET NULL,
    acknowledged_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_notices_workspace_status_idx
    ON workspace_notices(workspace_id, status, severity, created_at DESC);

CREATE TABLE workspace_command_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_identity_id UUID REFERENCES identities(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entered_text TEXT NOT NULL,
    normalized_intent TEXT NOT NULL DEFAULT '',
    selected_action TEXT NOT NULL DEFAULT '',
    target JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft',
    requires_simulation BOOLEAN NOT NULL DEFAULT FALSE,
    requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
    simulation_run_id UUID REFERENCES simulation_runs(id) ON DELETE SET NULL,
    invocation_kind TEXT,
    invocation_id UUID,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX workspace_command_intents_workspace_time_idx
    ON workspace_command_intents(workspace_id, created_at DESC);

