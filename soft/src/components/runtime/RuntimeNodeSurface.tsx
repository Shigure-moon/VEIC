import { EmptyState, Metric, SectionHeading } from "../common";
import { ResourceExplorer } from "../resources/ResourceExplorer";
import { ResourceTwinPanel } from "../resources/ResourceTwinPanel";
import { RuntimeNodePanel } from "./RuntimeNodePanel";
import type {
  Resource,
  ResourceForm,
  ResourceDetailHydration,
  Session,
  Workspace,
  WorkspaceMember,
} from "../../types";
import type { RuntimeProbe } from "../../tauri";
import type { SetStateAction } from "react";

export function RuntimeNodeSurface({
  selectedWorkspace,
  members,
  resources,
  sessions,
  selectedResourceId,
  setSelectedResourceId,
  resourceDetail,
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
  notice,
  error,
}: {
  selectedWorkspace: Workspace | undefined;
  members: WorkspaceMember[];
  resources: Resource[];
  sessions: Session[];
  selectedResourceId: string;
  setSelectedResourceId: (resourceId: string) => void;
  resourceDetail: ResourceDetailHydration;
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
  notice: string;
  error: string;
}) {
  const capabilityCount = resources.reduce((total, resource) => total + (resource.capabilities?.length ?? 0), 0);
  const robotCount = resources.filter((resource) => /robot|ros/i.test(resource.resourceType || "")).length;
  const agentCount =
    members.filter((member) => /agent/i.test(member.memberType || "")).length +
    resources.filter((resource) => /agent/i.test(resource.resourceType || "")).length;
  const selectedResource = resources.find((resource) => resource.id === selectedResourceId) ?? resources[0];

  return (
    <section className="panel runtime-panel">
      <SectionHeading eyebrow="Runtime" title="Current state" />
      {selectedWorkspace ? (
        <div className="workspace-detail">
          <div className="metric-grid">
            <Metric label="Network ID" value={selectedWorkspace.networkId || "-"} />
            <Metric label="Kind" value={selectedWorkspace.kind || "-"} />
            <Metric label="People" value={String(members.length)} />
            <Metric label="Agents" value={String(agentCount)} />
            <Metric label="Robots" value={String(robotCount)} />
            <Metric label="Resources" value={String(resources.length)} />
            <Metric label="Capabilities" value={String(capabilityCount)} />
            <Metric label="Sessions" value={String(sessions.length)} />
          </div>

          <ResourceExplorer
            resources={resources}
            selectedResourceId={selectedResourceId}
            onSelect={setSelectedResourceId}
            detail={resourceDetail}
          />

          <ResourceTwinPanel
            resource={selectedResource}
            detail={resourceDetail}
          />

          <RuntimeNodePanel
            runtimeProbe={runtimeProbe}
            resourceForm={resourceForm}
            setResourceForm={setResourceForm}
            publishedResource={publishedResource}
            busy={busy}
            canPublishResource={canPublishResource}
            onProbeRuntime={onProbeRuntime}
            onPublishRuntimeResource={onPublishRuntimeResource}
            onHeartbeatResource={onHeartbeatResource}
            onOfflineResource={onOfflineResource}
          />

          <div className="member-list">
            <span className="block-label">Members</span>
            {members.length === 0 ? (
              <p className="muted">No members returned by the detail API.</p>
            ) : (
              members.map((member) => (
                <div className="member-row" key={member.id || member.userId || member.displayName}>
                  <span>{member.displayName || member.userId || "member"}</span>
                  <em>{[member.role, member.memberType, member.status].filter(Boolean).join(" / ")}</em>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <EmptyState title="No Workspace selected" detail="Select a Workspace to show backend details here." />
      )}

      {notice || error ? (
        <div className={error ? "notice error" : "notice"}>
          {error || notice}
        </div>
      ) : null}
    </section>
  );
}
