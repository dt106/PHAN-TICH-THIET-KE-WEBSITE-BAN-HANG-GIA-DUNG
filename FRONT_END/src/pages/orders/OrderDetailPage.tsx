import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "../../constants/commerce.ts";
import { orderApi, paymentApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { Order, OrderItem, PaymentRecord } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";

function recordId(record: { id?: string; _id?: string } | string | null | undefined) {
  if (!record) return "";
  if (typeof record === "string") return record;
  return String(record.id ?? record._id ?? "");
}

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return Promise.all([orderApi.detail(id), orderApi.items(id), paymentApi.mine()])
      .then(([orderResult, itemResult, paymentResult]) => {
        setOrder(orderResult.data);
        setItems(itemResult.data ?? []);
        setPayments(
          (paymentResult.data ?? []).filter((payment) => recordId(payment.orderId) === id),
        );
        setError(null);
      })
      .catch((reason) => setError(errorMessage(reason)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      showToast(message, "success");
      await load();
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!order) return;
    setBusy(true);
    try {
      const result = await paymentApi.create(order.id);
      const url = result.data.paymentUrl;
      if (url?.startsWith("http")) {
        window.location.assign(url);
        return;
      }
      if (url?.startsWith("mock:")) {
        navigate(`/payment/result?order=${encodeURIComponent(order.orderNumber)}&status=pending&mock=1`);
        return;
      }
      showToast(result.data.bankTransferInfo ? "Đã tạo thông tin chuyển khoản." : "Đã tạo phiên thanh toán.", "success");
      await load();
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  const canCancel = order && ["pending", "confirmed"].includes(order.status) && order.paymentStatus !== "paid";
  const canConfirm = order?.status === "delivered";
  const canPay = order && order.paymentStatus === "pending" && order.paymentMethod !== "COD" && ["pending", "confirmed"].includes(order.status);

  return (
    <>
      <PageBanner title="Chi tiết đơn" current={order?.orderNumber ?? "Đơn hàng"} />
      <div className={`wrap ${panels.stack}`}>
        <Link to="/orders">Quay lại danh sách</Link>
        {loading ? <p>Đang tải đơn hàng...</p> : null}
        {error ? <p className={panels.alert}>{error}</p> : null}
        {order ? (
          <>
            <h2 style={{ margin: 0 }}>{order.orderNumber}</h2>
            <p>
              {ORDER_STATUS_LABEL[order.status]} · {PAYMENT_METHOD_LABEL[order.paymentMethod]} ·{" "}
              {PAYMENT_STATUS_LABEL[order.paymentStatus]}
            </p>
            <p>
              {order.customerName} · {order.customerPhone}
              <br />
              {order.shippingAddress}
              {order.shippingWard ? `, ${order.shippingWard}` : ""}
              {order.shippingDistrict ? `, ${order.shippingDistrict}` : ""}
              {order.shippingProvince ? `, ${order.shippingProvince}` : ""}
            </p>
            {order.note ? <p>Ghi chú: {order.note}</p> : null}
            {items.length === 0 ? <p>Không có dòng sản phẩm.</p> : null}
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  {item.productName}
                  {item.variantSku ? ` (${item.variantSku})` : ""} × {item.quantity} — {formatPrice(item.totalPrice)}
                </li>
              ))}
            </ul>
            <p>Tạm tính {formatPrice(order.subtotal)}</p>
            <p>Giảm giá {formatPrice(order.discountAmount)}</p>
            <p>Phí vận chuyển {formatPrice(order.shippingFee)}</p>
            <strong>Tổng {formatPrice(order.totalAmount)}</strong>
            {payments.length > 0 ? (
              <div>
                <h3>Thanh toán</h3>
                {payments.map((payment) => (
                  <p key={recordId(payment)}>
                    {PAYMENT_STATUS_LABEL[payment.status] ?? payment.status} · {formatPrice(payment.amount)}
                    {payment.transactionCode ? ` · ${payment.transactionCode}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
            <div className={panels.row}>
              {canCancel ? (
                <Button variant="outline" loading={busy} onClick={() => void run(() => orderApi.cancel(order.id), "Đã hủy đơn hàng.")}>
                  Hủy đơn
                </Button>
              ) : null}
              {canConfirm ? (
                <Button loading={busy} onClick={() => void run(() => orderApi.confirmDelivery(order.id), "Đã xác nhận nhận hàng.")}>
                  Đã nhận hàng
                </Button>
              ) : null}
              {canPay ? (
                <Button variant="outline" loading={busy} onClick={() => void pay()}>
                  Thanh toán
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
