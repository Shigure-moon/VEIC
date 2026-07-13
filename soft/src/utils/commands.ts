import type { Capability, Resource, ResourceDetailHydration } from "../types";
import { shortId } from "./format";

export type CommandPaletteItemKind = "open_resource" | "capability_intent";

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
  score: number;
};

type CommandPaletteInput = {
  query: string;
  resources: Resource[];
  resourceDetail?: ResourceDetailHydration;
  selectedResourceId?: string;
  limit?: number;
};

type Candidate = Omit<CommandPaletteItem, "score"> & {
  searchable: unknown[];
  rank: number;
};

export function buildCommandPaletteItems(input: CommandPaletteInput): CommandPaletteItem[] {
  const terms = normalizeTerms(input.query);
  const candidates = buildCandidates(input.resources, input.resourceDetail, input.selectedResourceId);

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
        meta: riskLevel ? `LOCAL INTENT / RISK ${riskLevel}` : "LOCAL INTENT",
        resourceId,
        resourceName,
        capabilityKey,
        riskLevel,
        searchable: [
          "run",
          "execute",
          "invoke",
          "intent",
          "capability",
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
        ],
        rank: riskLevel.toLowerCase() === "high" ? 76 : 84,
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
