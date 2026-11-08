import { httpClient } from '../api/httpClient';

import type {
  CategoryApi,
  Category,
  CategoryFormValues,
  CategoryPayload,
  CategoryListParams,
  CategoryListResponse,
  CategoryResponse,
  CategoryTreeNode,
  CategoryTreeResponse,
  CategoryMessageResponse,
  CategorySortOrderPayload,
  CategoryPagination,
} from '../../types/category.types';

// =========================================================
// API RESPONSE TYPES
// =========================================================

interface CategoryApiListResponse {
  success: boolean;
  message?: string;
  data: CategoryApi[];
  pagination?: CategoryPagination;
}

interface CategoryApiResponse {
  success: boolean;
  message?: string;
  data: CategoryApi;
}

interface CategoryApiTreeNode extends CategoryApi {
  children?: CategoryApiTreeNode[];
}

interface CategoryApiTreeResponse {
  success: boolean;
  message?: string;
  data: CategoryApiTreeNode[];
}

// =========================================================
// ENDPOINTS
// =========================================================

const CATEGORY_ENDPOINTS = {
  admin: '/admin/categories',
  adminList: '/admin/categories/all',

  public: '/categories',
  publicTree: '/categories/tree',

  publicBySlug: (slug: string) =>
    `/categories/slug/${encodeURIComponent(slug)}`,
} as const;

// =========================================================
// MAPPERS
// =========================================================

function mapParentId(
  parentId: CategoryApi['parentId'],
): string | null {
  if (!parentId) return null;

  if (typeof parentId === 'string') {
    return parentId;
  }

  return parentId._id ?? parentId.id ?? null;
}

function mapCategory(api: CategoryApi): Category {
  const id = api._id ?? api.id;

  return {
    id: id ? String(id) : '',
    name: api.name,
    slug: api.slug,
    description: api.description ?? '',
    parentId: mapParentId(api.parentId),
    productCount: api.productCount ?? 0,
    status: api.isActive ? 'active' : 'inactive',
    createdAt: api.createdAt ?? '',
  };
}

function mapTreeNode(
  api: CategoryApiTreeNode,
): CategoryTreeNode {
  return {
    ...mapCategory(api),
    children: (api.children ?? []).map(mapTreeNode),
  };
}

function mapFormPayload(
  values: CategoryFormValues,
): CategoryPayload {
  return {
    name: values.name.trim(),
    slug: values.slug.trim() || undefined,
    description: values.description.trim() || undefined,
    parentId: values.parentId || null,
    isActive: values.status === 'active',
  };
}

function buildListParams(params?: CategoryListParams) {
  if (!params) return undefined;

  return {
    ...params,
    parentId:
      params.parentId === null
        ? 'null'
        : params.parentId,
  };
}

function mapListResponse(
  response: CategoryApiListResponse,
): CategoryListResponse {
  return {
    success: response.success,
    message: response.message,
    data: response.data.map(mapCategory),
    pagination: response.pagination,
  };
}

function mapSingleResponse(
  response: CategoryApiResponse,
): CategoryResponse {
  return {
    success: response.success,
    message: response.message,
    data: mapCategory(response.data),
  };
}

// =========================================================
// CATEGORY SERVICE
// =========================================================

export const categoriesService = {
  // -------------------------
  // ADMIN
  // -------------------------

  async getAdminList(
    params?: CategoryListParams,
  ): Promise<CategoryListResponse> {
    const response =
      await httpClient.get<CategoryApiListResponse>(
        CATEGORY_ENDPOINTS.adminList,
        {
          params: buildListParams(params),
        },
      );

    return mapListResponse(response);
  },

  async getAdminById(id: string): Promise<CategoryResponse> {
    const response =
      await httpClient.get<CategoryApiResponse>(
        `${CATEGORY_ENDPOINTS.admin}/${encodeURIComponent(id)}`,
      );

    return mapSingleResponse(response);
  },

  async create(
    values: CategoryFormValues,
  ): Promise<CategoryResponse> {
    const response =
      await httpClient.post<CategoryApiResponse>(
        CATEGORY_ENDPOINTS.admin,
        mapFormPayload(values),
      );

    return mapSingleResponse(response);
  },

  async update(
    id: string,
    values: CategoryFormValues,
  ): Promise<CategoryResponse> {
    const response =
      await httpClient.put<CategoryApiResponse>(
        `${CATEGORY_ENDPOINTS.admin}/${encodeURIComponent(id)}`,
        mapFormPayload(values),
      );

    return mapSingleResponse(response);
  },

  async updateStatus(
    id: string,
    isActive: boolean,
  ): Promise<CategoryResponse> {
    const response =
      await httpClient.patch<CategoryApiResponse>(
        `${CATEGORY_ENDPOINTS.admin}/${encodeURIComponent(id)}/status`,
        { isActive },
      );

    return mapSingleResponse(response);
  },

  updateSortOrder(
    payload: CategorySortOrderPayload,
  ): Promise<CategoryMessageResponse> {
    return httpClient.put<CategoryMessageResponse>(
      `${CATEGORY_ENDPOINTS.admin}/sort-order`,
      payload,
    );
  },

  delete(id: string): Promise<CategoryMessageResponse> {
    return httpClient.delete<CategoryMessageResponse>(
      `${CATEGORY_ENDPOINTS.admin}/${encodeURIComponent(id)}`,
    );
  },

  // -------------------------
  // PUBLIC
  // -------------------------

  async getPublicList(
    params?: CategoryListParams,
  ): Promise<CategoryListResponse> {
    const response =
      await httpClient.get<CategoryApiListResponse>(
        CATEGORY_ENDPOINTS.public,
        {
          params: buildListParams(params),
        },
      );

    return mapListResponse(response);
  },

  async getPublicTree(): Promise<CategoryTreeResponse> {
    const response =
      await httpClient.get<CategoryApiTreeResponse>(
        CATEGORY_ENDPOINTS.publicTree,
      );

    return {
      success: response.success,
      message: response.message,
      data: response.data.map(mapTreeNode),
    };
  },

  async getPublicById(id: string): Promise<CategoryResponse> {
    const response =
      await httpClient.get<CategoryApiResponse>(
        `${CATEGORY_ENDPOINTS.public}/${encodeURIComponent(id)}`,
      );

    return mapSingleResponse(response);
  },

  async getPublicBySlug(
    slug: string,
  ): Promise<CategoryResponse> {
    const response =
      await httpClient.get<CategoryApiResponse>(
        CATEGORY_ENDPOINTS.publicBySlug(slug),
      );

    return mapSingleResponse(response);
  },
};