
/**
 * FILE: ADMIN/src/services/catalog/productMedia.service.ts
 *
 * Upload ảnh dùng FormData; field upload phải khớp middleware backend.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface ProductMedia {
  _id: string;
  productId: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export type ProductMediaPayload = Omit<ProductMedia, '_id'>;

const resource = createResourceService<
  ProductMedia,
  ProductMediaPayload,
  Partial<ProductMediaPayload>
>({
  base: API_ENDPOINTS.productMedia.base,
});

export const productMediaService = {
  ...resource,

  upload(file: File, productId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', productId);

    return httpClient.post<unknown>(
      API_ENDPOINTS.productMedia.base,
      formData,
    );
  },
};
