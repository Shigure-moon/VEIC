import type { CachedWorkspaceEvent } from "../tauri";

export function eventSummary(event: CachedWorkspaceEvent) {
  const payload = event.payload || {};
  const name = stringValue(payload.name) || stringValue(payload.resourceName) || stringValue(payload.workspaceName);
  const status = stringValue(payload.status) || stringValue(payload.state);
  const reason = stringValue(payload.reason);
  const subject = event.subjectId ? shortId(event.subjectId) : "";
  const parts = [name, status, reason, subject ? `subject ${subject}` : ""].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  const keys = Object.keys(payload).slice(0, 4);
  return keys.length > 0 ? keys.map((key) => `${key}=${payloadValue(payload[key])}`).join(" / ") : "No payload summary";
}

export function shortId(value: string) {
  return value.length > 10 ? `${value.slice(0, 8)}...` : value;
}

export function partitionSummary(value: Record<string, unknown> | undefined) {
  const count = value ? Object.keys(value).length : 0;
  return count > 0 ? `${count} keys` : "empty";
}

export function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour12: false });
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export function compactJson(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) return "-";
  try {
    const text = JSON.stringify(value);
    return text.length > 96 ? `${text.slice(0, 93)}...` : text;
  } catch {
    return "{...}";
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function payloadValue(value: unknown) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null || value === undefined) return "-";
  return Array.isArray(value) ? `[${value.length}]` : "{...}";
}
