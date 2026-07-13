import { useCallback, useState } from "react";
import { createVeicApiClient, formatApiError } from "../api/client";
import type { HealthState, Readiness } from "../types";
import { initialHealth } from "../types";

export function useHealth() {
  const [health, setHealth] = useState<HealthState>(initialHealth);

  const probeHealth = useCallback(async (baseUrl: string) => {
    const client = createVeicApiClient({ baseUrl });
    const checkedAt = new Date().toISOString();
    let service: HealthState["service"] = "unknown";
    let readiness: HealthState["readiness"] = "unknown";
    let readinessBody: Readiness | undefined;
    let message = "";

    try {
      const healthText = await client.health();
      service = "ok";
      message = typeof healthText === "string" ? healthText : "health ok";
    } catch (err) {
      service = "error";
      message = formatApiError(err);
    }

    try {
      readinessBody = await client.readiness();
      readiness = readinessBody.status === "ready" ? "ready" : "not_ready";
    } catch (err) {
      readiness = "error";
      if (!message || message === "health ok" || message === "OK") {
        message = formatApiError(err);
      }
    }

    setHealth({
      service,
      readiness,
      checkedAt,
      message: readinessBody?.database ? `${message} / db ${readinessBody.database}` : message,
    });
  }, []);

  return {
    health,
    probeHealth,
  };
}
