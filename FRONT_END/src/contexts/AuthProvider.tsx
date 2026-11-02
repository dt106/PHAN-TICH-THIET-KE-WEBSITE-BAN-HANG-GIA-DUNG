import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../services/api.ts";
import { getToken, setToken } from "../services/http.ts";
import type { Customer } from "../types/api.ts";
import { AuthContext } from "./auth-context.ts";

/**
 * Phiên khách hàng: JWT trong localStorage (`furniro-token`), hồ sơ từ GET /api/customer/me.
 * Tách file để dễ hợp nhất với AuthProvider local chưa commit.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [ready, setReady] = useState(() => !getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    const result = await authApi.me();
    setUser(result.data.user);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    let active = true;
    authApi
      .me()
      .then((result) => {
        if (active) setUser(result.data.user);
      })
      .catch(() => {
        if (!active) return;
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
    }
    window.addEventListener("furniro:unauthorized", onUnauthorized);
    return () => window.removeEventListener("furniro:unauthorized", onUnauthorized);
  }, []);

  const setSession = useCallback((next: Customer, token: string) => {
    setToken(token);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getToken()) await authApi.logout();
    } catch {
      // Token đã hết hạn vẫn xóa phiên cục bộ.
    }
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, setSession, refresh, logout }),
    [user, ready, setSession, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
