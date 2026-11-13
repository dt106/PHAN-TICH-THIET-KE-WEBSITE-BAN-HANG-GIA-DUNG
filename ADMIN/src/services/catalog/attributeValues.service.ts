/**
 * FILE: ADMIN/src/services/catalog/attributeValues.service.ts
 *
 * Quản lý giá trị thuộc tính.
 * API:
 * POST   /admin/attributes/:id/values
 * PUT    /admin/attributes/values/:valueId
 * DELETE /admin/attributes/values/:valueId
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { httpClient } from '../api/httpClient';

import type { AttributeValue } from '../../types/attribute.types';

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export interface AttributeValueCreatePayload {
  value: string;
  slug?: string;
}

export interface AttributeValueUpdatePayload {
  value?: string;
  slug?: string;
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

export const attributeValuesService = {
  /**
   * Tạo giá trị cho một thuộc tính.
   */
  async create(
    attributeId: string,
    payload: AttributeValueCreatePayload,
  ): Promise<AttributeValue> {
    const response = await httpClient.post<
      ApiResponse<AttributeValue> | AttributeValue
    >(API_ENDPOINTS.attributes.createValue(attributeId), payload);

    return unwrapResponse(response);
  },

  /**
   * Cập nhật giá trị thuộc tính.
   */
  async update(
    valueId: string,
    payload: AttributeValueUpdatePayload,
  ): Promise<AttributeValue> {
    const response = await httpClient.put<
      ApiResponse<AttributeValue> | AttributeValue
    >(API_ENDPOINTS.attributes.updateValue(valueId), payload);

    return unwrapResponse(response);
  },

  /**
   * Xóa giá trị thuộc tính.
   */
  async remove(valueId: string): Promise<void> {
    await httpClient.delete<unknown>(
      API_ENDPOINTS.attributes.deleteValue(valueId),
    );
  },
};