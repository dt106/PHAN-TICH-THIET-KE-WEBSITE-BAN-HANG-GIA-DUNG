import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "../../constants/commerce.ts";
import { orderApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { Order, Pagination } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import { Button } from "../../components/common/index.ts";
import panels from "../../styles/panels.module.css";

const statuses = ["", "pending", "confirmed", "processing", "shipping", "delivered", "completed", "cancelled", "returned"];

export function OrdersPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${status}:${page}`;
  const loading = loadedKey !== requestKey;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    orderApi
      .mine({ status: status || undefined, page, limit: 10 })
      .then((result) => {
        if (!active) return;
        setOrders(result.items);
        setPagination(result.pagination ?? null);
        setError(null);
        setLoadedKey(requestKey);
      })
      .catch((reason) => {
        if (!active) return;
        setError(errorMessage(reason));
        setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [page, requestKey, status]);

  return (
    <>
      <PageBanner title="Đơn hàng" />
      <div className={`wrap ${panels.stack}`}>
        <label>
          Trạng thái{" "}
          <select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            {statuses.map((item) => (
              <option key={item || "all"} value={item}>
                {item ? ORDER_STATUS_LABEL[item] : "Tất cả"}
              </option>
            ))}
          </select>
        </label>
        {loading ? <p>Đang tải đơn hàng...</p> : null}
        {error ? <p className={panels.alert}>{error}</p> : null}
        {!loading && !error && orders.length === 0 ? (
          <p>
            Chưa có đơn hàng. <Link to="/shop">Xem cửa hàng</Link>
          </p>
        ) : null}
        {orders.map((order) => (
          <article key={order.id} className={panels.card}>
            <h2 style={{ margin: 0, fontSize: 22 }}>
              <Link to={`/orders/${order.id}`}>{order.orderNumber}</Link>
            </h2>
            <p>
              {ORDER_STATUS_LABEL[order.status] ?? order.status} · {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </p>
            <p>{new Date(order.createdAt).toLocaleString("vi-VN")}</p>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </article>
        ))}
        {pagination && pagination.totalPages > 1 ? (
          <div className={panels.pager}>
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              Trước
            </Button>
            <span>
              Trang {pagination.page}/{pagination.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
