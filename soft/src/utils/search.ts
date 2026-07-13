import type { CachedWorkspaceEvent, RuntimeLog } from "../tauri";
import type {
  Resource,
  ResourceDetailHydration,
  RuntimeRecord,
  Session,
  Workspace,
  WorkspaceMember,
} from "../types";
import { compactJson, eventSummary, formatTime, shortId } from "./format";

export type WorkspaceSearchSource =
  | "workspace"
  | "resource"
  | "endpoint"
  | "capability"
  | "member"
  | "session"
  | "timeline"
  | "runtime_record"
  | "runtime_log"
  | "twin"
  | "invocation";

export type WorkspaceSearchResult = {
  id: string;
  source: WorkspaceSearchSource;
  sourceLabel: string;
  title: string;
  detail: string;
  meta: string;
  score: number;
  time?: string;
  resourceId?: string;
};

type SearchInput = {
  query: string;
  selectedWorkspace: Workspace | undefined;
  members: WorkspaceMember[];
  resources: Resource[];
  sessions: Session[];
  timelineEvents: CachedWorkspaceEvent[];
  runtimeRecords: RuntimeRecord[];
  logs: RuntimeLog[];
  resourceDetail: ResourceDetailHydration;
  selectedResourceId: string;
  limit?: number;
};

type Candidate = Omit<WorkspaceSearchResult, "score"> & {
  searchable: unknown[];
  sourceRank: number;
};

const SOURCE_LABEL: Record<WorkspaceSearchSource, string> = {
  workspace: "Workspace",
  resource: "Resource",
  endpoint: "Endpoint",
  capability: "Capability",
  member: "Member",
  session: "Session",
  timeline: "Timeline",
  runtime_record: "Runtime Record",
  runtime_log: "Runtime Log",
  twin: "Twin",
  invocation: "Invocation",
};

const SOURCE_RANK: Record<WorkspaceSearchSource, number> = {
  workspace: 100,
  resource: 92,
  endpoint: 88,
  capability: 86,
  twin: 78,
  invocation: 74,
  timeline: 70,
  runtime_record: 76,
  member: 62,
  session: 58,
  runtime_log: 48,
};

export function buildWorkspaceSearchResults(input: SearchInput): WorkspaceSearchResult[] {
  const terms = normalizeTerms(input.query);
  if (terms.length === 0) return [];

  const candidates = buildCandidates(input);
  return candidates
    .map((candidate) => scoreCandidate(candidate, terms))
    .filter((result): result is WorkspaceSearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score || timeValue(b.time) - timeValue(a.time) || a.title.localeCompare(b.title))
    .slice(0, input.limit ?? 16);
}

