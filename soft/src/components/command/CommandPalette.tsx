import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Resource, ResourceDetailHydration } from "../../types";
import {
  buildCommandPaletteItems,
  type CommandPaletteItem,
} from "../../utils/commands";

export function CommandPalette({
  enabled,
  resources,
  resourceDetail,
  selectedResourceId,
  onSelectResource,
  onRecordCommandIntent,
}: {
  enabled: boolean;
  resources: Resource[];
  resourceDetail: ResourceDetailHydration;
  selectedResourceId: string;
  onSelectResource: (resourceId: string) => void;
  onRecordCommandIntent: (message: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => buildCommandPaletteItems({
    query,
    resources,
    resourceDetail,
    selectedResourceId,
    limit: 14,
  }), [query, resourceDetail, resources, selectedResourceId]);

  useEffect(() => {
    if (activeIndex >= items.length) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [activeIndex, items.length]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }

      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function executeItem(item: CommandPaletteItem) {
    onSelectResource(item.resourceId);
    setOpen(false);
    setQuery("");

    try {
      if (item.kind === "open_resource") {
        await onRecordCommandIntent(`Command Palette: open resource ${item.resourceName} (${item.resourceId})`);
        return;
      }

      await onRecordCommandIntent(
        `Command Palette: local intent only for capability ${item.capabilityKey || "capability"} on ${item.resourceName}; no invocation executed`,
      );
    } catch (err) {
      console.error("Failed to record command intent", err);
    }
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, items.length - 1)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    }
    if (event.key === "Enter" && items[activeIndex]) {
      event.preventDefault();
      void executeItem(items[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" role="presentation">
      <section className="command-palette" role="dialog" aria-label="Command Palette">
        <div className="command-palette-input">
          <span>Command</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="▸"
            disabled={!enabled}
            aria-label="Search command palette"
          />
          <button type="button" onClick={() => {
            setOpen(false);
            setQuery("");
          }}>
            Close
          </button>
        </div>

        <div className="command-palette-results">
          {!enabled ? (
            <p className="muted">Login first.</p>
          ) : items.length === 0 ? (
            <p className="muted">No command matched.</p>
          ) : (
            items.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={[
                  "command-palette-item",
                  index === activeIndex ? "active" : "",
                  item.resourceId === selectedResourceId ? "selected" : "",
                  item.riskLevel?.toLowerCase() === "high" ? "high-risk" : "",
                ].filter(Boolean).join(" ")}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void executeItem(item)}
              >
                <span>{item.meta}</span>
                <strong>{item.title}</strong>
                <em>{item.detail}</em>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
