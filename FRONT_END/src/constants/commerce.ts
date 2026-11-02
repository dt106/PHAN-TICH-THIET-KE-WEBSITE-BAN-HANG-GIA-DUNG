/** Phí vận chuyển do client gửi — backend chưa có bảng phí. */
export const FREE_SHIPPING_FROM = 3_000_000;
export const STANDARD_SHIPPING_FEE = 30_000;

export function shippingFeeFor(subtotal: number) {
  return subtotal >= FREE_SHIPPING_FROM ? 0 : STANDARD_SHIPPING_FEE;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
  returned: "Hoàn trả",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Chưa thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "Thanh toán khi nhận hàng",
  BANK: "Chuyển khoản ngân hàng",
  VNPAY: "VNPay",
  MOMO: "MoMo",
  ZALOPAY: "ZaloPay",
};

export const PASSWORD_HINT =
  "Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.";
