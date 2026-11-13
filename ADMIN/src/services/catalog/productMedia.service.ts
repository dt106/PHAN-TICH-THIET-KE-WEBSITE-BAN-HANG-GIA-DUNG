
/**
 * FILE: ADMIN/src/services/catalog/productMedia.service.ts
 *
 * Service quản lý hình ảnh / video của sản phẩm.
 * Đồng bộ với ProductMedia model và product-media.routes.ts ở Backend.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { ApiResponse } from '../api/api.types';

export type MediaType = 'image' | 'video';

export interface ProductMedia {
  _id: string;
  productId: string;
  mediaType: MediaType;
  mediaUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductMediaPayload {
  mediaType: MediaType;
  mediaUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ProductMediaSortItem {
  id: string;
  sortOrder: number;
}

export const productMediaService = {
  /**
   * Lấy danh sách media theo sản phẩm.
   */
  getByProduct(productId: string) {
    return httpClient.get<ApiResponse<ProductMedia[]>>(
      API_ENDPOINTS.productMedia.adminListByProduct(productId),
    );
  },

  /**
   * Tạo một media bằng URL.
   */
  create(productId: string, payload: ProductMediaPayload) {
    return httpClient.post<ApiResponse<ProductMedia>>(
      API_ENDPOINTS.productMedia.adminCreateByProduct(productId),
      payload,
    );
  },

  /**
   * Tạo nhiều media bằng URL.
   */
  createBatch(productId: string, mediaList: ProductMediaPayload[]) {
    return httpClient.post<ApiResponse<ProductMedia[]>>(
      API_ENDPOINTS.productMedia.adminCreateBatchByProduct(productId),
      { mediaList },
    );
  },

  /**
   * Upload nhiều ảnh từ máy tính.
   * Backend nhận multipart/form-data với field "files".
   */
  uploadFiles(productId: string, files: File[]) {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file);
    });

    return httpClient.post<ApiResponse<ProductMedia[]>>(
      API_ENDPOINTS.productMedia.adminUploadByProduct(productId),
      formData,
    );
  },

  /**
   * Cập nhật thông tin media.
   */
  update(id: string, payload: Partial<ProductMediaPayload>) {
    return httpClient.put<ApiResponse<ProductMedia>>(
      API_ENDPOINTS.productMedia.adminUpdate(id),
      payload,
    );
  },

  /**
   * Đặt ảnh làm ảnh đại diện sản phẩm.
   */
  setPrimary(id: string) {
    return httpClient.patch<ApiResponse<ProductMedia>>(
      API_ENDPOINTS.productMedia.adminSetPrimary(id),
    );
  },

  /**
   * Cập nhật thứ tự hiển thị media.
   */
  updateSortOrder(
    productId: string,
    mediaList: ProductMediaSortItem[],
  ) {
    return httpClient.put<ApiResponse<ProductMedia[]>>(
      API_ENDPOINTS.productMedia.adminUpdateSortOrder(productId),
      { mediaList },
    );
  },

  /**
   * Xóa một media.
   */
  delete(id: string) {
    return httpClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.productMedia.adminDelete(id),
    );
  },

  /**
   * Xóa toàn bộ media của sản phẩm.
   */
  deleteByProduct(productId: string) {
    return httpClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.productMedia.adminDeleteByProduct(productId),
    );
  },
};
