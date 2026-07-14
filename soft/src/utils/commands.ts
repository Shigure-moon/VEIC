import type {
  Capability,
  CapabilityProviderPolicy,
  HydrationStatus,
  Resource,
  ResourceDetailHydration,
  WorkspaceRole,
} from "../types";
import { shortId } from "./format";

export type CommandPaletteItemKind = "open_resource" | "capability_intent";
export type CommandPolicyStatus =
  | "allowed"
  | "loading"
  | "unknown"
  | "provider_disabled"
  | "capability_unavailable"
  | "role_blocked"
  | "risk_blocked"
  | "needs_session";
export type CommandPolicyTone = "ok" | "warn" | "block" | "neutral";

export type CommandPolicyPreview = {
  status: CommandPolicyStatus;
  tone: CommandPolicyTone;
  label: string;
  detail: string;
};

export type CommandPaletteItem = {
  id: string;
  kind: CommandPaletteItemKind;
  title: string;
  detail: string;
  meta: string;
  resourceId: string;
  resourceName: string;
  capabilityKey?: string;
  riskLevel?: string | null;
  policy?: CommandPolicyPreview;
  score: number;
};

type CommandPaletteInput = {
  query: string;
  resources: Resource[];
  resourceDetail?: ResourceDetailHydration;
  selectedResourceId?: string;
  providerPolicies?: CapabilityProviderPolicy[];
  providerPoliciesStatus?: HydrationStatus;
  providerPoliciesError?: string;
  currentUserRole?: WorkspaceRole;
  hasActiveSession?: boolean;
  limit?: number;
};

type Candidate = Omit<CommandPaletteItem, "score"> & {
  searchable: unknown[];
  rank: number;
};

export function buildCommandPaletteItems(input: CommandPaletteInput): CommandPaletteItem[] {
  const terms = normalizeTerms(input.query);
  const candidates = buildCandidates(input.resources, input.resourceDetail, input.selectedResourceId, input);

  return candidates
    .map((candidate) => scoreCandidate(candidate, terms))
    .filter((item): item is CommandPaletteItem => Boolean(item))
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, input.limit ?? 12);
}

function buildCandidates(
  resources: Resource[],
  resourceDetail: ResourceDetailHydration | undefined,
  selectedResourceId: string | undefined,
  input?: Pick<
    CommandPaletteInput,
    "providerPolicies" | "providerPoliciesStatus" | "providerPoliciesError" | "currentUserRole" | "hasActiveSession"
  >,
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const resource of resources) {
    const resourceId = resource.id || "";
    if (!resourceId) continue;
    const resourceName = resource.name || resource.stableResourceId || shortId(resourceId);
    const resourceType = text(resource.resourceType);
    const status = text(resource.status);

    candidates.push({
      id: `open-resource:${resourceId}`,
      kind: "open_resource",
      title: `Open ${resourceName}`,
      detail: [resourceType, status, `${resource.capabilities?.length ?? 0} capabilities`]
        .filter(Boolean)
        .join(" / "),
      meta: "OPEN RESOURCE",
      resourceId,
      resourceName,
      searchable: [
        "open",
        "inspect",
        "resource",
        resource.id,
        resource.stableResourceId,
        resource.name,
        resource.resourceType,
        resource.status,
      ],
      rank: 100,
    });

    const capabilities = capabilityList(resource, resourceDetail, selectedResourceId);
    for (const capability of capabilities) {
      const capabilityKey = capability.capabilityKey || "capability";
      const riskLevel = capability.riskLevel || "";
      const policy = evaluateCapabilityPolicy({
        capability,
        policies: input?.providerPolicies,
        policiesStatus: input?.providerPoliciesStatus,
        policiesError: input?.providerPoliciesError,
        currentUserRole: input?.currentUserRole,
        hasActiveSession: input?.hasActiveSession,
      });
      const policyRankOffset = policy.tone === "block" ? -24 : policy.tone === "warn" ? -8 : 0;
      candidates.push({
        id: `capability:${resourceId}:${capability.id || capabilityKey}`,
        kind: "capability_intent",
        title: `${capabilityKey} · ${resourceName}`,
        detail: [
          capability.capabilityKind,
          capability.provider,
          capability.protocol,
          capability.status,
        ]
          .filter(Boolean)
          .join(" / ") || "capability",
        meta: riskLevel ? `${policy.label} / RISK ${riskLevel}` : policy.label,
        resourceId,
        resourceName,
        capabilityKey,
        riskLevel,
        policy,
        searchable: [
          "run",
          "execute",
          "invoke",
          "intent",
          "capability",
          "policy",
          "restart",
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
          policy.label,
          policy.detail,
        ],
        rank: (riskLevel.toLowerCase() === "high" ? 76 : 84) + policyRankOffset,
      });
    }
  }

  return candidates;
}

