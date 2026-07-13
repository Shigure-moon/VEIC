import { SectionHeading } from "../common";
import type { CachedWorkspaceEvent } from "../../tauri";
import { eventSummary, formatTime } from "../../utils/format";

export function TimelinePanel({
  timelineEvents,
  timelineError,
  autoSync,
  busy,
  isLoggedIn,
  selectedWorkspaceId,
  onSyncTimeline,
  onToggleAutoSync,
  onClearTimeline,
}: {
  timelineEvents: CachedWorkspaceEvent[];
  timelineError: string;
  autoSync: boolean;
  busy: string;
  isLoggedIn: boolean;
  selectedWorkspaceId: string;
  onSyncTimeline: () => Promise<void>;
  onToggleAutoSync: () => void;
  onClearTimeline: () => Promise<void>;
}) {
  return (
    <section className="timeline-panel">
      <div className="panel-toolbar">
        <SectionHeading eyebrow="Timeline" title="Workspace events" />
        <div className="button-row">
          <button type="button" onClick={onSyncTimeline} disabled={Boolean(busy) || !isLoggedIn || !selectedWorkspaceId}>
            同步
          </button>
          <button type="button" onClick={onToggleAutoSync} disabled={!selectedWorkspaceId}>
            {autoSync ? "Watching" : "Paused"}
          </button>
          <button type="button" onClick={onClearTimeline} disabled={Boolean(busy) || !selectedWorkspaceId || timelineEvents.length === 0}>
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
  );
}
