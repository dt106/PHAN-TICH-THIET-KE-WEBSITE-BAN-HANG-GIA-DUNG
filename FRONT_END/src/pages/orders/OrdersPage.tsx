import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { formatMoney } from "../../lib/money.ts";
import { errorText } from "../../services/http.ts";
import type { Pagination } from "../../services/http.ts";
import { orderService } from "../../services/order.service.ts";
import type { Order, OrderStatus } from "../../types/api.ts";

const statuses: { value: "" | OrderStatus; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "confirmed", label: "Đã xác nhận" },
  { value: "processing", label: "Đang xử lý" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
  { value: "completed", label: "Hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "returned", label: "Hoàn trả" },
];

export function orderStatusLabel(status: string) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as "" | OrderStatus;
  const page = Number(params.get("page") ?? "1") || 1;
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    orderService.getMyOrders({ status: status || undefined, page, limit: 10 })
      .then((result) => {
        setOrders(result.data);
        setPagination(result.pagination ?? null);
        setError("");
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }, [status, page]);

  return (
    <>
      <PageBanner title="Orders" />
      <div className="wrap" style={{ padding: "64px 0" }}>
        <label>
          Trạng thái{" "}
          <select
            value={status}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) next.set("status", event.target.value);
              else next.delete("status");
              next.delete("page");
              setParams(next);
            }}
          >
            {statuses.map((item) => (
              <option key={item.value || "all"} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        {error ? <p>{error}</p> : null}
        {orders.length === 0 ? (
          <p>
            Chưa có đơn. <Link to="/shop">Xem sản phẩm</Link>
          </p>
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            {orders.map((order) => (
              <article key={order.id} style={{ borderBottom: "1px solid #e8e8e8", paddingBottom: 16 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>
                  <Link to={`/orders/${order.id}`}>{order.orderNumber}</Link>
                  {" · "}
                  {orderStatusLabel(order.status)}
                </h2>
                <p>
                  {new Date(order.createdAt).toLocaleString("vi-VN")} · {order.paymentMethod} ·{" "}
                  {order.paymentStatus}
                </p>
                <strong>Tổng {formatMoney(order.totalAmount)}</strong>
              </article>
            ))}
          </div>
        )}
        {pagination && pagination.totalPages > 1 ? (
          <p>
            Trang {page}/{pagination.totalPages}{" "}
            <button type="button" disabled={page <= 1} onClick={() => setParams({ status, page: String(page - 1) })}>
              Trước
            </button>{" "}
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setParams({ status, page: String(page + 1) })}
            >
              Sau
            </button>
          </p>
        ) : null}
      </div>
    </>
  );
}
