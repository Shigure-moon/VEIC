import type { Schema } from "./api/client";

export type Readiness = Schema<"Readiness">;
export type UserProfile = Schema<"UserProfile">;
export type Workspace = Schema<"Workspace">;
export type WorkspaceDetail = Schema<"WorkspaceDetail">;
export type WorkspaceStateSnapshot = Schema<"WorkspaceStateSnapshot">;
export type Resource = Schema<"Resource">;
export type Capability = Schema<"Capability">;
export type ResourceTwinState = Schema<"ResourceTwinState">;
export type ResourceTwinDrift = Schema<"ResourceTwinDrift">;
export type CapabilityInvocation = Schema<"CapabilityInvocation">;
export type InvocationExecutionEvent = Schema<"InvocationExecutionEvent">;
export type WorkspaceMember = NonNullable<WorkspaceDetail["members"]>[number];
export type Session = NonNullable<WorkspaceStateSnapshot["sessions"]>[number];

export type HealthState = {
  service: "unknown" | "ok" | "error";
  readiness: "unknown" | "ready" | "not_ready" | "error";
  message: string;
  checkedAt: string;
};

export type TimelineStatus = "idle" | "syncing" | "watching" | "error";
export type HydrationStatus = "idle" | "loading" | "ready" | "error";
export type StatusTone = "neutral" | "good" | "bad" | "active";
export type RunTask = <T>(label: string, task: () => Promise<T>) => Promise<T | undefined>;

export type ResourceDetailHydration = {
  status: HydrationStatus;
  error: string;
  loadedAt: string;
  capabilities: Capability[];
  twin?: ResourceTwinState;
  drifts: ResourceTwinDrift[];
  invocations: CapabilityInvocation[];
  executionEvents: InvocationExecutionEvent[];
};

export const DEFAULT_API_BASE = "https://api.veic.tech";

export const initialHealth: HealthState = {
  service: "unknown",
  readiness: "unknown",
  message: "not checked",
  checkedAt: "",
};

export const initialResourceForm = {
  name: "",
  resourceType: "runtime_node",
  endpointType: "overlay",
  provider: "headscale",
  address: "",
  port: "",
  machineId: "",
};

export type ResourceForm = typeof initialResourceForm;
