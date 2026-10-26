
/**
 * FILE: ADMIN/src/services/orders/orders.service.ts
 *
 * Route thay đổi trạng thái đơn hàng cần đối chiếu router backend.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export interface UpdateOrderStatusPayload {
  status: string;
  note?: string;
}

export const ordersService = {
  getOrders(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.orders.base,
      { params },
    );
  },

  getOrderById(id: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.orders.base}/${encodeURIComponent(id)}`,
    );
  },

  updateOrderStatus(id: string, payload: UpdateOrderStatusPayload) {
    return httpClient.patch<unknown>(
      `${API_ENDPOINTS.orders.base}/${encodeURIComponent(id)}/status`,
      payload,
    );
  },
};
