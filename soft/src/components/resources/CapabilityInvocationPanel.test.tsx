import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CapabilityInvocationPanel } from "./CapabilityInvocationPanel";
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
  loadedAt: "2026-07-14T03:00:00.000Z",
  capabilities: [],
  drifts: [],
  invocations: [
    {
      id: "invocation-1",
      capabilityKey: "restart",
      provider: "mcp",
      protocol: "ros2",
      status: "succeeded",
      request: { mode: "soft" } as never,
      response: { ok: true } as never,
      startedAt: "2026-07-14T03:00:00.000Z",
      finishedAt: "2026-07-14T03:00:05.000Z",
    },
    {
      id: "invocation-2",
      capabilityKey: "calibrate",
      provider: "resource_service",
      protocol: "http",
      status: "failed",
      request: { target: "battery" } as never,
      error: "battery calibration failed",
      startedAt: "2026-07-14T02:50:00.000Z",
      finishedAt: "2026-07-14T02:50:04.000Z",
    },
  ],
  executionEvents: [
    {
      id: "event-1",
      invocationId: "invocation-1",
      sequence: 1,
      eventType: "scheduled",
      payload: { worker: "policy-gate" },
      createdAt: "2026-07-14T03:00:01.000Z",
    },
    {
      id: "event-2",
      invocationId: "invocation-1",
      sequence: 2,
      eventType: "completed",
      payload: { durationMs: 5000 },
      createdAt: "2026-07-14T03:00:05.000Z",
    },
  ],
};

describe("CapabilityInvocationPanel smoke", () => {
  it("renders selected invocation payload and execution events", () => {
    render(<CapabilityInvocationPanel resource={resource} detail={detail} />);

    expect(screen.getByText("Kitchen Arm")).toBeInTheDocument();
    expect(screen.getByText("Request")).toBeInTheDocument();
    expect(screen.getByText(/"mode": "soft"/)).toBeInTheDocument();
    expect(screen.getByText(/#2 completed/)).toBeInTheDocument();
  });

  it("switches between recent invocations without executing anything", () => {
    render(<CapabilityInvocationPanel resource={resource} detail={detail} />);

    fireEvent.click(screen.getByRole("button", { name: /calibrate/ }));

    expect(screen.getByText(/"target": "battery"/)).toBeInTheDocument();
    expect(screen.getByText("battery calibration failed")).toBeInTheDocument();
    expect(screen.queryByText(/#2 completed/)).not.toBeInTheDocument();
  });
});
