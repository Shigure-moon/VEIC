import { useCallback, useState } from "react";
import type { PublishResourceRequest, VeicApiClient } from "../api/client";
import { getRuntimeProbe, type RuntimeProbe } from "../tauri";
import {
  initialResourceForm,
  type Resource,
  type ResourceForm,
  type RunTask,
} from "../types";
import { resourceFormFromProbe } from "../utils/runtime";

export function useRuntimeProbe({
  api,
  selectedWorkspaceId,
  isLoggedIn,
  runTask,
  refreshWorkspaceState,
}: {
  api: VeicApiClient;
  selectedWorkspaceId: string;
  isLoggedIn: boolean;
  runTask: RunTask;
  refreshWorkspaceState: (workspaceId?: string) => Promise<unknown>;
}) {
  const [runtimeProbe, setRuntimeProbe] = useState<RuntimeProbe | undefined>();
  const [publishedResource, setPublishedResource] = useState<Resource | undefined>();
  const [resourceForm, setResourceForm] = useState<ResourceForm>(initialResourceForm);

  const applyRuntimeProbe = useCallback((probe: RuntimeProbe) => {
    setRuntimeProbe(probe);
    setResourceForm((prev) => resourceFormFromProbe(prev, probe));
  }, []);

  const handleProbeRuntime = useCallback(async () => {
    await runTask("探测本机 Runtime", async () => {
      const probe = await getRuntimeProbe();
      applyRuntimeProbe(probe);
    });
  }, [applyRuntimeProbe, runTask]);

  const handlePublishRuntimeResource = useCallback(async () => {
    await runTask("发布 Runtime Resource", async () => {
      if (!selectedWorkspaceId) throw new Error("请先选择 Workspace");
      if (!runtimeProbe) throw new Error("请先探测本机 Runtime");
      const endpointType = resourceForm.endpointType.trim();
      const address = resourceForm.address.trim();
      if (!address) throw new Error("Overlay, IPv6, or relay endpoint address is required");
      if (endpointType === "lan") throw new Error("LAN-only Resource is not accepted by the backend. LAN addresses are metadata hints only.");
      if (endpointType === "overlay" && !resourceForm.machineId.trim()) {
        throw new Error("Headscale/Tailscale overlay endpoint requires machineId");
      }

      const port = Number.parseInt(resourceForm.port, 10);
      const body: PublishResourceRequest = {
        stableResourceId: runtimeProbe.stableResourceId,
        name: resourceForm.name.trim() || runtimeProbe.hostname,
        resourceType: resourceForm.resourceType.trim() || "runtime_node",
        leaseTtlSeconds: 90,
        endpoints: [
          {
            endpointType: endpointType as "ipv6" | "overlay" | "relay" | "lan",
            provider: resourceForm.provider.trim() || "native",
            address,
            port: Number.isFinite(port) ? port : undefined,
            machineId: resourceForm.machineId.trim() || undefined,
            priority: 100,
            metadata: {
              source: "veic-runtime-desktop",
              hostname: runtimeProbe.hostname,
              username: runtimeProbe.username,
              os: runtimeProbe.os,
              arch: runtimeProbe.arch,
              lanHints: runtimeProbe.ipv4Addresses,
            },
          },
        ],
        capabilities: [
          {
            capabilityKey: "runtime.health_check",
            capabilityKind: "metrics",
            provider: "native",
            protocol: "custom",
            riskLevel: "low",
            status: "available",
            metadata: {
              source: "veic-runtime-desktop",
              description: "Local runtime node health heartbeat",
            },
          },
        ],
        metadata: {
          source: "veic-runtime-desktop",
          hostname: runtimeProbe.hostname,
          os: runtimeProbe.os,
          arch: runtimeProbe.arch,
        },
      };
      const resource = await api.publishResource(selectedWorkspaceId, body);
      setPublishedResource(resource);
      await refreshWorkspaceState(selectedWorkspaceId);
    });
  }, [api, refreshWorkspaceState, resourceForm, runtimeProbe, runTask, selectedWorkspaceId]);

  const handleHeartbeatResource = useCallback(async () => {
    await runTask("Runtime 心跳", async () => {
      if (!selectedWorkspaceId || !publishedResource?.id) throw new Error("当前没有已发布的 Runtime Resource");
      await api.heartbeatResource(selectedWorkspaceId, publishedResource.id);
      await refreshWorkspaceState(selectedWorkspaceId);
    });
  }, [api, publishedResource, refreshWorkspaceState, runTask, selectedWorkspaceId]);

  const handleOfflineResource = useCallback(async () => {
    await runTask("Runtime 下线", async () => {
      if (!selectedWorkspaceId || !publishedResource?.id) throw new Error("当前没有已发布的 Runtime Resource");
      const resource = await api.offlineResource(selectedWorkspaceId, publishedResource.id);
      setPublishedResource(resource);
      await refreshWorkspaceState(selectedWorkspaceId);
    });
  }, [api, publishedResource, refreshWorkspaceState, runTask, selectedWorkspaceId]);

  const clearPublishedResource = useCallback(() => {
    setPublishedResource(undefined);
  }, []);

  return {
    runtimeProbe,
    applyRuntimeProbe,
    publishedResource,
    clearPublishedResource,
    resourceForm,
    setResourceForm,
    canPublishResource: Boolean(isLoggedIn && selectedWorkspaceId),
    handleProbeRuntime,
    handlePublishRuntimeResource,
    handleHeartbeatResource,
    handleOfflineResource,
  };
}
