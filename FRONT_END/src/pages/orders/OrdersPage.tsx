import { Link, useSearchParams } from "react-router-dom";
import { ButtonLink, PageState, Pagination, StatusBadge } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useRequest } from "../../hooks/useRequest.ts";
import { formatDate, formatMoney } from "../../lib/format.ts";
import { ORDER_STATUSES, orderStatusLabel, orderStatusTone, paymentMethodLabel, paymentStatusLabel } from "../../lib/orderLabel.ts";
import { orderService } from "../../services/order.service.ts";
import type { OrderStatus } from "../../types/api.ts";
import styles from "./OrdersPage.module.css";

const filters = [{ value: "", label: "Tất cả" }, ...ORDER_STATUSES];

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as "" | OrderStatus;
  const page = Number(params.get("page") ?? "1") || 1;
  const { data, error, loading } = useRequest(async () => {
    const result = await orderService.getMyOrders({ status: status || undefined, page, limit: 10 });
    return { orders: result.data, pagination: result.pagination ?? null };
  }, [status, page]);

  function setStatus(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set("status", value);
    else next.delete("status");
    next.delete("page");
    setParams(next);
  }

  const orders = error ? [] : (data?.orders ?? []);
  const pagination = data?.pagination ?? null;

  return (
    <>
      <PageBanner title="Đơn hàng" />
      <div className="wrap section stack">
        <div className={styles.chips} role="tablist" aria-label="Trạng thái đơn">
          {filters.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === item.value}
              onClick={() => setStatus(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <PageState
          loading={loading && !data}
          error={error}
          empty={!loading && orders.length === 0 ? "Chưa có đơn." : undefined}
          backTo="/orders"
          backLabel="Tất cả đơn"
          emptyAction={<Link to="/shop">Xem sản phẩm</Link>}
        />
        {orders.length > 0 ? (
          <div className="stack">
            {orders.map((order) => (
              <article key={order.id} className={`card ${styles.card}`}>
                <div>
                  <h2>{order.orderNumber}</h2>
                  <p className="muted">{formatDate(order.createdAt)} · {paymentMethodLabel(order.paymentMethod)}</p>
                </div>
                <StatusBadge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
                <StatusBadge tone={orderStatusTone(order.paymentStatus)}>{paymentStatusLabel(order.paymentStatus)}</StatusBadge>
                <strong>{formatMoney(order.totalAmount)}</strong>
                <ButtonLink to={`/orders/${order.id}`} variant="outline" size="sm">Xem chi tiết</ButtonLink>
              </article>
            ))}
          </div>
        ) : null}
        <Pagination
          page={page}
          totalPages={pagination?.totalPages ?? 1}
          onChange={(nextPage) => {
            const next = new URLSearchParams(params);
            if (nextPage <= 1) next.delete("page");
            else next.set("page", String(nextPage));
            setParams(next);
          }}
        />
      </div>
    </>
  );
}
