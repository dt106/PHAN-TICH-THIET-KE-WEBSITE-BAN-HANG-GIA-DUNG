import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { formatMoney } from "../../lib/money.ts";
import { errorText } from "../../services/http.ts";
import { paymentService } from "../../services/payment.service.ts";
import styles from "./MomoCheckoutPage.module.css";

/** Trang giả lập cổng MoMo khi PAYMENT_ENV=mock (sandbox thật bị chặn mạng). */
export function MomoCheckoutPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const order = params.get("order") ?? "";
  const orderId = params.get("id") ?? "";
  const amount = Number(params.get("amount") ?? "0");
  const [busy, setBusy] = useState(false);

  async function finish(success: boolean) {
    if (!order) {
      showToast("Thiếu mã đơn hàng.", "error");
      return;
    }
    setBusy(true);
    try {
      await paymentService.mockCompletePayment(order, success);
      navigate(
        `/payment/result?order=${encodeURIComponent(order)}&status=${success ? "success" : "failed"}${
          orderId ? `&id=${orderId}` : ""
        }`,
      );
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <header className={styles.brand}>
          <span className={styles.logo}>MoMo</span>
          <small>Cổng thanh toán (môi trường demo)</small>
        </header>

        <div className={styles.amountBox}>
          <span>Số tiền thanh toán</span>
          <strong>{formatMoney(amount || 0)}</strong>
        </div>

        <dl className={styles.meta}>
          <div>
            <dt>Nhà cung cấp</dt>
            <dd>Gia Dụng Store</dd>
          </div>
          <div>
            <dt>Mã đơn hàng</dt>
            <dd>{order || "—"}</dd>
          </div>
          <div>
            <dt>Phương thức</dt>
            <dd>Ví MoMo</dd>
          </div>
        </dl>

        <p className={styles.note}>
          Đây là trang giả lập trên máy local. Cổng MoMo test thật đang trả 403 từ mạng của bạn, nên
          không mở được <code>test-payment.momo.vn</code>.
        </p>

        <div className={styles.actions}>
          <Button variant="primary" fullWidth loading={busy} onClick={() => void finish(true)}>
            Thanh toán thành công
          </Button>
          <Button variant="outline" fullWidth disabled={busy} onClick={() => void finish(false)}>
            Hủy thanh toán
          </Button>
        </div>

        <Link to={orderId ? `/orders/${orderId}` : "/orders"} className={styles.back}>
          Quay lại đơn hàng
        </Link>
      </div>
    </div>
  );
}
