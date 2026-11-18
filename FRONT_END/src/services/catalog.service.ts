import { request, toQuery } from "./http.ts";
import type { Brand, Category, Product } from "../types/api.ts";

const getCategories = (
  params: { parentId?: string; page?: number; limit?: number; search?: string } = {},
) => request<Category[]>(`/api/categories${toQuery(params)}`);

const getCategoryTree = () => request<Category[]>("/api/categories/tree");

const getBrands = (params: { page?: number; limit?: number; search?: string } = {}) => request<Brand[]>(`/api/brands${toQuery(params)}`);

const getProducts = (
  params: {
    page?: number;
    limit?: number;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    isFeatured?: boolean;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc" | "sales" | "rating";
  } = {},
) => request<Product[]>(`/api/products${toQuery(params)}`);

const getFeaturedProducts = (limit = 8) => request<Product[]>(`/api/products/featured${toQuery({ limit })}`);

const getRelatedProducts = (id: string, limit = 4) => request<Product[]>(`/api/products/related/${id}${toQuery({ limit })}`);

const getProductBySlug = (slug: string) => request<Product>(`/api/products/slug/${encodeURIComponent(slug)}`);

export const catalogService = {
  getCategories,
  getCategoryTree,
  getBrands,
  getProducts,
  getFeaturedProducts,
  getRelatedProducts,
  getProductBySlug,
};
