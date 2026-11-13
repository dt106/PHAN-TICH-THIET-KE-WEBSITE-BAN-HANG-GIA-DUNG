import { request } from "./http.ts";
import type { CheckoutInput, CheckoutSummary, Order, OrderItem } from "../types/api.ts";

const previewCheckout = (body: CheckoutInput) => {
  return request<CheckoutSummary>("/api/checkout/preview", { method: "POST", body });
};

const placeOrder = (
  body: CheckoutInput & { paymentMethod: NonNullable<CheckoutInput["paymentMethod"]> },
) => {
  return request<{ order: Order; items: OrderItem[] }>("/api/checkout", {
    method: "POST",
    body,
  });
};

export const checkoutService = {
  previewCheckout,
  placeOrder,
};
