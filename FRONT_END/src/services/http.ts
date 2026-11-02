const TOKEN_KEY = "furniro-token";

export type FieldError = { field?: string; message: string };

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
  errors?: { field?: string; message?: string; path?: string }[];
  retryAfter?: number;
};

export class ApiError extends Error {
  status: number;
  errors: FieldError[];
  retryAfter?: number;

  constructor(message: string, status: number, errors: FieldError[] = [], retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    form?: FormData;
    auth?: boolean;
  } = {},
): Promise<{ message: string; data: T; pagination?: Pagination }> {
  const headers = new Headers();
  const token = options.auth === false ? null : getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.form) {
    // Browser sets multipart boundary.
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? (options.body !== undefined || options.form ? "POST" : "GET"),
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError("Không thể kết nối máy chủ. Vui lòng thử lại.", 0);
  }

  const text = await response.text();
  let payload: Envelope<T> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new ApiError("Máy chủ trả về dữ liệu không đọc được.", response.status);
    }
  }

  if (!response.ok || payload.success === false) {
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event("furniro:unauthorized"));
    }
    const errors = (payload.errors ?? []).map((item) => ({
      field: item.field ?? item.path,
      message: item.message ?? "Dữ liệu không hợp lệ",
    }));
    throw new ApiError(
      payload.message || "Yêu cầu không thành công.",
      response.status,
      errors,
      payload.retryAfter,
    );
  }

  return {
    message: payload.message ?? "",
    data: payload.data as T,
    pagination: payload.pagination,
  };
}
