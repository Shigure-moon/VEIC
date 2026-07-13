import { useCallback, useState } from "react";
import type { VeicApiClient } from "../api/client";
import {
  clearWorkspaceEvents,
  getWorkspaceEventCursor,
  listWorkspaceEvents,
  saveWorkspaceEvents,
  type CachedWorkspaceEvent,
  type RuntimeLogLevel,
} from "../tauri";
import type { TimelineStatus } from "../types";
import { normalizeWorkspaceEvents } from "../utils/timeline";

export function useTimeline(recordLog: (level: RuntimeLogLevel, message: string) => Promise<void>) {
  const [timelineEvents, setTimelineEvents] = useState<CachedWorkspaceEvent[]>([]);
  const [timelineRevision, setTimelineRevision] = useState(0);
  const [timelineStatus, setTimelineStatus] = useState<TimelineStatus>("idle");
  const [timelineError, setTimelineError] = useState("");
  const [autoSync, setAutoSync] = useState(true);

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

  const clearTimeline = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    await clearWorkspaceEvents(workspaceId);
    setTimelineEvents([]);
    setTimelineRevision(0);
    setTimelineError("");
  }, []);

  return {
    timelineEvents,
    timelineRevision,
    timelineStatus,
    setTimelineStatus,
    timelineError,
    setTimelineError,
    autoSync,
    setAutoSync,
    loadCachedTimeline,
    syncWorkspaceTimeline,
    clearTimeline,
  };
}
