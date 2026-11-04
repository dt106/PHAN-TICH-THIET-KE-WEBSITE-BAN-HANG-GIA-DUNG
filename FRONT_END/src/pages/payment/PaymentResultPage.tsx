import { Link, useSearchParams } from "react-router-dom";
import { PageBanner } from "../../components/layout/PageBanner.tsx";

const labels: Record<string, string> = {
  success: "Thanh toán thành công.",
  failed: "Thanh toán thất bại.",
  invalid: "Chữ ký hoặc dữ liệu thanh toán không hợp lệ.",
};

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const order = params.get("order") ?? "";
  const status = params.get("status") ?? "";

  return (
    <>
      <PageBanner title="Kết quả thanh toán" />
      <div className="wrap" style={{ padding: "64px 0" }}>
        <p>{labels[status] ?? "Đã nhận kết quả từ cổng thanh toán."}</p>
        {order ? <p>Mã đơn: {order}</p> : null}
        <Link to="/orders">Xem đơn hàng</Link>
      </div>
    </>
  );
}
