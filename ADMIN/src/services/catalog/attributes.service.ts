/**
 * FILE: ADMIN/src/services/catalog/attributes.service.ts
 *
 * Quản lý thuộc tính sản phẩm.
 * API:
 * GET    /attributes
 * GET    /attributes/:id
 * POST   /admin/attributes
 * PUT    /admin/attributes/:id
 * DELETE /admin/attributes/:id
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { httpClient } from '../api/httpClient';

import type {
  ProductAttribute,
  AttributeFormData,
} from '../../types/attribute.types';

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

function unwrapResponse<T>(response: ApiResponse<T> | T): T {
  if (
    response !== null &&
    typeof response === 'object' &&
    'data' in response
  ) {
    return (response as ApiResponse<T>).data;
  }

  return response as T;
}

export const attributesService = {
  /**
   * Lấy toàn bộ thuộc tính và các giá trị thuộc tính.
   */
  async getAll(): Promise<ProductAttribute[]> {
    const response = await httpClient.get<
      ApiResponse<ProductAttribute[]> | ProductAttribute[]
    >(API_ENDPOINTS.attributes.base);

    return unwrapResponse(response);
  },

  /**
   * Lấy chi tiết một thuộc tính.
   */
  async getById(id: string): Promise<ProductAttribute> {
    const response = await httpClient.get<
      ApiResponse<ProductAttribute> | ProductAttribute
    >(API_ENDPOINTS.attributes.detail(id));

    return unwrapResponse(response);
  },

  /**
   * Tạo thuộc tính mới.
   */
  async create(payload: AttributeFormData): Promise<ProductAttribute> {
    const response = await httpClient.post<
      ApiResponse<ProductAttribute> | ProductAttribute
    >(API_ENDPOINTS.attributes.create, payload);

    return unwrapResponse(response);
  },

  /**
   * Cập nhật thuộc tính.
   */
  async update(
    id: string,
    payload: Partial<AttributeFormData>,
  ): Promise<ProductAttribute> {
    const response = await httpClient.put<
      ApiResponse<ProductAttribute> | ProductAttribute
    >(API_ENDPOINTS.attributes.update(id), payload);

    return unwrapResponse(response);
  },

  /**
   * Xóa thuộc tính.
   */
  async remove(id: string): Promise<void> {
    await httpClient.delete<unknown>(API_ENDPOINTS.attributes.delete(id));
  },
};