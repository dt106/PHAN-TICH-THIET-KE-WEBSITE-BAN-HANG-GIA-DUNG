import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authService } from "../services/auth.service.ts";
import { writeToken, readToken } from "../services/session.ts";
import type { User } from "../types/api.ts";
import { AuthContext } from "./auth-context.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!readToken()) {
      setReady(true);
      return;
    }
    authService.getCurrentCustomer()
      .then((result) => setUser(result.data.user))
      .catch(() => {
        writeToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.loginCustomer({ email, password });
    writeToken(result.data.token);
    setUser(result.data.user);
  }, []);

  const acceptSession = useCallback((next: User, token: string) => {
    writeToken(token);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logoutCustomer();
    } catch {
      /* Token stateless — client vẫn xóa phiên. */
    }
    writeToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, acceptSession, logout, setUser }),
    [user, ready, login, acceptSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
