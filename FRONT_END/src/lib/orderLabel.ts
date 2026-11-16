const statuses: { value: string; label: string }[] = [
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "returned", label: "Hoàn trả" },
];

const paymentStatuses: Record<string, string> = {
  pending: "chờ thanh toán",
  paid: "đã thanh toán",
  failed: "thất bại",
  refunded: "đã hoàn",
};

export function orderStatusLabel(status: string) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

export function paymentStatusLabel(status: string) {
  return paymentStatuses[status] ?? status;
}
