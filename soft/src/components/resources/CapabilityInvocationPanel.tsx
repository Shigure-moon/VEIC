import { useEffect, useMemo, useState } from "react";
import { DetailList, EmptyState, Metric, StatusBadge } from "../common";
import type { CapabilityInvocation, InvocationExecutionEvent, Resource, ResourceDetailHydration } from "../../types";
import { compactJson, formatDateTime, formatTime, shortId } from "../../utils/format";

export function CapabilityInvocationPanel({
  resource,
  detail,
}: {
  resource: Resource | undefined;
  detail: ResourceDetailHydration;
}) {
  const invocations = useMemo(
    () => detail.status === "ready" ? detail.invocations.slice(0, 8) : [],
    [detail.invocations, detail.status],
  );
  const [selectedInvocationId, setSelectedInvocationId] = useState("");

  useEffect(() => {
    if (invocations.length === 0) {
      if (selectedInvocationId) setSelectedInvocationId("");
      return;
    }
    if (!selectedInvocationId || !invocations.some((invocation) => invocation.id === selectedInvocationId)) {
      setSelectedInvocationId(invocations[0]?.id || "");
    }
  }, [invocations, selectedInvocationId]);

  const selectedInvocation = invocations.find((invocation) => invocation.id === selectedInvocationId) ?? invocations[0];
  const executionEvents = useMemo(
    () => eventsForInvocation(detail.executionEvents, selectedInvocation?.id),
    [detail.executionEvents, selectedInvocation?.id],
  );

  if (!resource) {
    return (
      <section className="invocation-panel">
        <EmptyState title="No Resource selected" detail="Select a Resource to inspect capability invocation history." />
      </section>
    );
  }

  return (
    <section className="invocation-panel">
      <div className="resource-twin-head">
        <div>
          <span className="block-label">Capability Invocation</span>
          <h3>{resource.name || "Unnamed Resource"}</h3>
        </div>
        <StatusBadge label={detailStatusLabel(detail)} tone={detail.status === "ready" ? "good" : detail.status === "error" ? "bad" : "neutral"} />
      </div>

      {detail.status === "error" ? (
        <div className="timeline-error">Invocation API unavailable: {detail.error}</div>
      ) : null}

      {invocations.length === 0 ? (
        <p className="muted">
          {detail.status === "ready"
            ? "No capability invocation returned for this Resource."
            : "Load Resource detail to inspect invocation history."}
        </p>
      ) : (
        <div className="invocation-layout">
          <div className="invocation-list" aria-label="Recent invocations">
            {invocations.map((invocation) => (
              <button
                type="button"
                key={invocation.id || `${invocation.capabilityKey}-${invocation.startedAt}`}
                className={invocation.id === selectedInvocation?.id ? "invocation-row active" : "invocation-row"}
                onClick={() => setSelectedInvocationId(invocation.id || "")}
              >
                <span>{invocation.capabilityKey || "capability"}</span>
                <strong>{invocation.status || "unknown"}</strong>
                <em>{invocation.startedAt ? formatTime(invocation.startedAt) : "-"}</em>
              </button>
            ))}
          </div>

          {selectedInvocation ? (
            <div className="invocation-detail">
              <InvocationMetrics invocation={selectedInvocation} />

              <div className="invocation-json-grid">
                <InvocationJsonBlock title="Request" value={selectedInvocation.request} />
                <InvocationJsonBlock title="Response" value={selectedInvocation.response} />
                <InvocationJsonBlock title="Runtime Metadata" value={selectedInvocation.runtimeMetadata} />
                {selectedInvocation.error ? (
                  <div className="invocation-json-block error">
                    <span>Error</span>
                    <pre>{selectedInvocation.error}</pre>
                  </div>
                ) : null}
              </div>

              <DetailList
                title="Execution Events"
                empty="No execution events hydrated for this invocation."
                items={executionEvents.map((event) => ({
                  key: event.id || `${event.invocationId}-${event.sequence}-${event.createdAt}`,
                  title: `#${event.sequence ?? "-"} ${event.eventType || "event"}`,
                  detail: [
                    event.createdAt ? formatDateTime(event.createdAt) : "",
                    event.traceId ? `trace ${shortId(event.traceId)}` : "no trace",
                    compactJson(event.payload),
                  ].filter(Boolean).join(" / "),
                }))}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function InvocationMetrics({ invocation }: { invocation: CapabilityInvocation }) {
  return (
    <div className="mini-grid">
      <Metric label="Invocation" value={shortId(invocation.id || "-")} />
      <Metric label="Provider" value={invocation.provider || "-"} />
      <Metric label="Protocol" value={invocation.protocol || "-"} />
      <Metric label="Status" value={invocation.status || "-"} />
      <Metric label="Session" value={shortId(invocation.sessionId || "-")} />
      <Metric label="Connection" value={shortId(invocation.connectionId || "-")} />
      <Metric label="Started" value={invocation.startedAt ? formatTime(invocation.startedAt) : "-"} />
      <Metric label="Finished" value={invocation.finishedAt ? formatTime(invocation.finishedAt) : "-"} />
    </div>
  );
}

function InvocationJsonBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="invocation-json-block">
      <span>{title}</span>
      <pre>{prettyJson(value)}</pre>
    </div>
  );
}

function eventsForInvocation(events: InvocationExecutionEvent[], invocationId: string | undefined) {
  if (!invocationId) return [];
  return events
    .filter((event) => event.invocationId === invocationId)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
}

function prettyJson(value: unknown) {
  if (!value || typeof value !== "object") return "{}";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{...}";
  }
}

function detailStatusLabel(detail: ResourceDetailHydration) {
  if (detail.status === "loading") return "loading";
  if (detail.status === "ready") return "ready";
  if (detail.status === "error") return "error";
  return "idle";
}
