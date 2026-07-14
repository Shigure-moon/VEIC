import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceList } from "./WorkspaceList";
import type { Workspace } from "../../types";

describe("WorkspaceList smoke", () => {
  it("renders non-empty workspaces returned by GET /workspaces", async () => {
    const api = {
      listWorkspaces: vi.fn(async () => [
        { id: "workspace-1", name: "My Home", networkId: "public/home", status: "active" },
        { id: "workspace-2", name: "Lab", networkId: "public/local", status: "active" },
      ] as Workspace[]),
    };

    const workspaces = await api.listWorkspaces();

    render(
      <WorkspaceList
        isLoggedIn
        workspaces={workspaces}
        selectedWorkspaceId="workspace-1"
        busy=""
        onRefresh={vi.fn(async () => undefined)}
        onSelectWorkspace={vi.fn(async () => undefined)}
      />,
    );

    expect(api.listWorkspaces).toHaveBeenCalledTimes(1);
    expect(screen.getByText("My Home")).toBeInTheDocument();
    expect(screen.getByText("Lab")).toBeInTheDocument();
    expect(screen.queryByText("No Workspace")).not.toBeInTheDocument();
  });
});