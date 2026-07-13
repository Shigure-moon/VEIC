import { DetailList, EmptyState, Metric, StatusBadge } from "../common";
import type { Resource, ResourceDetailHydration } from "../../types";
import { compactJson, formatDateTime, formatTime, partitionSummary, shortId } from "../../utils/format";

export function ResourceExplorer({
  resources,
  selectedResourceId,
  onSelect,
  detail,
}: {
  resources: Resource[];
  selectedResourceId: string;
  onSelect: (resourceId: string) => void;
  detail: ResourceDetailHydration;
}) {
  const selected = resources.find((resource) => resource.id === selectedResourceId) ?? resources[0];
  const groups = resources.reduce<Record<string, Resource[]>>((acc, resource) => {
    const key = resource.resourceType || "resource";
    acc[key] = [...(acc[key] ?? []), resource];
    return acc;
  }, {});
  const hydrated = detail.status === "ready";
  const capabilities = hydrated ? detail.capabilities : selected?.capabilities ?? [];
  const twin = hydrated ? detail.twin : selected?.twin;
  const invocations = hydrated ? detail.invocations.slice(0, 5) : [];
  const executionEvents = hydrated ? detail.executionEvents.slice(0, 6) : [];

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

            <div className="health-readout">
              <span>Hydration: {detailStatusLabel(detail)}</span>
              <time>{detail.loadedAt ? formatDateTime(detail.loadedAt) : "not loaded"}</time>
              {detail.status === "error" ? <em>API not available yet or request failed: {detail.error}</em> : null}
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
              items={capabilities.map((capability) => ({
                key: capability.id || capability.capabilityKey || "",
                title: capability.capabilityKey || "capability",
                detail: `${capability.capabilityKind || "custom"} / ${capability.provider || "-"} / ${capability.protocol || "-"} / ${capability.riskLevel || "low"} / ${capability.status || "unknown"}`,
              }))}
            />

            <div className="twin-summary">
              <span className="block-label">Twin Partitions</span>
              {twin ? (
                <div className="twin-grid">
                  <Metric label="Desired" value={partitionSummary(twin.desiredState)} />
                  <Metric label="Reported" value={partitionSummary(twin.reportedState)} />
                  <Metric label="Observed" value={partitionSummary(twin.observedState)} />
                </div>
              ) : (
                <p className="muted">Twin state is not present in this snapshot.</p>
              )}
            </div>

            <DetailList
              title="Twin Drift"
              empty={hydrated ? "No drift returned by the Resource Twin API." : "Resource drift will load from the detail API."}
              items={(hydrated ? detail.drifts : []).map((drift) => ({
                key: drift.id || `${drift.driftKey}-${drift.partition}`,
                title: `${drift.driftKey || "drift"} / ${drift.partition || "partition"} / ${drift.status || "unknown"}`,
                detail: `desired ${compactJson(drift.desiredValue)} -> actual ${compactJson(drift.actualValue)} / ${drift.lastDetectedAt ? formatTime(drift.lastDetectedAt) : "-"}`,
              }))}
            />

            <DetailList
              title="Recent Invocations"
              empty={hydrated ? "No capability invocation returned for this resource." : "Invocation history will load from the detail API."}
              items={invocations.map((invocation) => ({
                key: invocation.id || `${invocation.capabilityKey}-${invocation.startedAt}`,
                title: `${invocation.capabilityKey || "invocation"} / ${invocation.status || "unknown"}`,
                detail: `${invocation.provider || "-"} / ${invocation.protocol || "-"} / started ${invocation.startedAt ? formatTime(invocation.startedAt) : "-"} / finished ${invocation.finishedAt ? formatTime(invocation.finishedAt) : "-"}`,
              }))}
            />

            <DetailList
              title="Latest Execution Events"
              empty={hydrated ? "No execution events returned for the latest invocation." : "Execution events will load from the detail API."}
              items={executionEvents.map((event) => ({
                key: event.id || `${event.invocationId}-${event.sequence}`,
                title: `#${event.sequence ?? "-"} ${event.eventType || "event"}`,
                detail: `${event.traceId ? `trace ${shortId(event.traceId)}` : "no trace"} / ${event.createdAt ? formatTime(event.createdAt) : "-"} / ${compactJson(event.payload)}`,
              }))}
            />
          </>
        ) : (
          <EmptyState title="No Resource selected" detail="Publish or select a Resource to inspect endpoints, capabilities and twin state." />
        )}
      </div>
    </div>
  );
}

function detailStatusLabel(detail: ResourceDetailHydration) {
  if (detail.status === "loading") return "loading real API detail";
  if (detail.status === "ready") return "ready";
  if (detail.status === "error") return "error";
  return "idle";
}
