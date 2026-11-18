import { useNavigate, useParams } from "react-router-dom";
import { Button, ButtonLink, PageState, StatusBadge, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { PriceSummary } from "../../components/order/PriceSummary.tsx";
import { useAction } from "../../hooks/useAction.ts";
import { useRequest } from "../../hooks/useRequest.ts";
import { formatAddress, formatMoney } from "../../lib/format.ts";
import { ORDER_STATUSES, orderStatusLabel, orderStatusTone, paymentMethodLabel, paymentStatusLabel } from "../../lib/orderLabel.ts";
import { orderService } from "../../services/order.service.ts";
import { paymentService } from "../../services/payment.service.ts";
import styles from "./OrderDetailPage.module.css";

const flow = ORDER_STATUSES.filter((item) => item.value !== "cancelled" && item.value !== "returned");

export function OrderDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [busy, run] = useAction();
  const { data, error, loading, reload } = useRequest(async () => {
    const [orderResult, itemResult] = await Promise.all([
      orderService.getOrder(id),
      orderService.getOrderItems(id),
    ]);
    return { order: orderResult.data, items: itemResult.data };
  }, [id]);

  const order = data?.order;
  const items = data?.items ?? [];
  if (!order) {
    return (
      <div className="wrap section">
        <PageState loading={loading} error={error} backTo="/orders" backLabel="Danh sách đơn" />
      </div>
    );
  }

  const step = flow.findIndex((item) => item.value === order.status);
  const unpaid = (order.status === "pending" || order.status === "confirmed") && order.paymentStatus !== "paid";
  const canPay = unpaid && order.paymentMethod === "MOMO";
  const canCancel = unpaid;

  return (
    <>
      <PageBanner title={order.orderNumber} />
      <div className={`wrap ${styles.page}`}>
        {step >= 0 ? (
          <ol className="steps">
            {flow.map((item, index) => (
              <li key={item.value} className={index <= step ? "stepDone" : undefined}>
                <span>{index + 1}</span>
                {item.label}
              </li>
            ))}
          </ol>
        ) : null}

        <div className={styles.meta}>
          <StatusBadge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
          <StatusBadge tone={orderStatusTone(order.paymentStatus)}>{paymentStatusLabel(order.paymentStatus)}</StatusBadge>
          <span>{paymentMethodLabel(order.paymentMethod)}</span>
        </div>

        {canPay ? (
          <div className={styles.payBanner}>
            <div>
              <strong>Chờ thanh toán MoMo</strong>
              <p>Đơn chưa được thanh toán. Bấm bên cạnh để mở cổng MoMo.</p>
            </div>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                void run(async () => {
                  const next = await paymentService.startPayment(order.id, order.orderNumber);
                  if (next) navigate(next.path);
                })
              }
            >
              Thanh toán MoMo
            </Button>
          </div>
        ) : null}

        <section className={`card ${styles.block}`}>
          <h2>Giao tới</h2>
          <p>
            {order.customerName} · {order.customerPhone}
          </p>
          <p>
            {formatAddress([
              order.shippingAddress,
              order.shippingWard,
              order.shippingDistrict,
              order.shippingProvince,
            ])}
          </p>
        </section>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className={styles.mark} aria-hidden="true">{item.productName.slice(0, 1)}</span>
                  {item.productName}
                </td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <PriceSummary
          subtotal={order.subtotal}
          discount={order.discountAmount}
          shipping={order.shippingFee}
          total={order.totalAmount}
        />

        <div className={styles.actions}>
          {canCancel ? (
            <Button
              variant="outline"
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await orderService.cancelOrder(order.id);
                  showToast("Đã hủy đơn.", "success");
                  reload();
                })
              }
            >
              Hủy đơn
            </Button>
          ) : null}
          {order.status === "delivered" ? (
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                void run(async () => {
                  await orderService.confirmDelivery(order.id);
                  showToast("Đã xác nhận nhận hàng.", "success");
                  reload();
                })
              }
            >
              Đã nhận hàng
            </Button>
          ) : null}
          <ButtonLink to="/orders" variant="ghost">Tất cả đơn</ButtonLink>
        </div>
      </div>
    </>
  );
}
