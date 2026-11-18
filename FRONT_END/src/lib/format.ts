export function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export const formatDate = (iso: string) => new Date(iso).toLocaleString("vi-VN");

export const formatAddress = (parts: (string | undefined | null)[]) =>
  parts.filter(Boolean).join(", ");

/** BE chưa có bảng phí; client gửi shippingFee. shortcut: phí cố định, nâng khi admin cấu hình phí. */
export const SHIPPING_FEE = 30_000;

function selfCheck() {
  if (formatAddress(["a", "", null, "b"]) !== "a, b") {
    throw new Error("formatAddress self-check failed");
  }
  if (!formatDate("2020-01-02T03:04:00.000Z")) {
    throw new Error("formatDate self-check failed");
  }
}

selfCheck();
