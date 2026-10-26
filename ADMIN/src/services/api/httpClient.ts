/**
 * FILE: ADMIN/src/services/api/httpClient.ts
 *
 * HTTP client dùng chung cho toàn bộ Admin.
 * Không đặt logic nghiệp vụ của từng trang tại đây.
 */

import type { QueryParams, RequestOptions } from './api.types';

// Địa chỉ Backend API
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const TOKEN_KEY = 'admin_access_token';

/**
 * Lỗi API tùy chỉnh.
 * Giúp các service và page đọc được thông báo lỗi và HTTP status.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Quản lý token đăng nhập Admin.
 *
 * - localStorage: ghi nhớ đăng nhập.
 * - sessionStorage: chỉ lưu trong phiên trình duyệt hiện tại.
 */
export const authToken = {
  // Đọc token từ cả hai nơi.
  get(): string | null {
    return (
      localStorage.getItem(TOKEN_KEY) ??
      sessionStorage.getItem(TOKEN_KEY)
    );
  },

  // Lưu token lâu dài khi chọn "Ghi nhớ đăng nhập".
  set(token: string): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);

    localStorage.setItem(TOKEN_KEY, token);
  },

  // Chỉ lưu token trong phiên trình duyệt hiện tại.
  setSession(token: string): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);

    sessionStorage.setItem(TOKEN_KEY, token);
  },

  // Xóa token ở cả hai nơi khi đăng xuất.
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

/**
 * Tạo URL API và gắn query params nếu có.
 */
function buildUrl(path: string, params?: QueryParams): string {
  const normalizedPath = path.replace(/^\/+/, '');
  const url = new URL(`${API_BASE_URL}/${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Hàm gửi request dùng chung cho các phương thức HTTP.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = authToken.get();

  // Tự động đính kèm JWT nếu đã đăng nhập.
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let requestBody: BodyInit | undefined;

  if (body instanceof FormData) {
    // Để trình duyệt tự tạo multipart boundary.
    requestBody = body;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    requestBody = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body: requestBody,
      signal: options.signal,
    });
  } catch (error) {
    // Không chuyển lỗi hủy request thành lỗi kết nối.
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }

    throw new ApiError(
      'Không thể kết nối đến máy chủ. Kiểm tra backend và địa chỉ API.',
      0,
      error,
    );
  }

  // Đọc dữ liệu phản hồi từ Backend.
  const contentType = response.headers.get('content-type') || '';
  let responseData: unknown = null;

  if (response.status !== 204) {
    if (contentType.includes('application/json')) {
      responseData = await response.json().catch(() => null);
    } else {
      responseData = await response.text().catch(() => '');
    }
  }

  // Chuẩn hóa lỗi trả về từ Backend.
  if (!response.ok) {
    const payload =
      responseData && typeof responseData === 'object'
        ? (responseData as Record<string, unknown>)
        : undefined;

    const message =
      (typeof payload?.message === 'string' && payload.message) ||
      (typeof payload?.error === 'string' && payload.error) ||
      `Yêu cầu thất bại (HTTP ${response.status}).`;

    throw new ApiError(message, response.status, responseData);
  }

  return responseData as T;
}

/**
 * Các phương thức HTTP dùng chung.
 */
export const httpClient = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  put<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
