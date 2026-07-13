import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  createVeicApiClient,
  formatApiError,
  normalizeApiBaseUrl,
} from "./api/client";
import { AccountPanel } from "./components/account/AccountPanel";
import { CommandPalette } from "./components/command/CommandPalette";
import { RuntimeLogPanel } from "./components/logs/RuntimeLogPanel";
import { RuntimeNodeSurface } from "./components/runtime/RuntimeNodeSurface";
import { WorkspaceSearch } from "./components/search/WorkspaceSearch";
import { TitleBar } from "./components/shell/TitleBar";
import { TimelinePanel } from "./components/timeline/TimelinePanel";
import { WorkspaceList } from "./components/workspace/WorkspaceList";
import { useAuth } from "./hooks/useAuth";
import { useHealth } from "./hooks/useHealth";
import { useRuntimeLog } from "./hooks/useRuntimeLog";
import { useRuntimeProbe } from "./hooks/useRuntimeProbe";
import { useResourceDetail } from "./hooks/useResourceDetail";
import { useTaskRunner } from "./hooks/useTaskRunner";
import { useTimeline } from "./hooks/useTimeline";
import { useWorkspaces } from "./hooks/useWorkspaces";
import {
  getAppCache,
  getRuntimeProbe,
  isTauriRuntime,
  listRuntimeLogs,
  saveAppCache,
  secureDeleteToken,
  secureGetToken,
  secureSetToken,
} from "./tauri";
import { DEFAULT_API_BASE } from "./types";

