import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { formatMoney } from "../../lib/money.ts";
import { errorText } from "../../services/http.ts";
import { orderService } from "../../services/order.service.ts";
import type { BankTransferInfo, Order, OrderItem } from "../../types/api.ts";
import { orderStatusLabel } from "./OrdersPage.tsx";

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const bank = (location.state as { bank?: BankTransferInfo | null } | null)?.bank;
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");

  function load() {
    Promise.all([orderService.getOrder(id), orderService.getOrderItems(id)])
      .then(([orderResult, itemResult]) => {
        setOrder(orderResult.data);
        setItems(itemResult.data);
        setError("");
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function run(action: () => Promise<unknown>, ok: string) {
    try {
      await action();
      showToast(ok, "success");
      load();
    } catch (reason) {
      showToast(errorText(reason), "error");
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

  const canCancel =
    (order.status === "pending" || order.status === "confirmed") && order.paymentStatus !== "paid";

  return (
    <>
      <PageBanner title={order.orderNumber} />
      <div className="wrap" style={{ padding: "64px 0", display: "grid", gap: 12, maxWidth: 720 }}>
        <p>
          {orderStatusLabel(order.status)} · Thanh toán {order.paymentStatus} · {order.paymentMethod}
        </p>
        <p>
          {order.customerName} · {order.customerPhone}
          <br />
          {[order.shippingAddress, order.shippingWard, order.shippingDistrict, order.shippingProvince]
            .filter(Boolean)
            .join(", ")}
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              {item.productName} × {item.quantity} — {formatMoney(item.totalPrice)}
            </li>
          ))}
        </ul>
        <p>Tạm tính {formatMoney(order.subtotal)}</p>
        <p>Giảm {formatMoney(order.discountAmount)} · Phí ship {formatMoney(order.shippingFee)}</p>
        <strong>Tổng {formatMoney(order.totalAmount)}</strong>
        {bank ? (
          <p>
            Chuyển khoản {bank.bankName} · {bank.accountNumber} · {bank.accountHolder}
            <br />
            Nội dung: {bank.transferContent}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 12 }}>
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
