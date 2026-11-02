import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { paymentApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import panels from "../../styles/panels.module.css";

const labels: Record<string, string> = {
  success: "Thanh toán thành công.",
  failed: "Thanh toán không thành công.",
  invalid: "Phiên thanh toán không hợp lệ.",
  pending: "Đơn hàng đang chờ thanh toán.",
};

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const order = params.get("order") ?? "";
  const status = params.get("status") ?? "pending";
  const mock = params.get("mock") === "1";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function complete(success: boolean) {
    setLoading(true);
    setError(null);
    try {
      const result = await paymentApi.mockComplete(order, success);
      setDone(result.message || (success ? "Đã ghi nhận thanh toán thử." : "Đã ghi nhận thanh toán thất bại."));
      showToast(success ? "Thanh toán thử thành công." : "Đã mô phỏng thanh toán thất bại.", success ? "success" : "warning");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageBanner title="Kết quả thanh toán" />
      <div className={`wrap ${panels.stack}`}>
        <h2>{labels[status] ?? "Đã nhận kết quả thanh toán."}</h2>
        {order ? <p>Mã đơn: {order}</p> : <p>Không có mã đơn trong đường dẫn.</p>}
        {done ? <p>{done}</p> : null}
        {error ? <p className={panels.alert}>{error}</p> : null}
        {mock && order && !done ? (
          <div className={panels.row}>
            <Button loading={loading} onClick={() => void complete(true)}>
              Hoàn tất thanh toán thử
            </Button>
            <Button variant="outline" loading={loading} onClick={() => void complete(false)}>
              Mô phỏng thất bại
            </Button>
          </div>
        ) : null}
        <p className={panels.muted}>
          MoMo và ZaloPay hiện không tạo được liên kết thanh toán. VNPay thật chuyển hướng về trang này sau khi cổng xác nhận.
        </p>
        <Link to="/orders">Xem đơn hàng</Link>
      </div>
    </>
  );
}
