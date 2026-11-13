import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authToken } from '../services/api/httpClient';

import {
  adminAuthService,
  type AdminLoginPayload,
} from '../services/auth/adminAuth.service';

import { getAdminProfile } from '../services/profile/adminProfile.service';

export interface AdminUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
  role?: string;
  status?: string;
  emailVerifiedAt?: string | null;
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
 * Chuyển AdminProfile trả về từ profile service
 * thành AdminUser dùng trong AuthContext.
 */
function toAdminUser(profile: unknown): AdminUser {
  if (!profile || typeof profile !== 'object') {
    throw new Error(
      'API thông tin Admin không trả về dữ liệu tài khoản hợp lệ.',
    );
  }

  const candidate = profile as Record<string, unknown>;

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

/**
 * Trích token từ response đăng nhập.
 * Hỗ trợ các cấu trúc response phổ biến.
 */
function extractToken(response: unknown): string | null {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const root = response as Record<string, unknown>;

  const data =
    root.data && typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;

  const token =
    data.accessToken ??
    data.access_token ??
    data.token;

  return typeof token === 'string' && token.trim()
    ? token
    : null;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Xóa token và user hiện tại ở frontend.
   */
  const clearLocalSession = useCallback(() => {
    authToken.clear();
    setUser(null);
  }, []);

  /**
   * Đồng bộ thông tin Admin từ backend qua /admin/me.
   */
  const refreshUser = useCallback(async (): Promise<AdminUser> => {
    const token = authToken.get();

    if (!token) {
      setUser(null);
      throw new Error('Phiên đăng nhập không tồn tại.');
    }

    try {
      // getAdminProfile trả về AdminProfile trực tiếp.
      const profile = await getAdminProfile();
      const currentUser = toAdminUser(profile);

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
   * Khôi phục phiên khi ứng dụng khởi động.
   * Không gọi setState đồng bộ trực tiếp trong effect.
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
        const profile = await getAdminProfile();

        if (!active) return;

        const currentUser = toAdminUser(profile);

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
   * 2. Lấy token.
   * 3. Lưu token theo remember me.
   * 4. Xác minh token qua /admin/me.
   */
  const login = useCallback(
    async (
      payload: AdminLoginPayload,
      remember: boolean,
    ): Promise<void> => {
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
   * Đăng xuất:
   * Luôn xóa session frontend kể cả khi API logout thất bại.
   */
  const logout = useCallback(async (): Promise<void> => {
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

    window.addEventListener(
      'admin:unauthorized',
      handleUnauthorized,
    );

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
    throw new Error(
      'useAuth phải được sử dụng bên trong AuthProvider.',
    );
  }

  return context;
}