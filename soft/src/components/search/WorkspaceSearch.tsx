import { useEffect, useMemo, useRef, useState } from "react";
import type { CachedWorkspaceEvent, RuntimeLog } from "../../tauri";
import type {
  Resource,
  ResourceDetailHydration,
  RuntimeRecord,
  Session,
  Workspace,
  WorkspaceMember,
} from "../../types";
import { formatTime } from "../../utils/format";
import {
  buildWorkspaceSearchResults,
  type WorkspaceSearchResult,
} from "../../utils/search";

export function WorkspaceSearch({
  enabled,
  selectedWorkspace,
  members,
  resources,
  sessions,
  timelineEvents,
  runtimeRecords,
  logs,
  resourceDetail,
  selectedResourceId,
  onSelectResource,
}: {
  enabled: boolean;
  selectedWorkspace: Workspace | undefined;
  members: WorkspaceMember[];
  resources: Resource[];
  sessions: Session[];
  timelineEvents: CachedWorkspaceEvent[];
  runtimeRecords: RuntimeRecord[];
  logs: RuntimeLog[];
  resourceDetail: ResourceDetailHydration;
  selectedResourceId: string;
  onSelectResource: (resourceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "/") {
        event.preventDefault();
        setExpanded(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        setQuery("");
        setExpanded(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo(() => buildWorkspaceSearchResults({
    query,
    selectedWorkspace,
    members,
    resources,
    sessions,
    timelineEvents,
    runtimeRecords,
    logs,
    resourceDetail,
    selectedResourceId,
    limit: 18,
  }), [
    logs,
    members,
    query,
    resourceDetail,
    resources,
    runtimeRecords,
    selectedResourceId,
    selectedWorkspace,
    sessions,
    timelineEvents,
  ]);

  const active = expanded || query.trim().length > 0;
  const sourceCount = new Set(results.map((result) => result.source)).size;

  function handleResultClick(result: WorkspaceSearchResult) {
    if (result.resourceId) {
      onSelectResource(result.resourceId);
      setExpanded(true);
    }
  }

  return (
    <aside className={active ? "workspace-search-dock open" : "workspace-search-dock"}>
      <div className="workspace-search-input">
        <span>Workspace Search</span>
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setExpanded(true)}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask Workspace..."
          disabled={!enabled || !selectedWorkspace}
          aria-label="Search local Workspace sources"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")}>
            Clear
          </button>
        ) : null}
      </div>

      {active ? (
        <div className="workspace-search-results">
          {!enabled ? (
            <p className="muted">Login first. Search only reads local Workspace data.</p>
          ) : !selectedWorkspace ? (
            <p className="muted">Select a Workspace before searching.</p>
          ) : query.trim().length === 0 ? (
            <p className="muted">
              Search Workspace state, Resources, Capabilities, Timeline and local Runtime Log. Results always cite a source.
            </p>
          ) : results.length === 0 ? (
            <p className="muted">No local source matched this query.</p>
          ) : (
            <>
              <div className="workspace-search-summary">
                <strong>{results.length}</strong>
                <span>{sourceCount} source groups</span>
              </div>
              <div className="workspace-search-list">
                {results.map((result) => (
                  <button
                    type="button"
                    key={result.id}
                    className={result.resourceId ? "workspace-search-result actionable" : "workspace-search-result"}
                    onClick={() => handleResultClick(result)}
                  >
                    <span className="workspace-search-source">
                      {result.sourceLabel}
                      {result.time ? <time>{formatTime(result.time)}</time> : null}
                    </span>
                    <strong>{result.title}</strong>
                    <em>{result.detail}</em>
                    <small>{result.meta}</small>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </aside>
  );
}
