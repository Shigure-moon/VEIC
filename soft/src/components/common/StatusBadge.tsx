import type { StatusTone } from "../../types";

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return <span className={`status-badge ${tone}`}>{label}</span>;
}
