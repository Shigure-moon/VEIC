import type { WorkspaceEvent } from "../api/client";
import type { CachedWorkspaceEvent } from "../tauri";

export function normalizeWorkspaceEvents(workspaceId: string, events: WorkspaceEvent[]): CachedWorkspaceEvent[] {
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
