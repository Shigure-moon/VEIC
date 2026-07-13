import type { FormEvent, SetStateAction } from "react";
import { SectionHeading } from "../common";
import type { HealthState, UserProfile } from "../../types";
import { formatDateTime } from "../../utils/format";

export function AccountPanel({
  apiBaseUrl,
  setApiBaseUrl,
  backendChanged,
  onSaveBackend,
  onHealthCheck,
  health,
  isLoggedIn,
  user,
  onLogout,
  loginForm,
  setLoginForm,
  onLogin,
  busy,
  booting,
}: {
  apiBaseUrl: string;
  setApiBaseUrl: (value: SetStateAction<string>) => void;
  backendChanged: boolean;
  onSaveBackend: () => Promise<void>;
  onHealthCheck: () => Promise<void>;
  health: HealthState;
  isLoggedIn: boolean;
  user: UserProfile | undefined;
  onLogout: () => Promise<void>;
  loginForm: { login: string; password: string };
  setLoginForm: (value: SetStateAction<{ login: string; password: string }>) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  busy: string;
  booting: boolean;
}) {
  return (
    <aside className="panel account-panel">
      <SectionHeading eyebrow="Account Server" title="Backend and identity" />
      <label className="field">
        <span>API Base URL</span>
        <input
          value={apiBaseUrl}
          onChange={(event) => setApiBaseUrl(event.target.value)}
          spellCheck={false}
          placeholder="https://api.veic.tech"
        />
      </label>
      <div className="button-row">
        <button type="button" onClick={onSaveBackend} disabled={Boolean(busy) || !backendChanged}>
          保存后端
        </button>
        <button type="button" onClick={onHealthCheck} disabled={Boolean(busy)}>
          Health check
        </button>
      </div>

      <div className="health-readout">
        <span>{health.message}</span>
        <time>{health.checkedAt ? formatDateTime(health.checkedAt) : "not checked"}</time>
      </div>

      {isLoggedIn ? (
        <div className="identity-block">
          <span className="block-label">Current User</span>
          <strong>{user?.displayName || user?.username || user?.email || "Authenticated"}</strong>
          <span>{user?.email || user?.id || "no email"}</span>
          <button type="button" onClick={onLogout} disabled={Boolean(busy)}>
            Logout
          </button>
        </div>
      ) : (
        <form className="login-form" onSubmit={onLogin}>
          <label className="field">
            <span>Email / Username</span>
            <input
              value={loginForm.login}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, login: event.target.value }))}
              autoComplete="username"
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
              autoComplete="current-password"
              type="password"
              placeholder="password"
            />
          </label>
          <button type="submit" disabled={Boolean(busy || booting)}>
            登录
          </button>
        </form>
      )}
    </aside>
  );
}
