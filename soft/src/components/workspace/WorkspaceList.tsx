import { EmptyState, SectionHeading } from "../common";
import type { Workspace } from "../../types";

export function WorkspaceList({
  isLoggedIn,
  workspaces,
  selectedWorkspaceId,
  busy,
  onRefresh,
  onSelectWorkspace,
}: {
  isLoggedIn: boolean;
  workspaces: Workspace[];
  selectedWorkspaceId: string;
  busy: string;
  onRefresh: () => Promise<void>;
  onSelectWorkspace: (workspaceId: string) => Promise<void>;
}) {
  return (
    <section className="panel workspace-panel">
      <div className="panel-toolbar">
        <SectionHeading eyebrow="Workspace" title="选择运行空间" />
        <button type="button" onClick={onRefresh} disabled={Boolean(busy) || !isLoggedIn}>
          刷新
        </button>
      </div>

      {!isLoggedIn ? (
        <EmptyState title="Not signed in" detail="Sign in to load real Workspaces from the backend." />
      ) : workspaces.length === 0 ? (
        <EmptyState title="No Workspace" detail="This client reads only real API data and does not create mock workspaces." />
      ) : (
        <div className="workspace-list">
          {workspaces.map((workspace) => {
            const workspaceId = workspace.id || "";
            return (
              <button
                type="button"
                key={workspaceId || workspace.networkId || workspace.name}
                className={workspaceId === selectedWorkspaceId ? "workspace-item active" : "workspace-item"}
                onClick={() => void onSelectWorkspace(workspaceId)}
                disabled={!workspaceId || Boolean(busy)}
              >
                <span>
                  <strong>{workspace.name || "Unnamed Workspace"}</strong>
                  <em>{workspace.networkId || workspace.id || "no network id"}</em>
                </span>
                <small>{workspace.status || "active"}</small>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
