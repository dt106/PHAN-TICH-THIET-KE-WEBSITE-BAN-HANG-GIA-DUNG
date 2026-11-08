import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';

import type {
  ProductVariantListResponse,
  ProductVariantApiResponse,
  ProductVariantMessageResponse,
  ProductVariantPayload,
  UpdateVariantStockPayload,
  UpdateVariantStatusPayload,
} from '../../types/product-variant.types';

export const productVariantsService = {
  /**
   * Lấy danh sách biến thể của một sản phẩm.
   * GET /api/admin/products/:productId/variants
   */
  getByProduct(productId: string) {
    return httpClient.get<ProductVariantListResponse>(
      API_ENDPOINTS.productVariants.adminListByProduct(productId),
    );
  },

  /**
   * Tạo biến thể cho sản phẩm.
   * POST /api/admin/products/:productId/variants
   */
  create(productId: string, payload: ProductVariantPayload) {
    return httpClient.post<ProductVariantApiResponse>(
      API_ENDPOINTS.productVariants.adminCreateByProduct(productId),
      payload,
    );
  },

  /**
   * Cập nhật thông tin biến thể.
   * PUT /api/admin/variants/:id
   */
  update(id: string, payload: Partial<ProductVariantPayload>) {
    return httpClient.put<ProductVariantApiResponse>(
      API_ENDPOINTS.productVariants.adminUpdate(id),
      payload,
    );
  },

  /**
   * Cập nhật riêng tồn kho.
   * PATCH /api/admin/variants/:id/stock
   */
  updateStock(id: string, payload: UpdateVariantStockPayload) {
    return httpClient.patch<ProductVariantApiResponse>(
      API_ENDPOINTS.productVariants.adminUpdateStock(id),
      payload,
    );
  },

  /**
   * Bật / tắt kinh doanh biến thể.
   * PATCH /api/admin/variants/:id/status
   */
  updateStatus(id: string, payload: UpdateVariantStatusPayload) {
    return httpClient.patch<ProductVariantApiResponse>(
      API_ENDPOINTS.productVariants.adminUpdateStatus(id),
      payload,
    );
  },

  /**
   * Xóa biến thể.
   * DELETE /api/admin/variants/:id
   */
  remove(id: string) {
    return httpClient.delete<ProductVariantMessageResponse>(
      API_ENDPOINTS.productVariants.adminDelete(id),
    );
  },
};