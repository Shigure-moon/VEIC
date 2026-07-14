import { DetailList, EmptyState, Metric, StatusBadge } from "../common";
import type { Resource, ResourceDetailHydration, ResourceTwinState } from "../../types";
import { compactJson, formatDateTime, formatTime, partitionSummary, shortId } from "../../utils/format";

export function ResourceTwinPanel({
  resource,
  detail,
}: {
  resource: Resource | undefined;
  detail: ResourceDetailHydration;
}) {
  const hydrated = detail.status === "ready";
  const twin = hydrated ? detail.twin : resource?.twin;
  const drifts = hydrated ? detail.drifts : [];

  if (!resource) {
    return (
      <section className="resource-twin-panel">
        <EmptyState title="No Resource selected" detail="Select a Resource to inspect Resource Twin partitions." />
      </section>
    );
  }

  return (
    <section className="resource-twin-panel">
      <div className="resource-twin-head">
        <div>
          <span className="block-label">Resource Twin</span>
          <h3>{resource.name || "Unnamed Resource"}</h3>
        </div>
        <StatusBadge label={detailStatusLabel(detail)} tone={detail.status === "ready" ? "good" : detail.status === "error" ? "bad" : "neutral"} />
      </div>

      <div className="mini-grid">
        <Metric label="Resource" value={shortId(resource.id || resource.stableResourceId || "-")} />
        <Metric label="Type" value={resource.resourceType || "-"} />
        <Metric label="Loaded" value={detail.loadedAt ? formatTime(detail.loadedAt) : "-"} />
        <Metric label="Active Drift" value={String(drifts.filter((drift) => drift.status === "active").length)} />
      </div>

      {detail.status === "error" ? (
        <div className="timeline-error">Resource Twin API unavailable: {detail.error}</div>
      ) : null}

      {twin ? (
        <div className="twin-partition-grid">
          <TwinPartition title="Desired" value={twin.desiredState} />
          <TwinPartition title="Reported" value={twin.reportedState} />
          <TwinPartition title="Observed" value={twin.observedState} />
        </div>
      ) : (
        <p className="muted">No Resource Twin state returned for this Resource.</p>
      )}

      <DetailList
        title="Drift Timeline"
        empty={hydrated ? "No Resource Twin drift returned." : "Load Resource detail to inspect drift."}
        items={drifts.map((drift) => ({
          key: drift.id || `${drift.driftKey}-${drift.partition}-${drift.lastDetectedAt}`,
          title: `${drift.status || "unknown"} / ${drift.partition || "partition"} / ${drift.driftKey || "drift"}`,
          detail: [
            `desired ${compactJson(drift.desiredValue)}`,
            `actual ${compactJson(drift.actualValue)}`,
            drift.lastDetectedAt ? `last ${formatDateTime(drift.lastDetectedAt)}` : "",
          ].filter(Boolean).join(" / "),
        }))}
      />
    </section>
  );
}

function TwinPartition({
  title,
  value,
}: {
  title: string;
  value: ResourceTwinState["desiredState"];
}) {
  return (
    <div className="twin-partition">
      <div className="twin-partition-title">
        <span>{title}</span>
        <strong>{partitionSummary(value)}</strong>
      </div>
      <pre>{prettyJson(value)}</pre>
    </div>
  );
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
