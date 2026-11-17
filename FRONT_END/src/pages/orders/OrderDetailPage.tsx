import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { formatMoney } from "../../lib/money.ts";
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "../../lib/orderLabel.ts";
import { errorText } from "../../services/http.ts";
import { orderService } from "../../services/order.service.ts";
import { paymentService } from "../../services/payment.service.ts";
import type { Order, OrderItem } from "../../types/api.ts";
import styles from "./OrderDetailPage.module.css";

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(() => {
    Promise.all([orderService.getOrder(id), orderService.getOrderItems(id)])
      .then(([orderResult, itemResult]) => {
        setOrder(orderResult.data);
        setItems(itemResult.data);
        setError("");
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>, ok: string) {
    try {
      await action();
      showToast(ok, "success");
      load();
    } catch (reason) {
      showToast(errorText(reason), "error");
    }
  }

  async function payNow() {
    if (!order) return;
    setPaying(true);
    try {
      const next = await paymentService.startPayment(order.id, order.orderNumber);
      if (next) navigate(next.path);
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setPaying(false);
    }
  }

  if (error) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <p>{error}</p>
        <Link to="/orders">Danh sách đơn</Link>
      </div>
    );
  }
  if (!order) return <p className="wrap" style={{ padding: "64px 0" }}>Đang tải…</p>;

  const unpaid =
    (order.status === "pending" || order.status === "confirmed") && order.paymentStatus !== "paid";
  const canPay = unpaid && order.paymentMethod === "MOMO";
  const canCancel = unpaid;

  return (
    <>
      <PageBanner title={order.orderNumber} />
      <div className={`wrap ${styles.page}`}>
        <div className={styles.meta}>
          <span>{orderStatusLabel(order.status)}</span>
          <span>{paymentStatusLabel(order.paymentStatus)}</span>
          <span>{paymentMethodLabel(order.paymentMethod)}</span>
        </div>

        {canPay ? (
          <div className={styles.payBanner}>
            <div>
              <strong>Chờ thanh toán MoMo</strong>
              <p>Đơn chưa được thanh toán. Bấm bên cạnh để mở cổng MoMo.</p>
            </div>
            <Button variant="primary" loading={paying} onClick={() => void payNow()}>
              Thanh toán MoMo
            </Button>
          </div>
        ) : null}

        <p>
          {order.customerName} · {order.customerPhone}
          <br />
          {[order.shippingAddress, order.shippingWard, order.shippingDistrict, order.shippingProvince]
            .filter(Boolean)
            .join(", ")}
        </p>
        <ul className={styles.items}>
          {items.map((item) => (
            <li key={item.id}>
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatMoney(item.totalPrice)}</span>
            </li>
          ))}
        </ul>
        <dl className={styles.totals}>
          <div>
            <dt>Tạm tính</dt>
            <dd>{formatMoney(order.subtotal)}</dd>
          </div>
          <div>
            <dt>Giảm giá</dt>
            <dd>{formatMoney(order.discountAmount)}</dd>
          </div>
          <div>
            <dt>Phí ship</dt>
            <dd>{formatMoney(order.shippingFee)}</dd>
          </div>
          <div className={styles.grand}>
            <dt>Tổng</dt>
            <dd>{formatMoney(order.totalAmount)}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {canCancel ? (
            <Button variant="outline" onClick={() => void run(() => orderService.cancelOrder(order.id), "Đã hủy đơn.")}>
              Hủy đơn
            </Button>
          ) : null}
          {order.status === "delivered" ? (
            <Button
              variant="primary"
              onClick={() => void run(() => orderService.confirmDelivery(order.id), "Đã xác nhận nhận hàng.")}
            >
              Đã nhận hàng
            </Button>
          ) : null}
          <Link to="/orders">Tất cả đơn</Link>
        </div>
      </div>
    </>
  );
}