function capabilityList(
  resource: Resource,
  resourceDetail: ResourceDetailHydration | undefined,
  selectedResourceId: string | undefined,
): Capability[] {
  const byKey = new Map<string, Capability>();
  for (const capability of resource.capabilities ?? []) {
    byKey.set(capability.id || capability.capabilityKey || JSON.stringify(capability), capability);
  }
  if (resource.id && resource.id === selectedResourceId && resourceDetail?.status === "ready") {
    for (const capability of resourceDetail.capabilities) {
      byKey.set(capability.id || capability.capabilityKey || JSON.stringify(capability), capability);
    }
  }
  return [...byKey.values()];
}

function scoreCandidate(candidate: Candidate, terms: string[]): CommandPaletteItem | undefined {
  if (terms.length === 0) {
    return { ...candidate, score: candidate.rank };
  }

  const haystack = normalize(candidate.searchable.map(searchText).join(" "));
  if (!terms.every((term) => haystack.includes(term))) return undefined;

  const title = normalize(candidate.title);
  const detail = normalize(candidate.detail);
  const score = terms.reduce((total, term) => {
    if (title === term) return total + 80;
    if (title.includes(term)) return total + 36;
    if (detail.includes(term)) return total + 16;
    return total + 6;
  }, candidate.rank);

  return { ...candidate, score };
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

function text(value: unknown) {
  return searchText(value).trim();
}

function evaluateCapabilityPolicy({
  capability,
  policies,
  policiesStatus,
  policiesError,
  currentUserRole,
  hasActiveSession,
}: {
  capability: Capability;
  policies?: CapabilityProviderPolicy[];
  policiesStatus?: HydrationStatus;
  policiesError?: string;
  currentUserRole?: WorkspaceRole;
  hasActiveSession?: boolean;
}): CommandPolicyPreview {
  if (capability.status === "disabled" || capability.status === "unavailable") {
    return {
      status: "capability_unavailable",
      tone: "block",
      label: "CAPABILITY UNAVAILABLE",
      detail: `capability status ${capability.status}; no invocation from palette`,
    };
  }

  const provider = capability.provider;
  if (!provider) {
    return {
      status: "unknown",
      tone: "neutral",
      label: "POLICY UNKNOWN",
      detail: "capability has no provider; no invocation from palette",
    };
  }

  if (!policiesStatus || policiesStatus === "idle" || policiesStatus === "loading") {
    return {
      status: "loading",
      tone: "neutral",
      label: "POLICY LOADING",
      detail: `provider ${provider}; waiting for provider policies`,
    };
  }

  if (policiesStatus === "error") {
    return {
      status: "unknown",
      tone: "warn",
      label: "POLICY ERROR",
      detail: policiesError || `provider ${provider}; policy precheck failed`,
    };
  }

  const policy = (policies ?? []).find((candidate) => candidate.provider === provider);
  if (!policy) {
    return {
      status: "unknown",
      tone: "warn",
      label: "POLICY UNKNOWN",
      detail: `provider ${provider}; backend returned no matching policy`,
    };
  }

  if (policy.status === "disabled") {
    return {
      status: "provider_disabled",
      tone: "block",
      label: "PROVIDER DISABLED",
      detail: `${policySummary(policy)}; provider disabled`,
    };
  }

  const allowedRoles = policy.allowedRoles ?? ["owner", "admin", "member"];
  if (allowedRoles.length > 0 && currentUserRole && !allowedRoles.includes(currentUserRole)) {
    return {
      status: "role_blocked",
      tone: "block",
      label: "ROLE BLOCKED",
      detail: `${policySummary(policy)}; current role ${currentUserRole}`,
    };
  }

  if (allowedRoles.length > 0 && !currentUserRole) {
    return {
      status: "unknown",
      tone: "warn",
      label: "ROLE UNKNOWN",
      detail: `${policySummary(policy)}; current member role unavailable`,
    };
  }

  const riskLevel = capability.riskLevel ?? "low";
  const maxRiskLevel = policy.maxRiskLevel ?? "critical";
  if (riskRank(riskLevel) > riskRank(maxRiskLevel)) {
    return {
      status: "risk_blocked",
      tone: "block",
      label: "RISK BLOCKED",
      detail: `${policySummary(policy)}; capability risk ${riskLevel}`,
    };
  }

  if (policy.requireSession && !hasActiveSession) {
    return {
      status: "needs_session",
      tone: "warn",
      label: "NEEDS SESSION",
      detail: `${policySummary(policy)}; open a session before invocation`,
    };
  }

  const highRisk = riskRank(riskLevel) >= riskRank("high");
  return {
    status: "allowed",
    tone: highRisk ? "warn" : "ok",
    label: highRisk ? "POLICY OK / REVIEW" : "POLICY OK",
    detail: `${policySummary(policy)}; no invocation from palette`,
  };
}

function policySummary(policy: CapabilityProviderPolicy) {
  return [
    `provider ${policy.provider || "unknown"}`,
    `source ${policy.source || "unknown"}`,
    `roles ${(policy.allowedRoles ?? ["owner", "admin", "member"]).join(",") || "none"}`,
    `max ${policy.maxRiskLevel || "critical"}`,
    policy.requireSession ? "session required" : "no session required",
  ].join(" / ");
}

function riskRank(value: string) {
  switch (value.toLowerCase()) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 1;
  }
}
