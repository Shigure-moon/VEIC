import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createVeicApiClient,
  formatApiError,
  normalizeApiBaseUrl,
  type PublishResourceRequest,
  type Schema,
  type VeicApiClient,
  type WorkspaceEvent,
} from "./api/client";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  clearWorkspaceEvents,
  getAppCache,
  getRuntimeProbe,
  getWorkspaceEventCursor,
  isTauriRuntime,
  listWorkspaceEvents,
  listRuntimeLogs,
  saveWorkspaceEvents,
  saveAppCache,
  secureDeleteToken,
  secureGetToken,
  secureSetToken,
  type CachedWorkspaceEvent,
  type RuntimeLog,
  type RuntimeLogLevel,
  type RuntimeProbe,
} from "./tauri";

type Readiness = Schema<"Readiness">;
type UserProfile = Schema<"UserProfile">;
type Workspace = Schema<"Workspace">;
type WorkspaceDetail = Schema<"WorkspaceDetail">;
type WorkspaceStateSnapshot = Schema<"WorkspaceStateSnapshot">;
type Resource = Schema<"Resource">;

type HealthState = {
  service: "unknown" | "ok" | "error";
  readiness: "unknown" | "ready" | "not_ready" | "error";
  message: string;
  checkedAt: string;
};

const DEFAULT_API_BASE = "https://api.veic.tech";

const initialHealth: HealthState = {
  service: "unknown",
  readiness: "unknown",
  message: "not checked",
  checkedAt: "",
};

const initialResourceForm = {
  name: "",
  resourceType: "runtime_node",
  endpointType: "overlay",
  provider: "headscale",
  address: "",
  port: "",
  machineId: "",
};

