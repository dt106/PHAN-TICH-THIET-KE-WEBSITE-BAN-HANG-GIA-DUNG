
/**
 * FILE: ADMIN/src/services/customers/customers.service.ts
 *
 * NHIỆM VỤ:
 * - Lấy danh sách khách hàng.
 * - Lấy chi tiết khách hàng.
 * - Cập nhật trạng thái khách hàng.
 *
 * Sử dụng:
 * - httpClient dùng chung để gửi request.
 * - API_ENDPOINTS để quản lý endpoint.
 * - customer.types.ts để quản lý kiểu dữ liệu.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';

import type {
  AdminCustomerListResponse,
  AdminCustomerResponse,
  CustomerListParams,
  UpdateCustomerStatusPayload,
} from '../../types/customer.types';

import type { QueryParams } from '../api/api.types';

export const customersService = {
  /**
   * GET /api/admin/customers
   *
   * Lấy danh sách khách hàng:
   * - Tìm kiếm theo tên, email, số điện thoại.
   * - Lọc trạng thái.
   * - Phân trang.
   * - Sắp xếp.
   */
  getCustomers(
    params: CustomerListParams = {},
  ): Promise<AdminCustomerListResponse> {
    return httpClient.get<AdminCustomerListResponse>(
      API_ENDPOINTS.customers.list,
      {
        params: params as QueryParams,
      },
    );
  },

  /**
   * GET /api/admin/customers/:id
   *
   * Lấy thông tin chi tiết một khách hàng.
   */
  getCustomerById(
    id: string,
  ): Promise<AdminCustomerResponse> {
    return httpClient.get<AdminCustomerResponse>(
      API_ENDPOINTS.customers.detail(id),
    );
  },

  /**
   * PATCH /api/admin/customers/:id/status
   *
   * Cập nhật trạng thái:
   * - active
   * - inactive
   * - blocked
   */
  updateCustomerStatus(
    id: string,
    payload: UpdateCustomerStatusPayload,
  ): Promise<AdminCustomerResponse> {
    return httpClient.patch<AdminCustomerResponse>(
      API_ENDPOINTS.customers.status(id),
      payload,
    );
  },
};
