import { describe, expect, it } from "vitest";
import type { CapabilityProviderPolicy, Resource } from "../types";
import { buildCommandPaletteItems } from "./commands";

const resource: Resource = {
  id: "resource-1",
  name: "Kitchen Arm",
  resourceType: "arm/ur5",
  status: "online",
  capabilities: [
    {
      id: "capability-1",
      capabilityKey: "restart",
      capabilityKind: "ros2_service",
      provider: "mcp",
      protocol: "ros2",
      riskLevel: "high",
      status: "available",
    },
  ],
};

describe("buildCommandPaletteItems provider policy precheck", () => {
  it("marks capability intents as risk blocked when risk exceeds provider policy", () => {
    const policies: CapabilityProviderPolicy[] = [
      {
        provider: "mcp",
        status: "enabled",
        allowedRoles: ["owner", "admin", "member"],
        maxRiskLevel: "medium",
        requireSession: false,
        source: "stored",
      },
    ];

    const item = buildCommandPaletteItems({
      query: "restart",
      resources: [resource],
      providerPolicies: policies,
      providerPoliciesStatus: "ready",
      currentUserRole: "member",
      hasActiveSession: true,
    }).find((candidate) => candidate.kind === "capability_intent");

    expect(item?.policy?.status).toBe("risk_blocked");
    expect(item?.meta).toContain("RISK BLOCKED");
    expect(item?.policy?.detail).toContain("max medium");
  });

  it("marks allowed policies as needing session when the provider requires one", () => {
    const policies: CapabilityProviderPolicy[] = [
      {
        provider: "mcp",
        status: "enabled",
        allowedRoles: ["owner", "admin", "member"],
        maxRiskLevel: "critical",
        requireSession: true,
        source: "default",
      },
    ];

    const item = buildCommandPaletteItems({
      query: "restart",
      resources: [resource],
      providerPolicies: policies,
      providerPoliciesStatus: "ready",
      currentUserRole: "admin",
      hasActiveSession: false,
    }).find((candidate) => candidate.kind === "capability_intent");

    expect(item?.policy?.status).toBe("needs_session");
    expect(item?.meta).toContain("NEEDS SESSION");
    expect(item?.policy?.detail).toContain("session required");
  });
});
