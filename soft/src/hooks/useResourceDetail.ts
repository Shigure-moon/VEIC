import { useEffect, useState } from "react";
import { formatApiError, type VeicApiClient } from "../api/client";
import type { ResourceDetailHydration } from "../types";

const emptyDetail: ResourceDetailHydration = {
  status: "idle",
  error: "",
  loadedAt: "",
  capabilities: [],
  drifts: [],
  invocations: [],
  executionEvents: [],
};

export function useResourceDetail({
  api,
  workspaceId,
  resourceId,
  enabled,
}: {
  api: VeicApiClient;
  workspaceId: string;
  resourceId: string;
  enabled: boolean;
}) {
  const [detail, setDetail] = useState<ResourceDetailHydration>(emptyDetail);

  useEffect(() => {
    if (!enabled || !workspaceId || !resourceId) {
      setDetail(emptyDetail);
      return undefined;
    }

    let cancelled = false;
    setDetail({
      ...emptyDetail,
      status: "loading",
    });

    async function hydrate() {
      try {
        const [capabilities, twin, drifts, invocations] = await Promise.all([
          api.listResourceCapabilities(workspaceId, resourceId),
          api.getResourceTwinState(workspaceId, resourceId),
          api.listResourceTwinDrifts(workspaceId, resourceId),
          api.listCapabilityInvocations(workspaceId, resourceId),
        ]);
        const sortedInvocations = [...invocations].sort((a, b) => dateValue(b.startedAt) - dateValue(a.startedAt));
        const latestInvocationId = sortedInvocations[0]?.id || "";
        const executionEvents = latestInvocationId
          ? await api.listCapabilityInvocationExecutionEvents(workspaceId, latestInvocationId)
          : [];

        if (cancelled) return;
        setDetail({
          status: "ready",
          error: "",
          loadedAt: new Date().toISOString(),
          capabilities,
          twin,
          drifts,
          invocations: sortedInvocations,
          executionEvents,
        });
      } catch (err) {
        if (cancelled) return;
        setDetail({
          ...emptyDetail,
          status: "error",
          error: formatApiError(err),
        });
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [api, enabled, resourceId, workspaceId]);

  return detail;
}

function dateValue(value: string | undefined | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
