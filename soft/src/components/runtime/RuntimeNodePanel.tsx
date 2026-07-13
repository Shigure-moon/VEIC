import type { SetStateAction } from "react";
import { Metric } from "../common";
import type { Resource, ResourceForm } from "../../types";
import type { RuntimeProbe } from "../../tauri";
import { formatDateTime } from "../../utils/format";
import { preferredOverlayIp } from "../../utils/runtime";

export function RuntimeNodePanel({
  runtimeProbe,
  resourceForm,
  setResourceForm,
  publishedResource,
  busy,
  canPublishResource,
  onProbeRuntime,
  onPublishRuntimeResource,
  onHeartbeatResource,
  onOfflineResource,
}: {
  runtimeProbe: RuntimeProbe | undefined;
  resourceForm: ResourceForm;
  setResourceForm: (value: SetStateAction<ResourceForm>) => void;
  publishedResource: Resource | undefined;
  busy: string;
  canPublishResource: boolean;
  onProbeRuntime: () => Promise<void>;
  onPublishRuntimeResource: () => Promise<void>;
  onHeartbeatResource: () => Promise<void>;
  onOfflineResource: () => Promise<void>;
}) {
  return (
    <div className="runtime-node">
      <div className="panel-toolbar compact">
        <span className="block-label">Local Runtime Node</span>
        <button type="button" onClick={onProbeRuntime} disabled={Boolean(busy)}>
          探测本机
        </button>
      </div>

      {runtimeProbe ? (
        <div className="probe-grid">
          <Metric label="Hostname" value={runtimeProbe.hostname} />
          <Metric label="Stable ID" value={runtimeProbe.stableResourceId} />
          <Metric label="OS" value={`${runtimeProbe.os}/${runtimeProbe.arch}`} />
          <Metric label="LAN Hints" value={runtimeProbe.ipv4Addresses.join(", ") || "-"} />
          <Metric label="Overlay IP" value={preferredOverlayIp(runtimeProbe) || "-"} />
          <Metric label="Machine ID" value={runtimeProbe.overlay?.machineId || "-"} />
        </div>
      ) : (
        <p className="muted">Runtime probe has not run.</p>
      )}

      <div className="resource-form">
        <label className="field">
          <span>Resource Name</span>
          <input
            value={resourceForm.name}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Runtime Node"
          />
        </label>
        <label className="field">
          <span>Resource Type</span>
          <input
            value={resourceForm.resourceType}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, resourceType: event.target.value }))}
            placeholder="runtime_node"
          />
        </label>
        <label className="field">
          <span>Endpoint Type</span>
          <select
            value={resourceForm.endpointType}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, endpointType: event.target.value }))}
          >
            <option value="overlay">overlay</option>
            <option value="ipv6">ipv6</option>
            <option value="relay">relay</option>
          </select>
        </label>
        <label className="field">
          <span>Provider</span>
          <input
            value={resourceForm.provider}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, provider: event.target.value }))}
            placeholder="headscale"
          />
        </label>
        <label className="field">
          <span>Endpoint Address</span>
          <input
            value={resourceForm.address}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="100.x.x.x or IPv6"
          />
        </label>
        <label className="field">
          <span>Port</span>
          <input
            value={resourceForm.port}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, port: event.target.value }))}
            placeholder="optional"
          />
        </label>
        <label className="field field-wide">
          <span>Machine ID (overlay required)</span>
          <input
            value={resourceForm.machineId}
            onChange={(event) => setResourceForm((prev) => ({ ...prev, machineId: event.target.value }))}
            placeholder="headscale/tailscale machine id"
          />
        </label>
      </div>

      <div className="button-row">
        <button type="button" onClick={onPublishRuntimeResource} disabled={Boolean(busy) || !canPublishResource}>
          发布 Resource
        </button>
        <button type="button" onClick={onHeartbeatResource} disabled={Boolean(busy) || !publishedResource?.id}>
          心跳
        </button>
        <button type="button" onClick={onOfflineResource} disabled={Boolean(busy) || !publishedResource?.id}>
          下线
        </button>
      </div>

      {publishedResource ? (
        <div className="health-readout">
          <span>{publishedResource.name || publishedResource.id}</span>
          <time>{publishedResource.status || "unknown"} / lease {publishedResource.leaseExpiresAt ? formatDateTime(publishedResource.leaseExpiresAt) : "-"}</time>
        </div>
      ) : null}
    </div>
  );
}
