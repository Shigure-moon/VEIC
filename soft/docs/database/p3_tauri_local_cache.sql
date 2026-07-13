-- VEIC Tauri desktop local SQLite cache schema draft.
--
-- This database is not authoritative. It exists for startup speed,
-- event-stream resume, offline read-only inspection, preferences,
-- command history and retryable mutation outbox entries.

PRAGMA foreign_keys = ON;

CREATE TABLE client_accounts (
    id TEXT PRIMARY KEY,
    api_base_url TEXT NOT NULL,
    user_id TEXT,
    email TEXT,
    display_name TEXT NOT NULL DEFAULT '',
    token_key_ref TEXT NOT NULL DEFAULT '',
    last_used_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE workspace_cache (
    workspace_id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL DEFAULT '',
    owner_user_id TEXT NOT NULL DEFAULT '',
    network_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'network',
    status TEXT NOT NULL DEFAULT 'unknown',
    revision INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL DEFAULT '{}',
    cached_at TEXT NOT NULL
);

CREATE TABLE workspace_sync_cursors (
    workspace_id TEXT PRIMARY KEY,
    current_revision INTEGER NOT NULL DEFAULT 0,
    last_event_id TEXT,
    last_synced_at TEXT,
    stream_status TEXT NOT NULL DEFAULT 'idle',
    error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE resource_cache (
    resource_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    stable_resource_id TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    status TEXT NOT NULL,
    owner_user_id TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT,
    twin_json TEXT NOT NULL DEFAULT '{}',
    payload_json TEXT NOT NULL DEFAULT '{}',
    cached_at TEXT NOT NULL
);

CREATE INDEX resource_cache_workspace_idx
    ON resource_cache(workspace_id, status, name);

CREATE TABLE participant_presence_cache (
    participant_key TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    participant_kind TEXT NOT NULL,
    display_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    activity_state TEXT NOT NULL DEFAULT 'watching',
    last_seen_at TEXT,
    payload_json TEXT NOT NULL DEFAULT '{}',
    cached_at TEXT NOT NULL
);

CREATE INDEX participant_presence_cache_workspace_idx
    ON participant_presence_cache(workspace_id, status, cached_at DESC);

CREATE TABLE runtime_record_cache (
    runtime_record_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    record_kind TEXT NOT NULL,
    subject_type TEXT NOT NULL DEFAULT 'workspace',
    subject_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'recorded',
    title TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    occurred_at TEXT NOT NULL,
    payload_json TEXT NOT NULL DEFAULT '{}',
    cached_at TEXT NOT NULL
);

CREATE INDEX runtime_record_cache_workspace_time_idx
    ON runtime_record_cache(workspace_id, occurred_at DESC);

CREATE INDEX runtime_record_cache_subject_idx
    ON runtime_record_cache(workspace_id, subject_type, subject_key, occurred_at DESC);

CREATE TABLE runtime_edge_cache (
    runtime_edge_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    from_record_id TEXT NOT NULL,
    to_record_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    payload_json TEXT NOT NULL DEFAULT '{}',
    cached_at TEXT NOT NULL
);

CREATE INDEX runtime_edge_cache_from_idx
    ON runtime_edge_cache(workspace_id, from_record_id, relation_type);

CREATE TABLE workspace_fact_cache (
    fact_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value_json TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'active',
    updated_at TEXT NOT NULL,
    cached_at TEXT NOT NULL
);

CREATE INDEX workspace_fact_cache_lookup_idx
    ON workspace_fact_cache(workspace_id, subject_type, subject_key, fact_key);

CREATE TABLE workspace_notice_cache (
    notice_id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    notice_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    candidate_action_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    cached_at TEXT NOT NULL
);

CREATE INDEX workspace_notice_cache_workspace_idx
    ON workspace_notice_cache(workspace_id, status, created_at DESC);

CREATE TABLE command_index_cache (
    command_key TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    label TEXT NOT NULL,
    action_kind TEXT NOT NULL,
    target_json TEXT NOT NULL DEFAULT '{}',
    risk_level TEXT NOT NULL DEFAULT 'low',
    requires_simulation INTEGER NOT NULL DEFAULT 0,
    requires_approval INTEGER NOT NULL DEFAULT 0,
    rank_weight REAL NOT NULL DEFAULT 1.0,
    cached_at TEXT NOT NULL
);

CREATE INDEX command_index_cache_workspace_idx
    ON command_index_cache(workspace_id, action_kind, rank_weight DESC);

CREATE TABLE command_history (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    entered_text TEXT NOT NULL,
    command_key TEXT NOT NULL DEFAULT '',
    selected_action TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT NOT NULL
);

CREATE INDEX command_history_workspace_time_idx
    ON command_history(workspace_id, created_at DESC);

CREATE TABLE pending_mutation_outbox (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    request_json TEXT NOT NULL DEFAULT '{}',
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT NOT NULL DEFAULT '',
    next_attempt_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX pending_mutation_outbox_idempotency_idx
    ON pending_mutation_outbox(idempotency_key);

CREATE INDEX pending_mutation_outbox_status_idx
    ON pending_mutation_outbox(status, next_attempt_at);

CREATE TABLE client_preferences (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

