import { StatusBadge } from "../common";
import type { HealthState, TimelineStatus, Workspace } from "../../types";

export function TitleBar({
  shellLabel,
  health,
  selectedWorkspace,
  resourceCount,
  sessionCount,
  timelineRevision,
  timelineStatus,
  busy,
}: {
  shellLabel: string;
  health: HealthState;
  selectedWorkspace: Workspace | undefined;
  resourceCount: number;
  sessionCount: number;
  timelineRevision: number;
  timelineStatus: TimelineStatus;
  busy: string;
}) {
  return (
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
        {selectedWorkspace ? <StatusBadge label={`${resourceCount} resources`} tone="neutral" /> : null}
        {selectedWorkspace ? <StatusBadge label={`${sessionCount} sessions`} tone="neutral" /> : null}
        {selectedWorkspace ? <StatusBadge label={`rev ${timelineRevision}`} tone="neutral" /> : null}
        {selectedWorkspace ? <StatusBadge label={`timeline ${timelineStatus}`} tone={timelineStatus === "error" ? "bad" : timelineStatus === "watching" ? "good" : "neutral"} /> : null}
        {busy ? <StatusBadge label={busy} tone="active" /> : null}
      </div>
    </header>
  );
}
