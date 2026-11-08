
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';

import type {
  Product,
  ProductCreatePayload,
  ProductUpdatePayload,
  ProductListParams,
  ProductAdminListResponse,
  ProductApiResponse,
  UpdateProductStatusPayload,
  UpdateProductFeaturedPayload,
} from '../../types/product.types';

export const productsService = {
  /**
   * ADMIN: Danh sách sản phẩm.
   *
   * GET /api/admin/products/all
   */
  getAdminProducts(params?: ProductListParams) {
    return httpClient.get<ProductAdminListResponse>(
      API_ENDPOINTS.products.adminList,
      {
        params: params as
          | import('../api/api.types').QueryParams
          | undefined,
      },
    );
  },

  /**
   * ADMIN: Chi tiết sản phẩm.
   *
   * GET /api/admin/products/:id
   */
  getAdminProductById(id: string) {
    return httpClient.get<ProductApiResponse<Product>>(
      API_ENDPOINTS.products.adminDetail(id),
    );
  },

  /**
   * ADMIN: Tạo sản phẩm.
   *
   * POST /api/admin/products
   */
  createProduct(payload: ProductCreatePayload) {
    return httpClient.post<ProductApiResponse<Product>>(
      API_ENDPOINTS.products.create,
      payload,
    );
  },

  /**
   * ADMIN: Cập nhật sản phẩm.
   *
   * PUT /api/admin/products/:id
   */
  updateProduct(
    id: string,
    payload: ProductUpdatePayload,
  ) {
    return httpClient.put<ProductApiResponse<Product>>(
      API_ENDPOINTS.products.update(id),
      payload,
    );
  },

  /**
   * ADMIN: Bật/tắt trạng thái kinh doanh.
   *
   * PATCH /api/admin/products/:id/status
   */
  updateProductStatus(
    id: string,
    payload: UpdateProductStatusPayload,
  ) {
    return httpClient.patch<ProductApiResponse<Product>>(
      API_ENDPOINTS.products.status(id),
      payload,
    );
  },

  /**
   * ADMIN: Bật/tắt sản phẩm nổi bật.
   *
   * PATCH /api/admin/products/:id/featured
   */
  updateProductFeatured(
    id: string,
    payload: UpdateProductFeaturedPayload,
  ) {
    return httpClient.patch<ProductApiResponse<Product>>(
      API_ENDPOINTS.products.featuredStatus(id),
      payload,
    );
  },

  /**
   * ADMIN: Xóa sản phẩm.
   *
   * DELETE /api/admin/products/:id
   */
  deleteProduct(id: string) {
    return httpClient.delete<ProductApiResponse<null>>(
      API_ENDPOINTS.products.delete(id),
    );
  },
};
