import { SectionHeading } from "../common";
import type { RuntimeLog } from "../../tauri";
import { formatTime } from "../../utils/format";

export function RuntimeLogPanel({
  logs,
  busy,
  onClearLogs,
}: {
  logs: RuntimeLog[];
  busy: string;
  onClearLogs: () => Promise<void>;
}) {
  return (
    <section className="log-panel">
      <div className="panel-toolbar">
        <SectionHeading eyebrow="Runtime Log" title="运行日志" />
        <button type="button" onClick={onClearLogs} disabled={Boolean(busy) || logs.length === 0}>
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
  );
}
