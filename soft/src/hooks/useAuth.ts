import { useCallback, useState } from "react";
import type { UserProfile } from "../types";

export function useAuth() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<UserProfile | undefined>();
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const isLoggedIn = Boolean(token && user);

  const clearSessionState = useCallback(() => {
    setToken("");
    setUser(undefined);
  }, []);

  return {
    token,
    setToken,
    user,
    setUser,
    loginForm,
    setLoginForm,
    isLoggedIn,
    clearSessionState,
  };
}
