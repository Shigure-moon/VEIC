import { useCallback, useState } from "react";
import { formatApiError } from "../api/client";
import type { RuntimeLogLevel } from "../tauri";

export function useTaskRunner(recordLog: (level: RuntimeLogLevel, message: string) => Promise<void>) {
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const runTask = useCallback(async <T,>(label: string, task: () => Promise<T>) => {
    setBusy(label);
    setNotice("");
    setError("");
    try {
      const value = await task();
      setNotice(`${label} 成功`);
      await recordLog("success", `${label} 成功`);
      return value;
    } catch (err) {
      const message = formatApiError(err);
      setError(message);
      await recordLog("error", `${label} 失败: ${message}`);
      return undefined;
    } finally {
      setBusy("");
    }
  }, [recordLog]);

  return {
    busy,
    notice,
    error,
    setError,
    setNotice,
    runTask,
  };
}