export default function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [savedApiBaseUrl, setSavedApiBaseUrl] = useState(DEFAULT_API_BASE);
  const [booting, setBooting] = useState(true);

  const auth = useAuth();
  const api = useMemo(() => createVeicApiClient({ baseUrl: apiBaseUrl, token: auth.token }), [apiBaseUrl, auth.token]);
  const shellLabel = isTauriRuntime() ? "Tauri Shell" : "Web Preview";

  const runtimeLog = useRuntimeLog();
  const taskRunner = useTaskRunner(runtimeLog.recordLog);
  const health = useHealth();
  const timeline = useTimeline(runtimeLog.recordLog);
  const workspaces = useWorkspaces({
    api,
    loadCachedTimeline: timeline.loadCachedTimeline,
    runTask: taskRunner.runTask,
  });
  const runtime = useRuntimeProbe({
    api,
    selectedWorkspaceId: workspaces.selectedWorkspaceId,
    isLoggedIn: auth.isLoggedIn,
    runTask: taskRunner.runTask,
    refreshWorkspaceState: workspaces.refreshWorkspaceState,
  });
  const resourceDetail = useResourceDetail({
    api,
    workspaceId: workspaces.selectedWorkspaceId,
    resourceId: workspaces.selectedResourceId,
    enabled: auth.isLoggedIn,
  });

  const {
    recordLog,
    setLogs,
    clearLogs,
    logs,
  } = runtimeLog;
  const {
    busy,
    notice,
    error,
    setError,
    runTask,
  } = taskRunner;
  const {
    probeHealth,
  } = health;
  const {
    setToken,
    user,
    setUser,
    loginForm,
    setLoginForm,
    isLoggedIn,
    clearSessionState,
  } = auth;
  const {
    workspaces: workspaceList,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedWorkspace,
    members,
    resources,
    sessions,
    selectedResourceId,
    setSelectedResourceId,
    loadWorkspaces,
    refreshWorkspaceState,
    handleRefreshWorkspaces,
    handleSelectWorkspace,
    clearWorkspaces,
  } = workspaces;
  const {
    timelineEvents,
    timelineRevision,
    timelineStatus,
    setTimelineStatus,
    timelineError,
    setTimelineError,
    autoSync,
    setAutoSync,
    syncWorkspaceTimeline,
    clearTimeline,
  } = timeline;
  const {
    runtimeProbe,
    applyRuntimeProbe,
    publishedResource,
    clearPublishedResource,
    resourceForm,
    setResourceForm,
    canPublishResource,
    handleProbeRuntime,
    handlePublishRuntimeResource,
    handleHeartbeatResource,
    handleOfflineResource,
  } = runtime;

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
        applyRuntimeProbe(probe);
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
          clearSessionState();
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    applyRuntimeProbe,
    clearSessionState,
    loadWorkspaces,
    probeHealth,
    recordLog,
    setError,
    setLogs,
    setSelectedWorkspaceId,
    setToken,
    setUser,
    shellLabel,
  ]);

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
        await refreshWorkspaceState(selectedWorkspaceId);
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
  }, [
    api,
    autoSync,
    isLoggedIn,
    recordLog,
    refreshWorkspaceState,
    selectedWorkspaceId,
    setTimelineError,
    setTimelineStatus,
    syncWorkspaceTimeline,
  ]);

  const handleSaveBackend = useCallback(async () => {
    await runTask("保存后端地址", async () => {
      const normalized = normalizeApiBaseUrl(apiBaseUrl);
      const cache = await saveAppCache({ apiBaseUrl: normalized });
      setApiBaseUrl(cache.apiBaseUrl);
      setSavedApiBaseUrl(cache.apiBaseUrl);
      await probeHealth(cache.apiBaseUrl);
    });
  }, [apiBaseUrl, probeHealth, runTask]);

  const handleHealthCheck = useCallback(async () => {
    await runTask("Health check", async () => {
      await probeHealth(apiBaseUrl);
    });
  }, [apiBaseUrl, probeHealth, runTask]);

  const handleLogin = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const login = loginForm.login.trim();
    if (!login || !loginForm.password) {
      setError("Email/username and password are required");
      return;
    }
    await runTask("登录", async () => {
      const authResult = await api.login({ login, password: loginForm.password });
      if (!authResult.token) throw new Error("登录响应缺少 token");
      await secureSetToken(authResult.token);
      setToken(authResult.token);
      setUser(authResult.user);
      setLoginForm((prev) => ({ ...prev, password: "" }));
      const authedClient = createVeicApiClient({ baseUrl: apiBaseUrl, token: authResult.token });
      await loadWorkspaces(authedClient, selectedWorkspaceId);
    });
  }, [
    api,
    apiBaseUrl,
    loadWorkspaces,
    loginForm.login,
    loginForm.password,
    runTask,
    selectedWorkspaceId,
    setError,
    setLoginForm,
    setToken,
    setUser,
  ]);

  const handleLogout = useCallback(async () => {
    await runTask("Logout", async () => {
      await secureDeleteToken();
      clearSessionState();
      await clearWorkspaces();
      clearPublishedResource();
    });
  }, [clearPublishedResource, clearSessionState, clearWorkspaces, runTask]);

  const handleSyncTimeline = useCallback(async () => {
    await runTask("同步 Timeline", async () => {
      if (!selectedWorkspaceId) throw new Error("请先选择 Workspace");
      await syncWorkspaceTimeline(api, selectedWorkspaceId, "sync");
      await refreshWorkspaceState(selectedWorkspaceId);
    });
  }, [api, refreshWorkspaceState, runTask, selectedWorkspaceId, syncWorkspaceTimeline]);

  const handleClearTimeline = useCallback(async () => {
    await runTask("清空 Timeline", async () => {
      await clearTimeline(selectedWorkspaceId);
    });
  }, [clearTimeline, runTask, selectedWorkspaceId]);

  const backendChanged = normalizeApiBaseUrl(apiBaseUrl) !== savedApiBaseUrl;

  return (
    <div className="runtime-app">
      <TitleBar
        shellLabel={shellLabel}
        health={health.health}
        selectedWorkspace={selectedWorkspace}
        resourceCount={resources.length}
        sessionCount={sessions.length}
        timelineRevision={timelineRevision}
        timelineStatus={timelineStatus}
        busy={busy}
      />

      <main className="runtime-layout">
        <AccountPanel
          apiBaseUrl={apiBaseUrl}
          setApiBaseUrl={setApiBaseUrl}
          backendChanged={backendChanged}
          onSaveBackend={handleSaveBackend}
          onHealthCheck={handleHealthCheck}
          health={health.health}
          isLoggedIn={isLoggedIn}
          user={user}
          onLogout={handleLogout}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          onLogin={handleLogin}
          busy={busy}
          booting={booting}
        />

        <WorkspaceList
          isLoggedIn={isLoggedIn}
          workspaces={workspaceList}
          selectedWorkspaceId={selectedWorkspaceId}
          busy={busy}
          onRefresh={handleRefreshWorkspaces}
          onSelectWorkspace={handleSelectWorkspace}
        />

        <RuntimeNodeSurface
          selectedWorkspace={selectedWorkspace}
          members={members}
          resources={resources}
          sessions={sessions}
          selectedResourceId={selectedResourceId}
          setSelectedResourceId={setSelectedResourceId}
          resourceDetail={resourceDetail}
          runtimeProbe={runtimeProbe}
          resourceForm={resourceForm}
          setResourceForm={setResourceForm}
          publishedResource={publishedResource}
          busy={busy}
          canPublishResource={canPublishResource}
          onProbeRuntime={handleProbeRuntime}
          onPublishRuntimeResource={handlePublishRuntimeResource}
          onHeartbeatResource={handleHeartbeatResource}
          onOfflineResource={handleOfflineResource}
          notice={notice}
          error={error}
        />
      </main>

      <section className="bottom-layout">
        <TimelinePanel
          timelineEvents={timelineEvents}
          timelineError={timelineError}
          autoSync={autoSync}
          busy={busy}
          isLoggedIn={isLoggedIn}
          selectedWorkspaceId={selectedWorkspaceId}
          onSyncTimeline={handleSyncTimeline}
          onToggleAutoSync={() => setAutoSync((value) => !value)}
          onClearTimeline={handleClearTimeline}
        />

        <RuntimeLogPanel
          logs={logs}
          busy={busy}
          onClearLogs={clearLogs}
        />
      </section>

      <WorkspaceSearch
        enabled={isLoggedIn}
        selectedWorkspace={selectedWorkspace}
        members={members}
        resources={resources}
        sessions={sessions}
        timelineEvents={timelineEvents}
        logs={logs}
        resourceDetail={resourceDetail}
        selectedResourceId={selectedResourceId}
        onSelectResource={setSelectedResourceId}
      />

      <CommandPalette
        enabled={isLoggedIn}
        resources={resources}
        resourceDetail={resourceDetail}
        selectedResourceId={selectedResourceId}
        onSelectResource={setSelectedResourceId}
        onRecordCommandIntent={(message) => recordLog("info", message)}
      />
    </div>
  );
}
