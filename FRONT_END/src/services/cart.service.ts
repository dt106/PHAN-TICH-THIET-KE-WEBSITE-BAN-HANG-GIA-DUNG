import { request } from "./http.ts";
import type { CartSummary } from "../types/api.ts";

const getCart = () => {
  return request<CartSummary>("/api/cart");
};

const addToCart = (body: { productId: string; variantId?: string; quantity?: number }) => {
  return request<unknown>("/api/cart", { method: "POST", body });
};

const updateCartItem = (id: string, quantity: number) => {
  return request<unknown>(`/api/cart/${id}`, { method: "PUT", body: { quantity } });
};

const removeCartItem = (id: string) => {
  return request<null>(`/api/cart/${id}`, { method: "DELETE" });
};

const clearCart = () => {
  return request<null>("/api/cart", { method: "DELETE" });
};

export const cartService = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
