import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

import type {
  OrderDetailResponse,
  OrderListResponse,
  OrderStatus,
} from '../../types/order.types';

export interface UpdateOrderStatusPayload {
  status: OrderStatus;
  note?: string;
}

export const ordersService = {
  /**
   * GET /admin/orders
   * Danh sách đơn hàng có phân trang và bộ lọc.
   */
  getOrders(params?: QueryParams) {
    return httpClient.get<OrderListResponse>(
      API_ENDPOINTS.orders.base,
      { params },
    );
  },

  /**
   * GET /admin/orders/:id
   * Chi tiết đơn hàng.
   */
  getOrderById(id: string) {
    return httpClient.get<OrderDetailResponse>(
      `${API_ENDPOINTS.orders.base}/${encodeURIComponent(id)}`,
    );
  },

  /**
   * PUT /admin/orders/:id/status
   * Backend xử lý nghiệp vụ chuyển trạng thái.
   */
  updateOrderStatus(
    id: string,
    payload: UpdateOrderStatusPayload,
  ) {
    return httpClient.put<{
      success: boolean;
      message?: string;
      data?: unknown;
    }>(
      `${API_ENDPOINTS.orders.base}/${encodeURIComponent(id)}/status`,
      payload,
    );
  },
};