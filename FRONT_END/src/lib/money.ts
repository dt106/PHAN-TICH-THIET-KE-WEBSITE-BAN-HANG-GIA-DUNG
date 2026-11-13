export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/** BE chưa có bảng phí; client gửi shippingFee. shortcut: phí cố định, nâng khi admin cấu hình phí. */
export const SHIPPING_FEE = 30_000;
