/**
 * FILE: ADMIN/src/contexts/AuthContext.tsx
 *
 * NHIỆM VỤ:
 * - Quản lý trạng thái đăng nhập Admin trên toàn ứng dụng.
 * - Khôi phục phiên khi tải lại trang.
 * - Xác minh token qua API /admin/me.
 * - Đồng bộ đăng nhập, đăng xuất và phiên hết hạn.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  authToken,
} from '../services/api/httpClient';

import {
  adminAuthService,
  type AdminLoginPayload,
} from '../services/auth/adminAuth.service';

export interface AdminUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    payload: AdminLoginPayload,
    remember: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AdminUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Chuẩn hóa response API:
 * - { data: { user: {...} } }
 * - { data: { admin: {...} } }
 * - { user: {...} }
 * - { data: {...userFields} }
 */
function extractObject(response: unknown): Record<string, unknown> {
  if (!response || typeof response !== 'object') {
    return {};
  }

  const root = response as Record<string, unknown>;
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const candidate = data.user ?? data.admin ?? data;

  if (!candidate || typeof candidate !== 'object') {
    return {};
  }

  return candidate as Record<string, unknown>;
}

function extractToken(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const root = response as Record<string, unknown>;
  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const token = data.accessToken ?? data.access_token ?? data.token;

  return typeof token === 'string' && token.trim()
    ? token
    : null;
}

function toAdminUser(response: unknown): AdminUser {
  const candidate = extractObject(response);

  if (
    typeof candidate.email !== 'string' &&
    typeof candidate._id !== 'string' &&
    typeof candidate.id !== 'string'
  ) {
    throw new Error(
      'API thông tin Admin không trả về dữ liệu tài khoản hợp lệ.',
    );
  }

  return candidate as AdminUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearLocalSession = useCallback(() => {
    authToken.clear();
    setUser(null);
  }, []);

  /**
   * Gọi lại khi cần đồng bộ hồ sơ Admin từ backend.
   */
  const refreshUser = useCallback(async (): Promise<AdminUser> => {
    const token = authToken.get();

    if (!token) {
      setUser(null);
      throw new Error('Phiên đăng nhập không tồn tại.');
    }

    try {
      const response = await adminAuthService.getMe();
      const currentUser = toAdminUser(response);

      // Chỉ cho tài khoản Admin vào khu vực quản trị.
      if (
        typeof currentUser.role === 'string' &&
        currentUser.role !== 'admin'
      ) {
        throw new Error('Tài khoản không có quyền quản trị.');
      }

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      clearLocalSession();
      throw error;
    }
  }, [clearLocalSession]);

  /**
   * Khôi phục phiên khi ứng dụng khởi động hoặc tải lại trang.
   */
  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      if (!authToken.get()) {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await adminAuthService.getMe();

        if (!active) return;

        const currentUser = toAdminUser(response);

        if (
          typeof currentUser.role === 'string' &&
          currentUser.role !== 'admin'
        ) {
          throw new Error('Tài khoản không có quyền quản trị.');
        }

        setUser(currentUser);
      } catch {
        if (active) {
          authToken.clear();
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  /**
   * Đăng nhập:
   * 1. Gọi API login.
   * 2. Lưu token.
   * 3. Xác minh token bằng API /me.
   * 4. Chỉ hoàn tất khi lấy được thông tin tài khoản.
   */
  const login = useCallback(
    async (payload: AdminLoginPayload, remember: boolean) => {
      const response = await adminAuthService.login(payload);
      const token = extractToken(response);

      if (!token) {
        throw new Error(
          'Backend đăng nhập thành công nhưng không trả về token hợp lệ.',
        );
      }

      if (remember) {
        authToken.set(token);
      } else {
        authToken.setSession(token);
      }

      try {
        await refreshUser();
      } catch (error) {
        clearLocalSession();
        throw error;
      }
    },
    [clearLocalSession, refreshUser],
  );

  /**
   * Đăng xuất luôn xóa trạng thái phía frontend,
   * kể cả khi API logout thất bại.
   */
  const logout = useCallback(async () => {
    try {
      await adminAuthService.logout();
    } finally {
      clearLocalSession();
    }
  }, [clearLocalSession]);

  /**
   * Đồng bộ khi httpClient phát hiện token bị từ chối.
   */
  useEffect(() => {
    const handleUnauthorized = () => {
      clearLocalSession();
    };

    window.addEventListener('admin:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener(
        'admin:unauthorized',
        handleUnauthorized,
      );
    };
  }, [clearLocalSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider.');
  }

  return context;
}