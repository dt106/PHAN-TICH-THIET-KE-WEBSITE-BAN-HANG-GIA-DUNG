export const ORDER_STATUSES = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "returned", label: "Hoàn trả" },
] as const;

const paymentStatuses: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  failed: "Thất bại",
  refunded: "Đã hoàn",
};

const paymentMethods: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  MOMO: "Ví MoMo",
  BANK: "Chuyển khoản",
  VNPAY: "VNPay",
  ZALOPAY: "ZaloPay",
};

const tones = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipping: "info",
  delivered: "success",
  completed: "success",
  cancelled: "danger",
  returned: "warning",
  paid: "success",
  failed: "danger",
  refunded: "info",
} as const;

export type StatusTone = (typeof tones)[keyof typeof tones];

export function orderStatusLabel(status: string) {
  return ORDER_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function paymentStatusLabel(status: string) {
  return paymentStatuses[status] ?? status;
}

export function paymentMethodLabel(method: string) {
  return paymentMethods[method] ?? method;
}

export function orderStatusTone(status: string): StatusTone {
  return status in tones ? tones[status as keyof typeof tones] : "info";
}

function selfCheck() {
  if (orderStatusLabel("shipping") !== "Đang giao") throw new Error("orderStatusLabel");
  if (orderStatusTone("cancelled") !== "danger") throw new Error("orderStatusTone");
  if (orderStatusTone("unknown") !== "info") throw new Error("orderStatusTone fallback");
}

selfCheck();
