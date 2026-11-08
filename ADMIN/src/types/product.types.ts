import type { QueryParams } from '../services/api/api.types';

export type ProductStatus = 'active' | 'inactive';

export interface ProductReference {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  logo?: string | null;
}

export interface Product {
  _id?: string;
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;

  categoryId: string | ProductReference;
  brandId: string | ProductReference | null;

  basePrice: number;
  salePrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;

  averageRating: number;
  totalReviews: number;
  totalSales: number;

  metaTitle: string | null;
  metaDescription: string | null;

  isFeatured: boolean;
  isActive: boolean;

  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCreatePayload {
  name: string;
  sku: string;
  slug?: string;
  categoryId: string;
  brandId?: string | null;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export interface ProductListParams extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
}

export interface ProductAdminListResponse {
  success: boolean;
  message?: string;
  data: Product[];
  pagination: ProductPagination;
  stats: ProductStats;
}

export interface ProductApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ProductMessageResponse {
  success: boolean;
  message?: string;
}

export interface UpdateProductStatusPayload {
  isActive: boolean;
}

export interface UpdateProductFeaturedPayload {
  isFeatured: boolean;
}