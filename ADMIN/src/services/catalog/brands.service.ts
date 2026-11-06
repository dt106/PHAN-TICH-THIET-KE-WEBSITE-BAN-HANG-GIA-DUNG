
import { API_ENDPOINTS } from '../api/endpoints';
import { httpClient } from '../api/httpClient';

import type {
  ApiResponse,
  PaginatedResponse,
  QueryParams,
} from '../api/api.types';

import type {
  Brand,
  BrandCreatePayload,
  BrandUpdatePayload,
  BrandListParams,
} from '../../types/brand.types';

/**
 * Lấy danh sách thương hiệu dành cho Admin.
 * Hỗ trợ tìm kiếm, lọc, phân trang và sắp xếp.
 */
const getList = (
  params?: BrandListParams,
): Promise<PaginatedResponse<Brand>> => {
  return httpClient.get<PaginatedResponse<Brand>>(
    API_ENDPOINTS.brands.adminList,
    {
      params: params as QueryParams | undefined,
    },
  );
};

/**
 * Lấy chi tiết thương hiệu.
 */
const getById = (
  id: string,
): Promise<ApiResponse<Brand>> => {
  return httpClient.get<ApiResponse<Brand>>(
    API_ENDPOINTS.brands.adminDetail(id),
  );
};

/**
 * Tạo thương hiệu mới.
 */
const create = (
  payload: BrandCreatePayload,
): Promise<ApiResponse<Brand>> => {
  return httpClient.post<ApiResponse<Brand>>(
    API_ENDPOINTS.brands.create,
    payload,
  );
};

/**
 * Cập nhật thông tin thương hiệu.
 */
const update = (
  id: string,
  payload: BrandUpdatePayload,
): Promise<ApiResponse<Brand>> => {
  return httpClient.put<ApiResponse<Brand>>(
    API_ENDPOINTS.brands.update(id),
    payload,
  );
};

/**
 * Cập nhật trạng thái hoạt động.
 */
const toggleStatus = (
  id: string,
  isActive: boolean,
): Promise<ApiResponse<Brand>> => {
  return httpClient.patch<ApiResponse<Brand>>(
    API_ENDPOINTS.brands.status(id),
    { isActive },
  );
};

/**
 * Xóa thương hiệu.
 * Backend sẽ từ chối nếu thương hiệu còn sản phẩm liên kết.
 */
const remove = (
  id: string,
): Promise<{ success: boolean; message: string }> => {
  return httpClient.delete<{ success: boolean; message: string }>(
    API_ENDPOINTS.brands.delete(id),
  );
};

export const brandsService = {
  getList,
  getById,
  create,
  update,
  toggleStatus,
  remove,
};