function buildCandidates(input: SearchInput): Candidate[] {
  const candidates: Candidate[] = [];
  const workspace = input.selectedWorkspace;
  if (workspace) {
    push(candidates, {
      source: "workspace",
      id: `workspace:${workspace.id || workspace.networkId || workspace.name}`,
      title: workspace.name || "Workspace",
      detail: `network ${value(workspace.networkId)} / ${value(workspace.kind)} / ${value(workspace.status)}`,
      meta: workspace.id ? `id ${shortId(workspace.id)}` : "selected workspace",
      searchable: [
        workspace.id,
        workspace.name,
        workspace.networkId,
        workspace.kind,
        workspace.status,
      ],
    });
  }

  for (const resource of input.resources) {
    const resourceId = resource.id || resource.stableResourceId || resource.name || "";
    const resourceText = [
      resource.id,
      resource.stableResourceId,
      resource.name,
      resource.resourceType,
      resource.status,
      resource.ownerUserId,
    ];

    push(candidates, {
      source: "resource",
      id: `resource:${resourceId}`,
      title: resource.name || "Unnamed Resource",
      detail: `${value(resource.resourceType)} / ${value(resource.status)} / ${resource.endpoints?.length ?? 0} endpoints / ${resource.capabilities?.length ?? 0} capabilities`,
      meta: resource.stableResourceId ? `stable ${shortId(resource.stableResourceId)}` : `id ${shortId(resourceId)}`,
      resourceId: resource.id || "",
      searchable: resourceText,
    });

    for (const endpoint of resource.endpoints ?? []) {
      push(candidates, {
        source: "endpoint",
        id: `endpoint:${endpoint.id || resourceId}:${endpoint.address || endpoint.machineId || endpoint.endpointType}`,
        title: `${value(endpoint.endpointType)} / ${value(endpoint.provider)}`,
        detail: `${value(endpoint.address)}${endpoint.port ? `:${endpoint.port}` : ""} / ${value(endpoint.status)} / machine ${value(endpoint.machineId)}`,
        meta: resource.name || shortId(resourceId),
        resourceId: resource.id || "",
        searchable: [
          resource.name,
          resource.resourceType,
          endpoint.id,
          endpoint.endpointType,
          endpoint.provider,
          endpoint.address,
          endpoint.machineId,
          endpoint.status,
          endpoint.metadata,
        ],
      });
    }

    for (const capability of resource.capabilities ?? []) {
      push(candidates, {
        source: "capability",
        id: `capability:${capability.id || resourceId}:${capability.capabilityKey}`,
        title: capability.capabilityKey || "capability",
        detail: `${resource.name || "resource"} / ${value(capability.capabilityKind)} / ${value(capability.provider)} / ${value(capability.protocol)} / ${value(capability.riskLevel)} / ${value(capability.status)}`,
        meta: resource.name || shortId(resourceId),
        resourceId: resource.id || "",
        searchable: [
          resource.name,
          resource.resourceType,
          capability.id,
          capability.capabilityKey,
          capability.capabilityKind,
          capability.provider,
          capability.protocol,
          capability.riskLevel,
          capability.status,
          capability.metadata,
        ],
      });
    }
  }

  for (const member of input.members) {
    push(candidates, {
      source: "member",
      id: `member:${member.id || member.userId || member.displayName}`,
      title: member.displayName || member.userId || "member",
      detail: [member.role, member.memberType, member.status].filter(Boolean).join(" / ") || "workspace member",
      meta: member.userId ? `user ${shortId(member.userId)}` : "membership",
      searchable: [member.id, member.userId, member.displayName, member.role, member.memberType, member.status],
    });
  }

  for (const sessionGroup of input.sessions) {
    const session = sessionGroup.session;
    const connections = sessionGroup.connections ?? [];
    if (!session) continue;
    const connectionResourceIds = connections
      .map((connection) => connection.resourceId)
      .filter((resourceId): resourceId is string => Boolean(resourceId));
    const primaryResourceId = connectionResourceIds[0] || "";
    push(candidates, {
      source: "session",
      id: `session:${session.id || session.status || session.createdAt}`,
      title: session.id ? `Session ${shortId(session.id)}` : "Session",
      detail: [
        session.status,
        session.createdAt ? `created ${formatTime(session.createdAt)}` : "",
        `${connections.length} connections`,
      ]
        .filter(Boolean)
        .join(" / "),
      meta: primaryResourceId ? `resource ${shortId(primaryResourceId)}` : "workspace session",
      resourceId: primaryResourceId,
      time: session.createdAt || undefined,
      searchable: [session.id, session.status, session.createdAt, connections],
    });
  }

  for (const event of input.timelineEvents.slice(0, 120)) {
    const summary = eventSummary(event);
    push(candidates, {
      source: "timeline",
      id: `timeline:${event.workspaceId}:${event.revision}:${event.id}`,
      title: event.eventType || "workspace.event",
      detail: summary,
      meta: `revision ${event.revision}`,
      time: event.createdAt,
      resourceId: event.subjectId || undefined,
      searchable: [
        event.id,
        event.eventType,
        event.actorUserId,
        event.subjectId,
        event.revision,
        summary,
        event.payload,
      ],
    });
  }

  for (const record of input.runtimeRecords.slice(0, 120)) {
    const recordId = record.recordId || record.traceId || record.capabilityKey || "";
    push(candidates, {
      source: "runtime_record",
      id: `runtime-record:${recordId}:${record.startedAt || ""}`,
      title: record.capabilityKey || record.toolName || "runtime record",
      detail: `${value(record.recordKind)} / ${value(record.status)} / ${value(record.provider)} / ${value(record.protocol)} / ${compactJson(record.error || record.response || record.request)}`,
      meta: record.traceId ? `trace ${shortId(record.traceId)}` : `${record.executionEvents?.length ?? 0} execution events`,
      time: record.startedAt || record.finishedAt || undefined,
      resourceId: record.resourceId || undefined,
      searchable: [
        record.recordKind,
        record.recordId,
        record.resourceId,
        record.capabilityId,
        record.capabilityKey,
        record.provider,
        record.protocol,
        record.toolName,
        record.status,
        record.request,
        record.response,
        record.error,
        record.runtimeMetadata,
        record.traceId,
        record.spanId,
        record.correlationId,
        record.executionEvents,
      ],
    });
  }

  for (const log of input.logs.slice(0, 120)) {
    push(candidates, {
      source: "runtime_log",
      id: `log:${log.id}:${log.createdAt}`,
      title: log.level,
      detail: log.message,
      meta: "local runtime log",
      time: log.createdAt,
      searchable: [log.level, log.message, log.createdAt],
    });
  }

  const selectedResource = input.resources.find((resource) => resource.id === input.selectedResourceId);
  if (input.resourceDetail.status === "ready" && selectedResource) {
    const resourceLabel = selectedResource.name || shortId(selectedResource.id || selectedResource.stableResourceId || "");
    if (input.resourceDetail.twin) {
      push(candidates, {
        source: "twin",
        id: `twin:${selectedResource.id}`,
        title: `${resourceLabel} twin state`,
        detail: `desired ${compactJson(input.resourceDetail.twin.desiredState)} / reported ${compactJson(input.resourceDetail.twin.reportedState)} / observed ${compactJson(input.resourceDetail.twin.observedState)}`,
        meta: "selected resource detail",
        resourceId: selectedResource.id || "",
        searchable: [
          selectedResource.name,
          selectedResource.resourceType,
          input.resourceDetail.twin.desiredState,
          input.resourceDetail.twin.reportedState,
          input.resourceDetail.twin.observedState,
        ],
      });
    }

    for (const drift of input.resourceDetail.drifts) {
      push(candidates, {
        source: "twin",
        id: `drift:${drift.id || drift.driftKey}`,
        title: `${value(drift.driftKey)} / ${value(drift.status)}`,
        detail: `${value(drift.partition)} / desired ${compactJson(drift.desiredValue)} / actual ${compactJson(drift.actualValue)}`,
        meta: resourceLabel,
        resourceId: selectedResource.id || "",
        time: drift.lastDetectedAt || undefined,
        searchable: [
          selectedResource.name,
          drift.id,
          drift.driftKey,
          drift.status,
          drift.partition,
          drift.desiredValue,
          drift.actualValue,
        ],
      });
    }

    for (const invocation of input.resourceDetail.invocations.slice(0, 20)) {
      push(candidates, {
        source: "invocation",
        id: `invocation:${invocation.id || invocation.capabilityKey}`,
        title: invocation.capabilityKey || "capability invocation",
        detail: `${value(invocation.status)} / ${value(invocation.provider)} / ${value(invocation.protocol)} / ${compactJson(invocation.error || invocation.response || invocation.request)}`,
        meta: resourceLabel,
        resourceId: selectedResource.id || "",
        time: invocation.startedAt || invocation.finishedAt || undefined,
        searchable: [
          selectedResource.name,
          invocation.id,
          invocation.capabilityKey,
          invocation.status,
          invocation.provider,
          invocation.protocol,
          invocation.request,
          invocation.response,
          invocation.error,
        ],
      });
    }

    for (const event of input.resourceDetail.executionEvents.slice(0, 20)) {
      push(candidates, {
        source: "invocation",
        id: `execution:${event.id || `${event.invocationId}:${event.sequence}`}`,
        title: `#${event.sequence ?? "-"} ${event.eventType || "execution event"}`,
        detail: `${event.traceId ? `trace ${shortId(event.traceId)}` : "no trace"} / ${compactJson(event.payload)}`,
        meta: resourceLabel,
        resourceId: selectedResource.id || "",
        time: event.createdAt || undefined,
        searchable: [
          selectedResource.name,
          event.id,
          event.invocationId,
          event.eventType,
          event.traceId,
          event.spanId,
          event.payload,
        ],
      });
    }
  }

  return candidates;
}

