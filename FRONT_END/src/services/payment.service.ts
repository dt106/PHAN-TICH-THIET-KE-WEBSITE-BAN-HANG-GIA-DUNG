import { request } from "./http.ts";
import type { PaymentSession } from "../types/api.ts";

export type MyPayment = {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt?: string;
  order?: { orderNumber?: string; status?: string };
};

const createPayment = (orderId: string) => {
  return request<PaymentSession>("/api/payments", { method: "POST", body: { orderId } });
};

const getMyPayments = () => {
  return request<MyPayment[]>("/api/payments/my-payments");
};

/** Chỉ có khi backend chạy PAYMENT_ENV=mock. */
const mockCompletePayment = (orderNumber: string, success = true) => {
  return request<unknown>("/api/payments/mock/complete", {
    method: "POST",
    auth: false,
    body: { orderNumber, success },
  });
};

export const paymentService = {
  createPayment,
  getMyPayments,
  mockCompletePayment,
};
