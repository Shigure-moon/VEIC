import { invoke } from "@tauri-apps/api/core";

export type AppCache = {
  apiBaseUrl: string;
  lastWorkspaceId: string;
};

export type RuntimeLog = {
  id: number;
  createdAt: string;
  level: RuntimeLogLevel;
  message: string;
};

export type RuntimeLogLevel = "info" | "success" | "warn" | "error" | "debug";

export type RuntimeProbe = {
  hostname: string;
  username: string;
  os: string;
  arch: string;
  stableResourceId: string;
  ipv4Addresses: string[];
  ipv6Addresses: string[];
  overlay?: TailscaleOverlayState | null;
};

export type CachedWorkspaceEvent = {
  workspaceId: string;
  id: string;
  revision: number;
  eventType: string;
  actorUserId?: string | null;
  subjectId?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
};

export type TailscaleOverlayState = {
  available: boolean;
  backendState?: string | null;
  loginServer?: string | null;
  hostname?: string | null;
  dnsName?: string | null;
  machineId?: string | null;
  nodeId?: string | null;
  publicKey?: string | null;
  overlayIps: string[];
  error?: string | null;
};

const DEFAULT_API_BASE = "https://api.veic.tech";
const CACHE_KEY = "veic.runtime.cache";
const TOKEN_KEY = "veic.runtime.sessionToken";
const LOG_KEY = "veic.runtime.logs";
const EVENT_KEY_PREFIX = "veic.runtime.events.";

export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export async function getAppCache(): Promise<AppCache> {
  if (isTauriRuntime()) {
    return invoke<AppCache>("get_app_cache");
  }
  const stored = readJson<Partial<AppCache>>(CACHE_KEY, {});
  return {
    apiBaseUrl: stored.apiBaseUrl || DEFAULT_API_BASE,
    lastWorkspaceId: stored.lastWorkspaceId || "",
  };
}

export async function saveAppCache(request: Partial<AppCache>): Promise<AppCache> {
  if (isTauriRuntime()) {
    return invoke<AppCache>("save_app_cache", { request });
  }
  const current = await getAppCache();
  const next = {
    apiBaseUrl: request.apiBaseUrl ?? current.apiBaseUrl,
    lastWorkspaceId: request.lastWorkspaceId ?? current.lastWorkspaceId,
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  return next;
}

export async function secureGetToken(): Promise<string> {
  if (isTauriRuntime()) {
    return (await invoke<string | null>("secure_get_token")) || "";
  }
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

export async function secureSetToken(token: string) {
  if (isTauriRuntime()) {
    await invoke("secure_set_token", { token });
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
}

export async function secureDeleteToken() {
  if (isTauriRuntime()) {
    await invoke("secure_delete_token");
    return;
  }
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function appendRuntimeLog(level: RuntimeLogLevel, message: string): Promise<RuntimeLog> {
  if (isTauriRuntime()) {
    return invoke<RuntimeLog>("append_runtime_log", { level, message });
  }
  const logs = await listRuntimeLogs(500);
  const log: RuntimeLog = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    level,
    message,
  };
  localStorage.setItem(LOG_KEY, JSON.stringify([log, ...logs].slice(0, 500)));
  return log;
}

export async function listRuntimeLogs(limit = 120): Promise<RuntimeLog[]> {
  if (isTauriRuntime()) {
    return invoke<RuntimeLog[]>("list_runtime_logs", { limit });
  }
  return readJson<RuntimeLog[]>(LOG_KEY, []).slice(0, limit);
}

export async function clearRuntimeLogs() {
  if (isTauriRuntime()) {
    await invoke("clear_runtime_logs");
    return;
  }
  localStorage.removeItem(LOG_KEY);
}

export async function getRuntimeProbe(): Promise<RuntimeProbe> {
  if (isTauriRuntime()) {
    return invoke<RuntimeProbe>("get_runtime_probe");
  }
  const hostname = window.location.hostname || "browser-preview";
  return {
    hostname,
    username: "browser-user",
    os: navigator.platform || "browser",
    arch: "web",
    stableResourceId: `veic-runtime-${hostname.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    ipv4Addresses: [],
    ipv6Addresses: [],
    overlay: null,
  };
}

export async function saveWorkspaceEvents(workspaceId: string, events: CachedWorkspaceEvent[]): Promise<number> {
  if (!workspaceId || events.length === 0) return getWorkspaceEventCursor(workspaceId);
  if (isTauriRuntime()) {
    return invoke<number>("save_workspace_events", { workspaceId, events });
  }
  const current = await listWorkspaceEvents(workspaceId, 500);
  const byRevision = new Map<number, CachedWorkspaceEvent>();
  for (const event of current) {
    if (event.revision > 0) byRevision.set(event.revision, event);
  }
  for (const event of events) {
    if (event.revision > 0) byRevision.set(event.revision, event);
  }
  const next = [...byRevision.values()]
    .sort((a, b) => b.revision - a.revision)
    .slice(0, 500);
  localStorage.setItem(workspaceEventKey(workspaceId), JSON.stringify(next));
  return next.reduce((max, event) => Math.max(max, event.revision), 0);
}

export async function listWorkspaceEvents(workspaceId: string, limit = 100): Promise<CachedWorkspaceEvent[]> {
  if (!workspaceId) return [];
  if (isTauriRuntime()) {
    return invoke<CachedWorkspaceEvent[]>("list_workspace_events", { workspaceId, limit });
  }
  return readJson<CachedWorkspaceEvent[]>(workspaceEventKey(workspaceId), []).slice(0, limit);
}

export async function getWorkspaceEventCursor(workspaceId: string): Promise<number> {
  if (!workspaceId) return 0;
  if (isTauriRuntime()) {
    return invoke<number>("get_workspace_event_cursor", { workspaceId });
  }
  const events = await listWorkspaceEvents(workspaceId, 500);
  return events.reduce((max, event) => Math.max(max, event.revision || 0), 0);
}

export async function clearWorkspaceEvents(workspaceId: string) {
  if (!workspaceId) return;
  if (isTauriRuntime()) {
    await invoke("clear_workspace_events", { workspaceId });
    return;
  }
  localStorage.removeItem(workspaceEventKey(workspaceId));
}

function workspaceEventKey(workspaceId: string) {
  return `${EVENT_KEY_PREFIX}${workspaceId}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
