import { useCallback, useState } from "react";
import {
  appendRuntimeLog,
  clearRuntimeLogs,
  type RuntimeLog,
  type RuntimeLogLevel,
} from "../tauri";

export function useRuntimeLog() {
  const [logs, setLogs] = useState<RuntimeLog[]>([]);

  const recordLog = useCallback(async (level: RuntimeLogLevel, message: string) => {
    try {
      const log = await appendRuntimeLog(level, message);
      setLogs((prev) => [log, ...prev.filter((item) => item.id !== log.id)].slice(0, 120));
    } catch {
      const fallback: RuntimeLog = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        level,
        message,
      };
      setLogs((prev) => [fallback, ...prev].slice(0, 120));
    }
  }, []);

  const clearLogs = useCallback(async () => {
    await clearRuntimeLogs();
    setLogs([]);
  }, []);

  return {
    logs,
    setLogs,
    recordLog,
    clearLogs,
  };
}
