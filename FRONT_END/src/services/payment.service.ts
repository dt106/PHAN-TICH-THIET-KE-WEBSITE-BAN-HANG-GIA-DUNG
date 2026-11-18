import type { MyPayment, PaymentSession } from "../types/api.ts";
import { request } from "./http.ts";

const createPayment = (orderId: string) =>
  request<PaymentSession>("/api/payments", { method: "POST", body: { orderId } });

const getMyPayments = () => request<MyPayment[]>("/api/payments/my-payments");

/** Chỉ có khi backend chạy PAYMENT_ENV=mock. */
const mockCompletePayment = (orderNumber: string, success = true) =>
  request<unknown>("/api/payments/mock/complete", {
    method: "POST",
    auth: false,
    body: { orderNumber, success },
  });

/**
 * Tạo phiên MoMo. Cổng thật → redirect ngoài.
 * PAYMENT_ENV=mock → trang giả lập /payment/momo trên web.
 */
const startPayment = async (orderId: string, orderNumber: string) => {
  const session = await createPayment(orderId);
  const url = session.data.paymentUrl;
  if (url?.startsWith("http")) {
    window.location.assign(url);
    return null;
  }
  if (url?.startsWith("mock:")) {
    const amount = session.data.payment.amount;
    return {
      path: `/payment/momo?order=${encodeURIComponent(orderNumber)}&id=${orderId}&amount=${amount}`,
    };
  }
  throw new Error("Không tạo được link thanh toán MoMo.");
};

export const paymentService = {
  createPayment,
  getMyPayments,
  mockCompletePayment,
  startPayment,
};
