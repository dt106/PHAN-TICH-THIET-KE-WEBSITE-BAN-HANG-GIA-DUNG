import { request, toQuery } from "./http.ts";
import type { Order, OrderItem, OrderStatus } from "../types/api.ts";

const getMyOrders = (
  params: { status?: OrderStatus; page?: number; limit?: number } = {},
) => request<Order[]>(`/api/orders/my-orders${toQuery(params)}`);

const getOrder = (id: string) => request<Order>(`/api/orders/${id}`);

const getOrderItems = (id: string) => request<OrderItem[]>(`/api/orders/${id}/items`);

const cancelOrder = (id: string) => request<Order>(`/api/orders/${id}/cancel`, { method: "PUT" });

const confirmDelivery = (id: string) => request<Order>(`/api/orders/${id}/confirm-delivery`, {
    method: "PUT",
  });

export const orderService = {
  getMyOrders,
  getOrder,
  getOrderItems,
  cancelOrder,
  confirmDelivery,
};
