
/**
 * FILE: ADMIN/src/services/api/api.types.ts
 *
 * Kiểu dữ liệu dùng chung cho kết quả API.
 */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message?: string;
  data: T[];
  pagination?: PaginationMeta;
}

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  params?: QueryParams;
  headers?: HeadersInit;
  signal?: AbortSignal;
}
