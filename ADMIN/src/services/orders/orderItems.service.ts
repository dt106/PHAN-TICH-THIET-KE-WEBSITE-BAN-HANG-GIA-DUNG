
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';
import type { OrderItemsResponse } from '../../types/order-item.types';

export const orderItemsService = {
  getOrderItems(params?: QueryParams) {
    return httpClient.get<OrderItemsResponse>(
      API_ENDPOINTS.orderItems.base,
      { params },
    );
  },

  getOrderItemsByOrderId(orderId: string) {
    return httpClient.get<OrderItemsResponse>(
      API_ENDPOINTS.orderItems.base,
      {
        params: { orderId },
      },
    );
  },
};