type ResourceForm = typeof initialResourceForm;

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [savedApiBaseUrl, setSavedApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | undefined>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | undefined>();
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStateSnapshot | undefined>();
  const [runtimeProbe, setRuntimeProbe] = useState<RuntimeProbe | undefined>();
  const [publishedResource, setPublishedResource] = useState<Resource | undefined>();
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [resourceForm, setResourceForm] = useState(initialResourceForm);
  const [timelineEvents, setTimelineEvents] = useState<CachedWorkspaceEvent[]>([]);
  const [timelineRevision, setTimelineRevision] = useState(0);
  const [timelineStatus, setTimelineStatus] = useState<"idle" | "syncing" | "watching" | "error">("idle");
  const [timelineError, setTimelineError] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [logs, setLogs] = useState<RuntimeLog[]>([]);
  const [health, setHealth] = useState<HealthState>(initialHealth);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });

  const api = useMemo(() => createVeicApiClient({ baseUrl: apiBaseUrl, token }), [apiBaseUrl, token]);
  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId),
    [selectedWorkspaceId, workspaces],
  );
  const members = workspaceDetail?.members ?? [];
  const resources = workspaceState?.resources ?? [];
  const sessions = workspaceState?.sessions ?? [];
  const capabilityCount = resources.reduce((total, resource) => total + (resource.capabilities?.length ?? 0), 0);
  const robotCount = resources.filter((resource) => /robot|ros/i.test(resource.resourceType || "")).length;
  const agentCount =
    members.filter((member) => /agent/i.test(member.memberType || "")).length +
    resources.filter((resource) => /agent/i.test(resource.resourceType || "")).length;
  const shellLabel = isTauriRuntime() ? "Tauri Shell" : "Web Preview";
  const isLoggedIn = Boolean(token && user);

  useEffect(() => {
    if (resources.length === 0) {
      if (selectedResourceId) setSelectedResourceId("");
      return;
    }
    if (!selectedResourceId || !resources.some((resource) => resource.id === selectedResourceId)) {
      setSelectedResourceId(resources[0]?.id || "");
    }
  }, [resources, selectedResourceId]);

  const recordLog = useCallback(async (level: RuntimeLogLevel, message: string) => {
    try {
      const log = await appendRuntimeLog(level, message);
      setLogs((prev) => [log, ...prev.filter((item) => item.id !== log.id)].slice(0, 120));
    } catch {
      const fallback: RuntimeLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        level,
        message,
      };
      setLogs((prev) => [fallback, ...prev].slice(0, 120));
    }
  }, []);

  const runTask = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    setBusy(label);
    setNotice("");
    setError("");
    try {
      const value = await task();
      setNotice(`${label} 成功`);
      await recordLog("success", `${label} 成功`);
      return value;
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      await recordLog("error", `${label} 失败: ${message}`);
      return undefined;
    } finally {
      setBusy("");
    }
  }, [recordLog]);

  const probeHealth = useCallback(async (baseUrl: string) => {
    const client = createVeicApiClient({ baseUrl });
    const checkedAt = new Date().toISOString();
    let service: HealthState["service"] = "unknown";
    let readiness: HealthState["readiness"] = "unknown";
    let readinessBody: Readiness | undefined;
    let message = "";

    try {
      const healthText = await client.health();
      service = "ok";
      message = typeof healthText === "string" ? healthText : "health ok";
    } catch (err) {
      service = "error";
      message = formatApiError(err);
    }

    try {
      readinessBody = await client.readiness();
      readiness = readinessBody.status === "ready" ? "ready" : "not_ready";
    } catch (err) {
      readiness = "error";
      if (!message || message === "health ok" || message === "OK") {
        message = formatApiError(err);
      }
    }

    setHealth({
      service,
      readiness,
      checkedAt,
      message: readinessBody?.database ? `${message} / db ${readinessBody.database}` : message,
    });
  }, []);

  const loadCachedTimeline = useCallback(async (workspaceId: string) => {
    if (!workspaceId) {
      setTimelineEvents([]);
      setTimelineRevision(0);
      return 0;
    }
    const [events, cursor] = await Promise.all([
      listWorkspaceEvents(workspaceId, 160),
      getWorkspaceEventCursor(workspaceId),
    ]);
    setTimelineEvents(events);
    setTimelineRevision(cursor);
    return cursor;
  }, []);

  const syncWorkspaceTimeline = useCallback(async (
    client: VeicApiClient,
    workspaceId: string,
    mode: "sync" | "wait" = "sync",
  ) => {
    if (!workspaceId) return 0;
    setTimelineStatus(mode === "wait" ? "watching" : "syncing");
    setTimelineError("");

    const cursor = await getWorkspaceEventCursor(workspaceId);
    const result = mode === "wait"
      ? await client.waitWorkspaceEvents(workspaceId, cursor, 20)
      : await client.syncWorkspace(workspaceId, cursor);
    const events = normalizeWorkspaceEvents(workspaceId, result.events ?? []);
    let nextRevision = Math.max(cursor, result.currentRevision ?? 0);

    if (events.length > 0) {
      nextRevision = Math.max(nextRevision, await saveWorkspaceEvents(workspaceId, events));
      const cached = await listWorkspaceEvents(workspaceId, 160);
      setTimelineEvents(cached);
      await recordLog("info", `Timeline 收到 ${events.length} 个事件，revision ${nextRevision}`);
    }

    setTimelineRevision(nextRevision);
    setTimelineStatus(mode === "wait" ? "watching" : "idle");
    return nextRevision;
  }, [recordLog]);

  const loadWorkspaces = useCallback(async (
    client: VeicApiClient,
    preferredWorkspaceId: string,
  ) => {
    const list = await client.listWorkspaces();
    setWorkspaces(list);

    const nextWorkspaceId =
      (preferredWorkspaceId && list.some((workspace) => workspace.id === preferredWorkspaceId)
        ? preferredWorkspaceId
        : list[0]?.id) || "";

    setSelectedWorkspaceId(nextWorkspaceId);
    await saveAppCache({ lastWorkspaceId: nextWorkspaceId });

    if (nextWorkspaceId) {
      const [detail, state] = await Promise.all([
        client.getWorkspace(nextWorkspaceId),
        client.getWorkspaceState(nextWorkspaceId),
      ]);
      setWorkspaceDetail(detail);
      setWorkspaceState(state);
      await loadCachedTimeline(nextWorkspaceId);
    } else {
      setWorkspaceDetail(undefined);
      setWorkspaceState(undefined);
      await loadCachedTimeline("");
    }

    return list;
  }, [loadCachedTimeline]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setBooting(true);
      try {
        const [cache, storedLogs, storedToken, probe] = await Promise.all([
          getAppCache(),
          listRuntimeLogs(120),
          secureGetToken(),
          getRuntimeProbe(),
        ]);
        if (cancelled) return;

        const normalizedBaseUrl = normalizeApiBaseUrl(cache.apiBaseUrl);
        setApiBaseUrl(normalizedBaseUrl);
        setSavedApiBaseUrl(normalizedBaseUrl);
        setSelectedWorkspaceId(cache.lastWorkspaceId);
        setRuntimeProbe(probe);
        setResourceForm((prev) => resourceFormFromProbe(prev, probe));
        setLogs(storedLogs);
        setToken(storedToken);
        await recordLog("info", `启动 ${shellLabel}, API ${normalizedBaseUrl}`);

        await probeHealth(normalizedBaseUrl);

        if (storedToken) {
          const bootClient = createVeicApiClient({ baseUrl: normalizedBaseUrl, token: storedToken });
          const profile = await bootClient.me();
          if (cancelled) return;
          setUser(profile);
          await loadWorkspaces(bootClient, cache.lastWorkspaceId);
          await recordLog("success", "身份已从系统 keychain 恢复");
        }
      } catch (err) {
        if (!cancelled) {
          const message = formatApiError(err);
          setError(message);
          await recordLog("warn", `启动恢复失败: ${message}`);
          await secureDeleteToken();
          setToken("");
          setUser(undefined);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [loadWorkspaces, probeHealth, recordLog, shellLabel]);

  useEffect(() => {
    if (!isLoggedIn || !selectedWorkspaceId || !autoSync) {
      if (!autoSync) setTimelineStatus("idle");
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function watch() {
      try {
        await syncWorkspaceTimeline(api, selectedWorkspaceId, "wait");
        if (cancelled) return;
        if (selectedWorkspaceId) {
          setWorkspaceState(await api.getWorkspaceState(selectedWorkspaceId));
        }
        timer = window.setTimeout(watch, 1200);
      } catch (err) {
        if (cancelled) return;
        const message = formatApiError(err);
        setTimelineError(message);
        setTimelineStatus("error");
        await recordLog("warn", `Timeline watch failed: ${message}`);
        timer = window.setTimeout(watch, 6000);
      }
    }

    timer = window.setTimeout(watch, 800);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [api, autoSync, isLoggedIn, recordLog, selectedWorkspaceId, syncWorkspaceTimeline]);

  async function handleSaveBackend() {
    await runTask("保存后端地址", async () => {
      const normalized = normalizeApiBaseUrl(apiBaseUrl);
      const cache = await saveAppCache({ apiBaseUrl: normalized });
      setApiBaseUrl(cache.apiBaseUrl);
      setSavedApiBaseUrl(cache.apiBaseUrl);
      await probeHealth(cache.apiBaseUrl);
    });
  }

  async function handleHealthCheck() {
    await runTask("Health check", async () => {
      await probeHealth(apiBaseUrl);
    });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const login = loginForm.login.trim();
    if (!login || !loginForm.password) {
      setError("Email/username and password are required");
      return;
    }
    await runTask("登录", async () => {
      const auth = await api.login({ login, password: loginForm.password });
      if (!auth.token) throw new Error("登录响应缺少 token");
      await secureSetToken(auth.token);
      setToken(auth.token);
      setUser(auth.user);
      setLoginForm((prev) => ({ ...prev, password: "" }));
      const authedClient = createVeicApiClient({ baseUrl: apiBaseUrl, token: auth.token });
      await loadWorkspaces(authedClient, selectedWorkspaceId);
    });
  }

  async function handleLogout() {
    await runTask("Logout", async () => {
      await secureDeleteToken();
      setToken("");
      setUser(undefined);
      setWorkspaces([]);
      setSelectedWorkspaceId("");
      setWorkspaceDetail(undefined);
      setWorkspaceState(undefined);
      setPublishedResource(undefined);
      await saveAppCache({ lastWorkspaceId: "" });
    });
  }

  async function handleRefreshWorkspaces() {
    await runTask("刷新 Workspace", async () => {
      await loadWorkspaces(api, selectedWorkspaceId);
    });
  }

  async function handleSelectWorkspace(workspaceId: string) {
    if (!workspaceId || workspaceId === selectedWorkspaceId) return;
    await runTask("切换 Workspace", async () => {
      setSelectedWorkspaceId(workspaceId);
      await saveAppCache({ lastWorkspaceId: workspaceId });
      const [detail, state] = await Promise.all([
        api.getWorkspace(workspaceId),
        api.getWorkspaceState(workspaceId),
      ]);
      setWorkspaceDetail(detail);
      setWorkspaceState(state);
      await loadCachedTimeline(workspaceId);
    });
  }

  async function handleProbeRuntime() {
    await runTask("探测本机 Runtime", async () => {
      const probe = await getRuntimeProbe();
      setRuntimeProbe(probe);
      setResourceForm((prev) => resourceFormFromProbe(prev, probe));
    });
  }

  async function handlePublishRuntimeResource() {
    await runTask("发布 Runtime Resource", async () => {
      if (!selectedWorkspaceId) throw new Error("请先选择 Workspace");
      if (!runtimeProbe) throw new Error("请先探测本机 Runtime");
      const endpointType = resourceForm.endpointType.trim();
      const address = resourceForm.address.trim();
      if (!address) throw new Error("Overlay, IPv6, or relay endpoint address is required");
      if (endpointType === "lan") throw new Error("LAN-only Resource is not accepted by the backend. LAN addresses are metadata hints only.");
      if (endpointType === "overlay" && !resourceForm.machineId.trim()) {
        throw new Error("Headscale/Tailscale overlay endpoint requires machineId");
      }

      const port = Number.parseInt(resourceForm.port, 10);
      const body: PublishResourceRequest = {
        stableResourceId: runtimeProbe.stableResourceId,
        name: resourceForm.name.trim() || runtimeProbe.hostname,
        resourceType: resourceForm.resourceType.trim() || "runtime_node",
        leaseTtlSeconds: 90,
        endpoints: [
          {
            endpointType: endpointType as "ipv6" | "overlay" | "relay" | "lan",
            provider: resourceForm.provider.trim() || "native",
            address,
            port: Number.isFinite(port) ? port : undefined,
            machineId: resourceForm.machineId.trim() || undefined,
            priority: 100,
            metadata: {
              source: "veic-runtime-desktop",
              hostname: runtimeProbe.hostname,
              username: runtimeProbe.username,
              os: runtimeProbe.os,
              arch: runtimeProbe.arch,
              lanHints: runtimeProbe.ipv4Addresses,
            },
          },
        ],
        capabilities: [
          {
            capabilityKey: "runtime.health_check",
            capabilityKind: "metrics",
            provider: "native",
            protocol: "custom",
            riskLevel: "low",
            status: "available",
            metadata: {
              source: "veic-runtime-desktop",
              description: "Local runtime node health heartbeat",
            },
          },
        ],
        metadata: {
          source: "veic-runtime-desktop",
          hostname: runtimeProbe.hostname,
          os: runtimeProbe.os,
          arch: runtimeProbe.arch,
        },
      };
      const resource = await api.publishResource(selectedWorkspaceId, body);
      setPublishedResource(resource);
      setWorkspaceState(await api.getWorkspaceState(selectedWorkspaceId));
    });
  }

  async function handleHeartbeatResource() {
    await runTask("Runtime 心跳", async () => {
      if (!selectedWorkspaceId || !publishedResource?.id) throw new Error("当前没有已发布的 Runtime Resource");
      await api.heartbeatResource(selectedWorkspaceId, publishedResource.id);
      setWorkspaceState(await api.getWorkspaceState(selectedWorkspaceId));
    });
  }

  async function handleOfflineResource() {
    await runTask("Runtime 下线", async () => {
      if (!selectedWorkspaceId || !publishedResource?.id) throw new Error("当前没有已发布的 Runtime Resource");
      const resource = await api.offlineResource(selectedWorkspaceId, publishedResource.id);
      setPublishedResource(resource);
      setWorkspaceState(await api.getWorkspaceState(selectedWorkspaceId));
    });
  }

  async function handleClearLogs() {
    await clearRuntimeLogs();
    setLogs([]);
  }

  async function handleSyncTimeline() {
    await runTask("同步 Timeline", async () => {
      if (!selectedWorkspaceId) throw new Error("请先选择 Workspace");
      await syncWorkspaceTimeline(api, selectedWorkspaceId, "sync");
      setWorkspaceState(await api.getWorkspaceState(selectedWorkspaceId));
    });
  }

  async function handleClearTimeline() {
    await runTask("清空 Timeline", async () => {
      if (!selectedWorkspaceId) return;
      await clearWorkspaceEvents(selectedWorkspaceId);
      setTimelineEvents([]);
      setTimelineRevision(0);
      setTimelineError("");
    });
  }

  const backendChanged = normalizeApiBaseUrl(apiBaseUrl) !== savedApiBaseUrl;

  return (
    <div className="runtime-app">
      <header className="runtime-titlebar">
        <div className="brand">
          <img src="/assets/app-icon.png" alt="" />
          <div>
            <strong>维柯 / VEIC Runtime</strong>
            <span>Agent Connectivity desktop node</span>
          </div>
        </div>
        <div className="status-strip">
          <StatusBadge label={shellLabel} tone="neutral" />
          <StatusBadge label={`API ${health.service}`} tone={health.service === "ok" ? "good" : health.service === "error" ? "bad" : "neutral"} />
          <StatusBadge label={`DB ${health.readiness}`} tone={health.readiness === "ready" ? "good" : health.readiness === "error" ? "bad" : "neutral"} />
          {selectedWorkspace ? <StatusBadge label={`${resources.length} resources`} tone="neutral" /> : null}
          {selectedWorkspace ? <StatusBadge label={`${sessions.length} sessions`} tone="neutral" /> : null}
          {selectedWorkspace ? <StatusBadge label={`rev ${timelineRevision}`} tone="neutral" /> : null}
          {selectedWorkspace ? <StatusBadge label={`timeline ${timelineStatus}`} tone={timelineStatus === "error" ? "bad" : timelineStatus === "watching" ? "good" : "neutral"} /> : null}
          {busy ? <StatusBadge label={busy} tone="active" /> : null}
        </div>
      </header>

      <main className="runtime-layout">
        <aside className="panel account-panel">
          <SectionHeading eyebrow="Account Server" title="Backend and identity" />
          <label className="field">
            <span>API Base URL</span>
            <input
              value={apiBaseUrl}
              onChange={(event) => setApiBaseUrl(event.target.value)}
              spellCheck={false}
              placeholder="https://api.veic.tech"
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={handleSaveBackend} disabled={Boolean(busy) || !backendChanged}>
              保存后端
            </button>
            <button type="button" onClick={handleHealthCheck} disabled={Boolean(busy)}>
              Health check
            </button>
          </div>

          <div className="health-readout">
            <span>{health.message}</span>
            <time>{health.checkedAt ? formatDateTime(health.checkedAt) : "not checked"}</time>
          </div>

          {isLoggedIn ? (
            <div className="identity-block">
              <span className="block-label">Current User</span>
              <strong>{user?.displayName || user?.username || user?.email || "Authenticated"}</strong>
              <span>{user?.email || user?.id || "no email"}</span>
              <button type="button" onClick={handleLogout} disabled={Boolean(busy)}>
                Logout
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
              <label className="field">
                <span>Email / Username</span>
                <input
                  value={loginForm.login}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, login: event.target.value }))}
                  autoComplete="username"
                  placeholder="you@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                  autoComplete="current-password"
                  type="password"
                  placeholder="password"
                />
              </label>
              <button type="submit" disabled={Boolean(busy || booting)}>
                登录
              </button>
            </form>
          )}
        </aside>

        <section className="panel workspace-panel">
          <div className="panel-toolbar">
            <SectionHeading eyebrow="Workspace" title="选择运行空间" />
            <button type="button" onClick={handleRefreshWorkspaces} disabled={Boolean(busy) || !isLoggedIn}>
              刷新
            </button>
          </div>

          {!isLoggedIn ? (
            <EmptyState title="Not signed in" detail="Sign in to load real Workspaces from the backend." />
          ) : workspaces.length === 0 ? (
            <EmptyState title="No Workspace" detail="This client reads only real API data and does not create mock workspaces." />
          ) : (
            <div className="workspace-list">
              {workspaces.map((workspace) => {
                const workspaceId = workspace.id || "";
                return (
                  <button
                    type="button"
                    key={workspaceId || workspace.networkId || workspace.name}
                    className={workspaceId === selectedWorkspaceId ? "workspace-item active" : "workspace-item"}
                    onClick={() => void handleSelectWorkspace(workspaceId)}
                    disabled={!workspaceId || Boolean(busy)}
                  >
                    <span>
                      <strong>{workspace.name || "Unnamed Workspace"}</strong>
                      <em>{workspace.networkId || workspace.id || "no network id"}</em>
                    </span>
                    <small>{workspace.status || "active"}</small>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel runtime-panel">
          <SectionHeading eyebrow="Runtime" title="Current state" />
          {selectedWorkspace ? (
            <div className="workspace-detail">
              <div className="metric-grid">
                <Metric label="Network ID" value={selectedWorkspace.networkId || "-"} />
                <Metric label="Kind" value={selectedWorkspace.kind || "-"} />
                <Metric label="People" value={String(members.length)} />
                <Metric label="Agents" value={String(agentCount)} />
                <Metric label="Robots" value={String(robotCount)} />
                <Metric label="Resources" value={String(resources.length)} />
                <Metric label="Capabilities" value={String(capabilityCount)} />
                <Metric label="Sessions" value={String(sessions.length)} />
              </div>

              <ResourceExplorer
                resources={resources}
                selectedResourceId={selectedResourceId}
                onSelect={setSelectedResourceId}
              />

              <div className="runtime-node">
                <div className="panel-toolbar compact">
                  <span className="block-label">Local Runtime Node</span>
                  <button type="button" onClick={handleProbeRuntime} disabled={Boolean(busy)}>
                    探测本机
                  </button>
                </div>

                {runtimeProbe ? (
                  <div className="probe-grid">
                    <Metric label="Hostname" value={runtimeProbe.hostname} />
                    <Metric label="Stable ID" value={runtimeProbe.stableResourceId} />
                    <Metric label="OS" value={`${runtimeProbe.os}/${runtimeProbe.arch}`} />
                    <Metric label="LAN Hints" value={runtimeProbe.ipv4Addresses.join(", ") || "-"} />
                    <Metric label="Overlay IP" value={preferredOverlayIp(runtimeProbe) || "-"} />
                    <Metric label="Machine ID" value={runtimeProbe.overlay?.machineId || "-"} />
                  </div>
                ) : (
                  <p className="muted">Runtime probe has not run.</p>
                )}

                <div className="resource-form">
                  <label className="field">
                    <span>Resource Name</span>
                    <input
                      value={resourceForm.name}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Runtime Node"
                    />
                  </label>
                  <label className="field">
                    <span>Resource Type</span>
                    <input
                      value={resourceForm.resourceType}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, resourceType: event.target.value }))}
                      placeholder="runtime_node"
                    />
                  </label>
                  <label className="field">
                    <span>Endpoint Type</span>
                    <select
                      value={resourceForm.endpointType}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, endpointType: event.target.value }))}
                    >
                      <option value="overlay">overlay</option>
                      <option value="ipv6">ipv6</option>
                      <option value="relay">relay</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Provider</span>
                    <input
                      value={resourceForm.provider}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, provider: event.target.value }))}
                      placeholder="headscale"
                    />
                  </label>
                  <label className="field">
                    <span>Endpoint Address</span>
                    <input
                      value={resourceForm.address}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="100.x.x.x or IPv6"
                    />
                  </label>
                  <label className="field">
                    <span>Port</span>
                    <input
                      value={resourceForm.port}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, port: event.target.value }))}
                      placeholder="optional"
                    />
                  </label>
                  <label className="field field-wide">
                    <span>Machine ID (overlay required)</span>
                    <input
                      value={resourceForm.machineId}
                      onChange={(event) => setResourceForm((prev) => ({ ...prev, machineId: event.target.value }))}
                      placeholder="headscale/tailscale machine id"
                    />
                  </label>
                </div>

                <div className="button-row">
                  <button type="button" onClick={handlePublishRuntimeResource} disabled={Boolean(busy) || !isLoggedIn || !selectedWorkspaceId}>
                    发布 Resource
                  </button>
                  <button type="button" onClick={handleHeartbeatResource} disabled={Boolean(busy) || !publishedResource?.id}>
                    心跳
                  </button>
                  <button type="button" onClick={handleOfflineResource} disabled={Boolean(busy) || !publishedResource?.id}>
                    下线
                  </button>
                </div>

                {publishedResource ? (
                  <div className="health-readout">
                    <span>{publishedResource.name || publishedResource.id}</span>
                    <time>{publishedResource.status || "unknown"} / lease {publishedResource.leaseExpiresAt ? formatDateTime(publishedResource.leaseExpiresAt) : "-"}</time>
                  </div>
                ) : null}
              </div>

              <div className="member-list">
                <span className="block-label">Members</span>
                {members.length === 0 ? (
                  <p className="muted">No members returned by the detail API.</p>
                ) : (
                  members.map((member) => (
                    <div className="member-row" key={member.id || member.userId || member.displayName}>
                      <span>{member.displayName || member.userId || "member"}</span>
                      <em>{[member.role, member.memberType, member.status].filter(Boolean).join(" / ")}</em>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="No Workspace selected" detail="Select a Workspace to show backend details here." />
          )}

          {notice || error ? (
            <div className={error ? "notice error" : "notice"}>
              {error || notice}
            </div>
          ) : null}
        </section>
      </main>

      <section className="bottom-layout">
        <section className="timeline-panel">
          <div className="panel-toolbar">
            <SectionHeading eyebrow="Timeline" title="Workspace events" />
            <div className="button-row">
              <button type="button" onClick={handleSyncTimeline} disabled={Boolean(busy) || !isLoggedIn || !selectedWorkspaceId}>
                同步
              </button>
              <button type="button" onClick={() => setAutoSync((value) => !value)} disabled={!selectedWorkspaceId}>
                {autoSync ? "Watching" : "Paused"}
              </button>
              <button type="button" onClick={handleClearTimeline} disabled={Boolean(busy) || !selectedWorkspaceId || timelineEvents.length === 0}>
                清空
              </button>
            </div>
          </div>
          {timelineError ? <div className="timeline-error">{timelineError}</div> : null}
          {timelineEvents.length === 0 ? (
            <p className="muted">No workspace events cached yet.</p>
          ) : (
            <div className="timeline-list">
              {timelineEvents.map((event) => (
                <article className="timeline-row" key={`${event.workspaceId}-${event.revision}-${event.id}`}>
                  <time>{formatTime(event.createdAt)}</time>
                  <span>#{event.revision}</span>
                  <div>
                    <strong>{event.eventType || "workspace.event"}</strong>
                    <p>{eventSummary(event)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="log-panel">
          <div className="panel-toolbar">
            <SectionHeading eyebrow="Runtime Log" title="运行日志" />
            <button type="button" onClick={handleClearLogs} disabled={Boolean(busy) || logs.length === 0}>
              清空
            </button>
          </div>
          {logs.length === 0 ? (
            <p className="muted">No logs yet.</p>
          ) : (
            <div className="log-list">
              {logs.map((log) => (
                <div className="log-row" key={`${log.id}-${log.createdAt}`}>
                  <time>{formatTime(log.createdAt)}</time>
                  <span className={`log-level ${log.level}`}>{log.level}</span>
                  <p>{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function resourceFormFromProbe(prev: ResourceForm, probe: RuntimeProbe): ResourceForm {
  const overlayIp = preferredOverlayIp(probe);
  const overlayMachineId = probe.overlay?.machineId?.trim() || "";
  if (probe.overlay?.available && overlayIp && overlayMachineId) {
    return {
      ...prev,
      name: prev.name || probe.hostname,
      endpointType: "overlay",
      provider: overlayProvider(probe),
      address: overlayIp,
      machineId: overlayMachineId,
    };
  }

  const ipv6 = probe.ipv6Addresses[0] || "";
  return {
    ...prev,
    name: prev.name || probe.hostname,
    endpointType: ipv6 ? "ipv6" : prev.endpointType,
    provider: ipv6 ? "native" : prev.provider,
    address: prev.address || ipv6,
  };
}

function normalizeWorkspaceEvents(workspaceId: string, events: WorkspaceEvent[]): CachedWorkspaceEvent[] {
  return events.reduce<CachedWorkspaceEvent[]>((normalized, event) => {
    const revision = Number(event.revision || 0);
    if (!Number.isFinite(revision) || revision <= 0) return normalized;
    normalized.push({
      workspaceId,
      id: event.id || `${workspaceId}-${revision}`,
      revision,
      eventType: event.eventType || "workspace.event",
      actorUserId: event.actorUserId || null,
      subjectId: event.subjectId || null,
      payload: normalizePayload(event.payload),
      createdAt: event.createdAt || new Date().toISOString(),
    });
    return normalized;
  }, []);
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

function eventSummary(event: CachedWorkspaceEvent) {
  const payload = event.payload || {};
  const name = stringValue(payload.name) || stringValue(payload.resourceName) || stringValue(payload.workspaceName);
  const status = stringValue(payload.status) || stringValue(payload.state);
  const reason = stringValue(payload.reason);
  const subject = event.subjectId ? shortId(event.subjectId) : "";
  const parts = [name, status, reason, subject ? `subject ${subject}` : ""].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  const keys = Object.keys(payload).slice(0, 4);
  return keys.length > 0 ? keys.map((key) => `${key}=${payloadValue(payload[key])}`).join(" / ") : "No payload summary";
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function payloadValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) return "-";
  return Array.isArray(value) ? `[${value.length}]` : "{...}";
}

function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

function preferredOverlayIp(probe: RuntimeProbe) {
  const ips = probe.overlay?.overlayIps ?? [];
  return ips.find((ip) => ip.includes(".")) || ips[0] || "";
}

function overlayProvider(probe: RuntimeProbe) {
  const loginServer = probe.overlay?.loginServer?.toLowerCase() || "";
  return loginServer.includes("tailscale.com") ? "tailscale" : "headscale";
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-heading">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: "neutral" | "good" | "bad" | "active" }) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function ResourceExplorer({
  resources,
  selectedResourceId,
  onSelect,
}: {
  resources: Resource[];
  selectedResourceId: string;
  onSelect: (resourceId: string) => void;
}) {
  const selected = resources.find((resource) => resource.id === selectedResourceId) ?? resources[0];
  const groups = resources.reduce<Record<string, Resource[]>>((acc, resource) => {
    const key = resource.resourceType || "resource";
    acc[key] = [...(acc[key] ?? []), resource];
    return acc;
  }, {});

  return (
    <div className="resource-explorer">
      <div className="resource-tree">
        <div className="resource-explorer-head">
          <span className="block-label">Resource Explorer</span>
          <strong>{resources.length}</strong>
        </div>
        {resources.length === 0 ? (
          <p className="muted">No resources returned by the Workspace state API.</p>
        ) : (
          Object.entries(groups).map(([group, groupResources]) => (
            <div className="resource-group" key={group}>
              <span>{group}</span>
              {groupResources.map((resource) => {
                const resourceId = resource.id || resource.stableResourceId || resource.name || "";
                return (
                  <button
                    type="button"
                    key={resourceId}
                    className={resource.id === selected?.id ? "resource-tree-item active" : "resource-tree-item"}
                    onClick={() => onSelect(resource.id || "")}
                    disabled={!resource.id}
                  >
                    <strong>{resource.name || "Unnamed Resource"}</strong>
                    <em>{resource.status || "unknown"} / {shortId(resource.stableResourceId || resource.id || "-")}</em>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="resource-inspector">
        {selected ? (
          <>
            <div className="resource-inspector-title">
              <div>
                <span className="block-label">Selected Resource</span>
                <h3>{selected.name || "Unnamed Resource"}</h3>
              </div>
              <StatusBadge label={selected.status || "unknown"} tone={selected.status === "online" ? "good" : "neutral"} />
            </div>

            <div className="mini-grid">
              <Metric label="Type" value={selected.resourceType || "-"} />
              <Metric label="Stable ID" value={selected.stableResourceId || "-"} />
              <Metric label="Owner" value={shortId(selected.ownerUserId || "-")} />
              <Metric label="Lease" value={selected.leaseExpiresAt ? formatTime(selected.leaseExpiresAt) : "-"} />
            </div>

            <DetailList
              title="Endpoints"
              empty="No endpoint returned."
              items={(selected.endpoints ?? []).map((endpoint) => ({
                key: endpoint.id || `${endpoint.endpointType}-${endpoint.address}-${endpoint.port}`,
                title: `${endpoint.endpointType || "endpoint"} / ${endpoint.provider || "provider"}`,
                detail: `${endpoint.address || "-"}${endpoint.port ? `:${endpoint.port}` : ""} / ${endpoint.status || "unknown"} / ${endpoint.machineId ? `machine ${shortId(endpoint.machineId)}` : `priority ${endpoint.priority ?? "-"}`}`,
              }))}
            />

            <DetailList
              title="Capabilities"
              empty="No capability returned."
              items={(selected.capabilities ?? []).map((capability) => ({
                key: capability.id || capability.capabilityKey || "",
                title: capability.capabilityKey || "capability",
                detail: `${capability.capabilityKind || "custom"} / ${capability.provider || "-"} / ${capability.protocol || "-"} / ${capability.riskLevel || "low"} / ${capability.status || "unknown"}`,
              }))}
            />

            <div className="twin-summary">
              <span className="block-label">Twin Partitions</span>
              {selected.twin ? (
                <div className="twin-grid">
                  <Metric label="Desired" value={partitionSummary(selected.twin.desiredState)} />
                  <Metric label="Reported" value={partitionSummary(selected.twin.reportedState)} />
                  <Metric label="Observed" value={partitionSummary(selected.twin.observedState)} />
                </div>
              ) : (
                <p className="muted">Twin state is not present in this snapshot.</p>
              )}
            </div>
          </>
        ) : (
          <EmptyState title="No Resource selected" detail="Publish or select a Resource to inspect endpoints, capabilities and twin state." />
        )}
      </div>
    </div>
  );
}

function DetailList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; title: string; detail: string }>;
}) {
  return (
    <div className="detail-list">
      <span className="block-label">{title}</span>
      {items.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        items.map((item, index) => (
          <div className="detail-row" key={item.key || `${item.title}-${index}`}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </div>
        ))
      )}
    </div>
  );
}

function partitionSummary(value: Record<string, unknown> | undefined) {
  const count = value ? Object.keys(value).length : 0;
  return count > 0 ? `${count} keys` : "empty";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
