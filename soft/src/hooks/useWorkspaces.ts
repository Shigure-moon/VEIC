import { useCallback, useEffect, useMemo, useState } from "react";
import type { VeicApiClient } from "../api/client";
import { saveAppCache } from "../tauri";
import type {
  Resource,
  RunTask,
  Workspace,
  WorkspaceDetail,
  WorkspaceStateSnapshot,
} from "../types";

export function useWorkspaces({
  api,
  loadCachedTimeline,
  runTask,
}: {
  api: VeicApiClient;
  loadCachedTimeline: (workspaceId: string) => Promise<number>;
  runTask: RunTask;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | undefined>();
  const [workspaceState, setWorkspaceState] = useState<WorkspaceStateSnapshot | undefined>();
  const [selectedResourceId, setSelectedResourceId] = useState("");

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId),
    [selectedWorkspaceId, workspaces],
  );
  const members = workspaceDetail?.members ?? [];
  const resources = workspaceState?.resources ?? [];
  const sessions = workspaceState?.sessions ?? [];

  useEffect(() => {
    if (resources.length === 0) {
      if (selectedResourceId) setSelectedResourceId("");
      return;
    }
    if (!selectedResourceId || !resources.some((resource) => resource.id === selectedResourceId)) {
      setSelectedResourceId(resources[0]?.id || "");
    }
  }, [resources, selectedResourceId]);

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

  const refreshWorkspaceState = useCallback(async (workspaceId = selectedWorkspaceId) => {
    if (!workspaceId) return undefined;
    const state = await api.getWorkspaceState(workspaceId);
    setWorkspaceState(state);
    return state;
  }, [api, selectedWorkspaceId]);

  const handleRefreshWorkspaces = useCallback(async () => {
    await runTask("刷新 Workspace", async () => {
      await loadWorkspaces(api, selectedWorkspaceId);
    });
  }, [api, loadWorkspaces, runTask, selectedWorkspaceId]);

  const handleSelectWorkspace = useCallback(async (workspaceId: string) => {
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
  }, [api, loadCachedTimeline, runTask, selectedWorkspaceId]);

  const clearWorkspaces = useCallback(async () => {
    setWorkspaces([]);
    setSelectedWorkspaceId("");
    setWorkspaceDetail(undefined);
    setWorkspaceState(undefined);
    setSelectedResourceId("");
    await saveAppCache({ lastWorkspaceId: "" });
  }, []);

  return {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedWorkspace,
    workspaceDetail,
    setWorkspaceDetail,
    workspaceState,
    setWorkspaceState,
    members,
    resources: resources as Resource[],
    sessions,
    selectedResourceId,
    setSelectedResourceId,
    loadWorkspaces,
    refreshWorkspaceState,
    handleRefreshWorkspaces,
    handleSelectWorkspace,
    clearWorkspaces,
  };
}
