
/**
 * FILE: ADMIN/src/services/catalog/products.service.ts
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export interface Product {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  salePrice?: number;
  stock?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductPayload {
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  salePrice?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateProductStatusPayload {
  isActive: boolean;
}

export interface UpdateProductFeaturedPayload {
  isFeatured: boolean;
}

export const productsService = {
  getProducts(params?: QueryParams) {
    return httpClient.get<unknown>(API_ENDPOINTS.products.list, { params });
  },

  getAdminProducts(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.products.adminList,
      { params },
    );
  },

  getProductById(id: string) {
    return httpClient.get<unknown>(API_ENDPOINTS.products.detail(id));
  },

  getAdminProductById(id: string) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.products.adminDetail(id),
    );
  },

  getProductBySlug(slug: string) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.products.bySlug(slug),
    );
  },

  getFeaturedProducts(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.products.featured,
      { params },
    );
  },

  getRelatedProducts(id: string) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.products.related(id),
    );
  },

  createProduct(payload: ProductPayload) {
    return httpClient.post<unknown>(
      API_ENDPOINTS.products.create,
      payload,
    );
  },

  updateProduct(id: string, payload: Partial<ProductPayload>) {
    return httpClient.put<unknown>(
      API_ENDPOINTS.products.update(id),
      payload,
    );
  },

  updateProductStatus(
    id: string,
    payload: UpdateProductStatusPayload,
  ) {
    return httpClient.patch<unknown>(
      API_ENDPOINTS.products.status(id),
      payload,
    );
  },

  updateProductFeatured(
    id: string,
    payload: UpdateProductFeaturedPayload,
  ) {
    return httpClient.patch<unknown>(
      API_ENDPOINTS.products.featuredStatus(id),
      payload,
    );
  },

  deleteProduct(id: string) {
    return httpClient.delete<unknown>(
      API_ENDPOINTS.products.delete(id),
    );
  },
};
