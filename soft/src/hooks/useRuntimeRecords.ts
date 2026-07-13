import { useEffect, useState } from "react";
import { formatApiError, type VeicApiClient } from "../api/client";
import type { RuntimeRecordsHydration } from "../types";

const emptyRuntimeRecords: RuntimeRecordsHydration = {
  status: "idle",
  error: "",
  loadedAt: "",
  records: [],
};

export function useRuntimeRecords({
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
  const [state, setState] = useState<RuntimeRecordsHydration>(emptyRuntimeRecords);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setState(emptyRuntimeRecords);
      return undefined;
    }

    let cancelled = false;
    setState({
      ...emptyRuntimeRecords,
      status: "loading",
    });

    async function hydrate() {
      try {
        const records = await api.listRuntimeRecords(workspaceId, {
          limit: 80,
          resourceId: resourceId || undefined,
          recordKind: "all",
          includeExecutionEvents: true,
        });

        if (cancelled) return;
        setState({
          status: "ready",
          error: "",
          loadedAt: new Date().toISOString(),
          records: [...records].sort((a, b) => dateValue(b.startedAt) - dateValue(a.startedAt)),
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          ...emptyRuntimeRecords,
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

  return state;
}

function dateValue(value: string | undefined | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