function push(
  candidates: Candidate[],
  candidate: Omit<Candidate, "sourceLabel" | "sourceRank">,
) {
  candidates.push({
    ...candidate,
    sourceLabel: SOURCE_LABEL[candidate.source],
    sourceRank: SOURCE_RANK[candidate.source],
  });
}

function scoreCandidate(candidate: Candidate, terms: string[]): WorkspaceSearchResult | undefined {
  const haystack = normalize(candidate.searchable.map(searchText).join(" "));
  if (!terms.every((term) => haystack.includes(term))) return undefined;

  const title = normalize(candidate.title);
  const detail = normalize(candidate.detail);
  const exactBoost = terms.reduce((score, term) => {
    if (title === term) return score + 80;
    if (title.includes(term)) return score + 35;
    if (detail.includes(term)) return score + 14;
    return score + 4;
  }, 0);

  return {
    id: candidate.id,
    source: candidate.source,
    sourceLabel: candidate.sourceLabel,
    title: candidate.title,
    detail: candidate.detail,
    meta: candidate.meta,
    time: candidate.time,
    resourceId: candidate.resourceId,
    score: candidate.sourceRank + exactBoost,
  };
}

function normalizeTerms(query: string) {
  return normalize(query)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function searchText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function value(text: unknown) {
  const normalized = searchText(text).trim();
  return normalized || "-";
}

function timeValue(value: string | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
