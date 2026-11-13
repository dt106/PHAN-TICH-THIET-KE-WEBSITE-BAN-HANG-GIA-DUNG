// ==========================================
// CUSTOMER API TYPES
// Đối chiếu BACK_END User.model.ts
// ==========================================

export type CustomerRole = 'customer';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export type CustomerSortField =
  | 'createdAt'
  | 'name'
  | 'email';

export type CustomerSortOrder = 'asc' | 'desc';

/**
 * Dữ liệu khách hàng thực tế từ Backend.
 * Không thêm code, gender, segment, totalOrders...
 * vì API hiện tại chưa trả về các trường đó.
 */
export interface AdminCustomer {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: CustomerRole;
  status: CustomerStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Query danh sách khách hàng.
 */
export interface CustomerListParams {
  keyword?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
  sortBy?: CustomerSortField;
  sortOrder?: CustomerSortOrder;
}

/**
 * Payload cập nhật trạng thái.
 */
export interface UpdateCustomerStatusPayload {
  status: CustomerStatus;
}

/**
 * Metadata phân trang Backend.
 */
export interface CustomerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Response danh sách khách hàng.
 */
export interface AdminCustomerListResponse {
  success: boolean;
  message?: string;
  data: AdminCustomer[];
  pagination: CustomerPagination;
}

/**
 * Response chi tiết / cập nhật trạng thái.
 */
export interface AdminCustomerResponse {
  success: boolean;
  message?: string;
  data: AdminCustomer;
}