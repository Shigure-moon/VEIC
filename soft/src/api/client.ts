import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schema<K extends keyof components["schemas"]> = components["schemas"][K];
export type JsonObject = Record<string, unknown>;
export type WorkspaceEvent = Schema<"WorkspaceEvent">;
export type WorkspaceSync = Schema<"WorkspaceSync">;
export type CapabilityInvocation = Schema<"CapabilityInvocation">;
export type RuntimeRecordKind = "all" | "generic" | "mcp";

export type ApiBaseConfig = {
  baseUrl: string;
  token?: string;
};

export type PublishResourceRequest = {
  stableResourceId?: string;
  name: string;
  resourceType: string;
  endpoints: Array<Omit<Schema<"ResourceEndpointInput">, "metadata"> & { metadata?: JsonObject }>;
  capabilities?: Array<Omit<Schema<"CapabilityInput">, "metadata"> & { metadata?: JsonObject }>;
  metadata?: JsonObject;
  leaseTtlSeconds?: number;
};

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

export class VeicApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: unknown;

  constructor(status: number, code: string, message: string, detail: unknown) {
    super(message);
    this.name = "VeicApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export class VeicApiClient {
  private readonly client;

  constructor(private readonly baseUrl: string, private token = "") {
    this.client = createClient<paths>({ baseUrl: this.baseUrl });
  }

  setToken(token: string) {
    this.token = token;
  }

  private headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : undefined;
  }

  private async unwrap<T>(result: ApiResult<T>): Promise<T> {
    if (result.error || !result.response.ok) {
      const detail = result.error ?? { status: result.response.status };
      const record = isRecord(detail) ? detail : {};
      const code = typeof record.code === "string" ? record.code : `http_${result.response.status}`;
      const fallbackMessage = await readErrorBody(result.response);
      const message = typeof record.message === "string"
        ? record.message
        : fallbackMessage || result.response.statusText || "API request failed";
      throw new VeicApiError(result.response.status, code, message, detail);
    }
    return result.data as T;
  }

  private async send<T>(promise: Promise<ApiResult<T>>): Promise<T> {
    return this.unwrap<T>(await promise);
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new VeicApiError(
        response.status,
        `http_${response.status}`,
        (await readErrorBody(response)) || response.statusText || "Health check failed",
        { status: response.status },
      );
    }
    return response.text();
  }

  readiness() {
    return this.send(this.client.GET("/health/ready"));
  }

  login(body: { login: string; password: string }) {
    return this.send(this.client.POST("/api/v2/auth/login", { body }));
  }

  register(body: { email: string; username: string; password: string }) {
    return this.send(this.client.POST("/api/v2/auth/register", { body }));
  }

  me() {
    return this.send(this.client.GET("/api/v2/auth/me", { headers: this.headers() }));
  }

  listWorkspaces() {
    return this.send(this.client.GET("/api/v2/workspaces", { headers: this.headers() }));
  }

  getWorkspace(workspaceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}", {
      headers: this.headers(),
      params: { path: { workspaceId } },
    }));
  }

  getWorkspaceState(workspaceId: string, recentObservations = 20) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/state", {
      headers: this.headers(),
      params: { path: { workspaceId }, query: { recentObservations } },
    }));
  }

  listResources(workspaceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/resources", {
      headers: this.headers(),
      params: { path: { workspaceId } },
    }));
  }

  getResourceTwinState(workspaceId: string, resourceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/resources/{resourceId}/twin", {
      headers: this.headers(),
      params: { path: { workspaceId, resourceId } },
    }));
  }

  listResourceTwinDrifts(workspaceId: string, resourceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/resources/{resourceId}/twin/drifts", {
      headers: this.headers(),
      params: { path: { workspaceId, resourceId } },
    }));
  }

  listResourceCapabilities(workspaceId: string, resourceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/resources/{resourceId}/capabilities", {
      headers: this.headers(),
      params: { path: { workspaceId, resourceId } },
    }));
  }

  listCapabilityProviderPolicies(workspaceId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/policies/providers", {
      headers: this.headers(),
      params: { path: { workspaceId } },
    }));
  }

  syncWorkspace(workspaceId: string, afterRevision = 0) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/sync", {
      headers: this.headers(),
      params: { path: { workspaceId }, query: { afterRevision } },
    }));
  }

  waitWorkspaceEvents(workspaceId: string, afterRevision = 0, timeoutSeconds = 20) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/events/wait", {
      headers: this.headers(),
      params: { path: { workspaceId }, query: { afterRevision, timeoutSeconds } },
    }));
  }

  listCapabilityInvocations(workspaceId: string, resourceId?: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/invocations", {
      headers: this.headers(),
      params: { path: { workspaceId }, query: resourceId ? { resourceId } : undefined },
    }));
  }

  listRuntimeRecords(
    workspaceId: string,
    query: {
      limit?: number;
      resourceId?: string;
      traceId?: string;
      recordKind?: RuntimeRecordKind;
      includeExecutionEvents?: boolean;
    } = {},
  ) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/runtime-records", {
      headers: this.headers(),
      params: { path: { workspaceId }, query },
    }));
  }

  getCapabilityInvocation(workspaceId: string, capabilityInvocationId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/invocations/{capabilityInvocationId}", {
      headers: this.headers(),
      params: { path: { workspaceId, capabilityInvocationId } },
    }));
  }

  listCapabilityInvocationExecutionEvents(workspaceId: string, capabilityInvocationId: string) {
    return this.send(this.client.GET("/api/v2/workspaces/{workspaceId}/invocations/{capabilityInvocationId}/execution-events", {
      headers: this.headers(),
      params: { path: { workspaceId, capabilityInvocationId } },
    }));
  }

  publishResource(workspaceId: string, body: PublishResourceRequest) {
    return this.send(this.client.POST("/api/v2/workspaces/{workspaceId}/resources/publish", {
      headers: this.headers(),
      params: { path: { workspaceId } },
      body: body as never,
    }));
  }

  heartbeatResource(workspaceId: string, resourceId: string) {
    return this.send(this.client.POST("/api/v2/workspaces/{workspaceId}/resources/{resourceId}/heartbeat", {
      headers: this.headers(),
      params: { path: { workspaceId, resourceId } },
    }));
  }

  offlineResource(workspaceId: string, resourceId: string, reason = "runtime_node_release") {
    return this.send(this.client.POST("/api/v2/workspaces/{workspaceId}/resources/{resourceId}/offline", {
      headers: this.headers(),
      params: { path: { workspaceId, resourceId } },
      body: { reason },
    }));
  }
}

export function createVeicApiClient({ baseUrl, token }: ApiBaseConfig) {
  return new VeicApiClient(normalizeApiBaseUrl(baseUrl), token);
}

export function normalizeApiBaseUrl(baseUrl: string) {
  return (baseUrl || "https://api.veic.tech").trim().replace(/\/+$/, "");
}

export function formatApiError(error: unknown) {
  if (error instanceof VeicApiError) {
    return `${error.status} ${error.code}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readErrorBody(response: Response) {
  try {
    const text = await response.clone().text();
    if (!text) return "";
    try {
      const parsed = JSON.parse(text) as unknown;
      if (isRecord(parsed) && typeof parsed.message === "string") return parsed.message;
    } catch {
      // Framework-level errors may be plain text.
    }
    return text;
  } catch {
    return "";
  }
}
