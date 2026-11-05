export type CategoryStatus = 'active' | 'inactive';

/** Parent từ backend có thể là ID hoặc object populate */
export interface CategoryParentApi {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
}

export type CategoryParentIdApi =
  | string
  | CategoryParentApi
  | null;

/** Category đúng theo dữ liệu backend */
export interface CategoryApi {
  _id: string;
  parentId: CategoryParentIdApi;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  productCount?: number;
}

/** Category đã chuẩn hóa cho UI */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  productCount: number;
  status: CategoryStatus;
  createdAt: string;
}

/** Dữ liệu form UI */
export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  status: CategoryStatus;
}

/** Payload gửi backend */
export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  image?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string | null;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CategorySortItem {
  id: string;
  sortOrder: number;
}

export interface CategorySortOrderPayload {
  items: CategorySortItem[];
}

export interface CategoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CategoryListResponse {
  success: boolean;
  message?: string;
  data: Category[];
  pagination?: CategoryPagination;
}

export interface CategoryResponse {
  success: boolean;
  message?: string;
  data: Category;
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

export interface CategoryTreeResponse {
  success: boolean;
  message?: string;
  data: CategoryTreeNode[];
}

export interface CategoryMessageResponse {
  success: boolean;
  message?: string;
}