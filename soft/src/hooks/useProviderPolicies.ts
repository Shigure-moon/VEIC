import { useEffect, useState } from "react";
import { formatApiError, type VeicApiClient } from "../api/client";
import type { ProviderPoliciesHydration } from "../types";

const emptyPolicies: ProviderPoliciesHydration = {
  status: "idle",
  error: "",
  loadedAt: "",
  policies: [],
};

export function useProviderPolicies({
  api,
  workspaceId,
  enabled,
}: {
  api: VeicApiClient;
  workspaceId: string;
  enabled: boolean;
}) {
  const [state, setState] = useState<ProviderPoliciesHydration>(emptyPolicies);

  useEffect(() => {
    if (!enabled || !workspaceId) {
      setState(emptyPolicies);
      return undefined;
    }

    let cancelled = false;
    setState({
      ...emptyPolicies,
      status: "loading",
    });

    async function hydrate() {
      try {
        const policies = await api.listCapabilityProviderPolicies(workspaceId);
        if (cancelled) return;
        setState({
          status: "ready",
          error: "",
          loadedAt: new Date().toISOString(),
          policies,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          ...emptyPolicies,
          status: "error",
          error: formatApiError(err),
        });
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [api, enabled, workspaceId]);

  return state;
}
