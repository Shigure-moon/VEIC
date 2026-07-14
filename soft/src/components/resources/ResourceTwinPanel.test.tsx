import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResourceTwinPanel } from "./ResourceTwinPanel";
import type { Resource, ResourceDetailHydration } from "../../types";

const resource: Resource = {
  id: "resource-1",
  name: "Kitchen Arm",
  resourceType: "arm/ur5",
  status: "online",
};

const detail: ResourceDetailHydration = {
  status: "ready",
  error: "",
  loadedAt: "2026-07-14T02:00:00.000Z",
  capabilities: [],
  twin: {
    desiredState: { mode: "safe", batteryThreshold: 20 },
    reportedState: { mode: "safe", batteryCapacity: 78 },
    observedState: { workspaceOccupied: true },
  },
  drifts: [
    {
      id: "drift-1",
      driftKey: "batteryCapacity",
      partition: "reported",
      desiredValue: 96,
      actualValue: 78,
      status: "active",
      lastDetectedAt: "2026-07-14T02:01:00.000Z",
    },
  ],
  invocations: [],
  executionEvents: [],
};

describe("ResourceTwinPanel smoke", () => {
  it("renders selected resource twin partitions and drift", () => {
    render(<ResourceTwinPanel resource={resource} detail={detail} />);

    expect(screen.getByText("Kitchen Arm")).toBeInTheDocument();
    expect(screen.getByText("Desired")).toBeInTheDocument();
    expect(screen.getByText("Reported")).toBeInTheDocument();
    expect(screen.getByText("Observed")).toBeInTheDocument();
    expect(screen.getAllByText(/batteryCapacity/).length).toBeGreaterThan(0);
    expect(screen.getByText(/desired 96/)).toBeInTheDocument();
  });
});
