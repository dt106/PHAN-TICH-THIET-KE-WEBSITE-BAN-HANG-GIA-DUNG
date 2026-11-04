import { readToken } from "./session.ts";

export type FieldError = { field?: string; message: string };

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Envelope<T> = {
  success: boolean;
  message: string;
  data: T;
  pagination?: Pagination;
  errors?: FieldError[];
  retryAfter?: number;
};

export class ApiError extends Error {
  status: number;
  errors?: FieldError[];
  retryAfter?: number;

  constructor(
    status: number,
    message: string,
    errors?: FieldError[],
    retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

export function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : "Không thể kết nối máy chủ.";
}

export function readFailure(status: number, payload: unknown) {
  const body =
    payload && typeof payload === "object"
      ? (payload as Partial<Envelope<unknown>>)
      : {};
  return new ApiError(
    status,
    body.message || "Đã xảy ra lỗi.",
    body.errors,
    body.retryAfter,
  );
}

function selfCheck() {
  const error = readFailure(429, {
    success: false,
    message: "cooldown",
    retryAfter: 60,
    errors: [{ field: "email", message: "x" }],
  });
  if (
    error.status !== 429 ||
    error.message !== "cooldown" ||
    error.retryAfter !== 60 ||
    error.errors?.[0]?.field !== "email"
  ) {
    throw new Error("readFailure self-check failed");
  }
}

selfCheck();

const base = import.meta.env.VITE_API_URL ?? "";

export function toQuery(
  params: Record<string, string | number | boolean | undefined | null>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    form?: FormData;
    auth?: boolean;
  } = {},
): Promise<Envelope<T>> {
  const headers = new Headers();
  if (options.auth !== false) {
    const token = readToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (options.form) body = options.form;
  else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
  } catch {
    throw new ApiError(0, "Không thể kết nối máy chủ.");
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok || !isSuccess(payload)) {
    throw readFailure(response.status, payload);
  }
  return payload as Envelope<T>;
}

function isSuccess(payload: unknown): payload is Envelope<unknown> {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      (payload as Envelope<unknown>).success === true,
  );
}
