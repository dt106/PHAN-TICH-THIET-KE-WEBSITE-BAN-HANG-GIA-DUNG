
/**
 * FILE: ADMIN/src/services/orders/orderItems.service.ts
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export const orderItemsService = {
  getOrderItems(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.orderItems.base,
      { params },
    );
  },

  getOrderItemsByOrderId(orderId: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.orderItems.base}?orderId=${encodeURIComponent(orderId)}`,
    );
  },
};
