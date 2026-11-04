import { request, toQuery } from "./http.ts";
import type { Order, OrderItem, OrderStatus } from "../types/api.ts";

const getMyOrders = (
  params: { status?: OrderStatus; page?: number; limit?: number } = {},
) => {
  return request<Order[]>(`/api/orders/my-orders${toQuery(params)}`);
};

const getOrder = (id: string) => {
  return request<Order>(`/api/orders/${id}`);
};

const getOrderItems = (id: string) => {
  return request<OrderItem[]>(`/api/orders/${id}/items`);
};

const cancelOrder = (id: string) => {
  return request<Order>(`/api/orders/${id}/cancel`, { method: "PUT" });
};

const confirmDelivery = (id: string) => {
  return request<Order>(`/api/orders/${id}/confirm-delivery`, {
    method: "PUT",
  });
};

export const orderService = {
  getMyOrders,
  getOrder,
  getOrderItems,
  cancelOrder,
  confirmDelivery,
};
