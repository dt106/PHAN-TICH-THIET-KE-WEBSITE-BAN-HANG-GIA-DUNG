import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  Save,
  Truck,
  UserRound,
  Wallet,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';

import { ordersService } from '../../services/orders/orders.service';
import { orderItemsService } from '../../services/orders/orderItems.service';

import type { Order, OrderStatus, PaymentStatus } from '../../types/order.types';
import type { OrderItem } from '../../types/order-item.types';

import OrderItemsTable from './components/OrderItemsTable';
import OrderStatusTimeline from './components/OrderStatusTimeline';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

interface StatusMeta {
  label: string;
  variant: BadgeVariant;
}

const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  pending: { label: 'Chờ xác nhận', variant: 'warning' },
  confirmed: { label: 'Đã xác nhận', variant: 'info' },
  processing: { label: 'Đang xử lý', variant: 'purple' },
  shipping: { label: 'Đang giao hàng', variant: 'info' },
  delivered: { label: 'Đã giao hàng', variant: 'success' },
  completed: { label: 'Hoàn thành', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'danger' },
  returned: { label: 'Đã trả hàng', variant: 'neutral' },
};

const PAYMENT_STATUS_META: Record<PaymentStatus, StatusMeta> = {
  pending: { label: 'Chưa thanh toán', variant: 'warning' },
  paid: { label: 'Đã thanh toán', variant: 'success' },
  failed: { label: 'Thanh toán thất bại', variant: 'danger' },
  refunded: { label: 'Đã hoàn tiền', variant: 'purple' },
};

const PAYMENT_METHOD_LABELS: Record<Order['paymentMethod'], string> = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  BANK: 'Chuyển khoản ngân hàng',
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPay',
  ZALOPAY: 'ZaloPay',
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered', 'completed', 'cancelled'],
  delivered: ['completed', 'returned'],
  completed: ['returned'],
  cancelled: [],
  returned: [],
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type OrderWithOptionalId = Order & { id?: string };

function formatCurrency(value: number | null | undefined): string {
  return CURRENCY_FORMATTER.format(Number(value) || 0);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMATTER.format(date);
}

function normalizeOrderId(order: OrderWithOptionalId): string {
  return String(order._id || order.id || '').trim();
}

/* ================= UI PRIMITIVES ================= */

function Card({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-card border border-border-default bg-bg-surface">
      <header className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value?: string | null;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-text-muted">{label}</span>
      <span
        className={`wrap-break-word text-right text-sm font-medium text-text-primary ${valueClassName}`}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  valueClassName = '',
}: {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-text-muted">
        <Icon size={14} className="shrink-0" />
        <span>{title}</span>
      </div>
      <p
        className={`mt-2 wrap-break-word text-lg font-bold text-text-primary sm:text-xl ${valueClassName}`}
      >
        {value}
      </p>
      {description && (
        <p className="mt-1 wrap-break-word truncate text-xs text-text-muted">
          {description}
        </p>
      )}
    </div>
  );
}

/* ================= MAIN PAGE ================= */

export default function OrderDetailPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string; orderId?: string }>();
  const id = params.id || params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };

    const fetchOrderDetail = async () => {
      try {
        const [orderResult, itemsResult] = await Promise.allSettled([
          ordersService.getOrderById(id),
          orderItemsService.getOrderItemsByOrderId(id),
        ]);

        if (!active) return;

        if (orderResult.status === 'rejected') {
          throw orderResult.reason;
        }

        const orderData = orderResult.value.data?.order;
        if (!orderData) {
          throw new Error('Backend không trả về thông tin đơn hàng.');
        }

        const orderId = normalizeOrderId(orderData as OrderWithOptionalId);
        if (!orderId || orderId === 'undefined' || orderId === 'null') {
          throw new Error('Đơn hàng không có ID hợp lệ. Vui lòng kiểm tra response API.');
        }

        const normalizedOrder: Order = { ...orderData, _id: orderId };

        setOrder(normalizedOrder);
        setSelectedStatus(normalizedOrder.status);
        setError('');

        if (itemsResult.status === 'fulfilled') {
          const itemsData = itemsResult.value.data;
          setOrderItems(Array.isArray(itemsData) ? itemsData : []);
        } else {
          setOrderItems([]);
        }
      } catch (err) {
        if (!active) return;
        setOrder(null);
        setOrderItems([]);
        setError(err instanceof Error ? err.message : 'Không thể tải thông tin đơn hàng.');
      } finally {
        if (active) {
          setLoading(false);
          setItemsLoading(false);
        }
      }
    };

    void fetchOrderDetail();
    return () => { active = false; };
  }, [id]);

  const allowedStatuses = order ? ALLOWED_TRANSITIONS[order.status] ?? [] : [];
  const currentStatus = order ? ORDER_STATUS_META[order.status] : null;
  const paymentStatus = order ? PAYMENT_STATUS_META[order.paymentStatus] : null;

  const fullAddress = order
    ? [order.shippingAddress, order.shippingWard, order.shippingDistrict, order.shippingProvince]
      .filter(Boolean)
      .join(', ')
    : '';

  const hasStatusChange =
    Boolean(order?._id) && Boolean(selectedStatus) && selectedStatus !== order?.status;

  const handleSaveStatus = async () => {
    if (!order || !selectedStatus || !hasStatusChange || saving) return;

    const orderId = String(order._id || '').trim();
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      setError('ID đơn hàng không hợp lệ. Không thể cập nhật trạng thái.');
      return;
    }

    const validTransitions = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!validTransitions.includes(selectedStatus)) {
      setError('Trạng thái mới không nằm trong luồng xử lý hợp lệ.');
      return;
    }

    setSaving(true);
    setError('');
    setSaveMessage('');

    try {
      const response = await ordersService.updateOrderStatus(orderId, { status: selectedStatus });
      if (!response.success) {
        throw new Error(response.message || 'Backend không thể cập nhật trạng thái đơn hàng.');
      }

      setOrder((currentOrder) => {
        if (!currentOrder) return currentOrder;
        return { ...currentOrder, status: selectedStatus, updatedAt: new Date().toISOString() };
      });
      setSelectedStatus(selectedStatus);
      setSaveMessage(response.message || 'Cập nhật trạng thái đơn hàng thành công.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cập nhật trạng thái thất bại.');
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
        <Package size={32} className="mb-4 text-text-muted" />
        <h1 className="text-lg font-semibold text-text-primary">Thiếu mã đơn hàng</h1>
        <p className="mt-2 text-sm text-text-secondary">Đường dẫn không chứa ID đơn hàng hợp lệ.</p>
        <Button className="mt-5" onClick={() => navigate('/orders')}>
          <ArrowLeft size={16} className="mr-2" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] p-6">
        <LoadingState />
      </div>
    );
  }

  if (!order || !currentStatus) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-bg-elevated text-text-muted">
          <Package size={26} />
        </div>
        <h1 className="text-lg font-semibold text-text-primary">Không tìm thấy đơn hàng</h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
          {error || 'Đơn hàng không tồn tại hoặc không có dữ liệu.'}
        </p>
        <Button className="mt-5" onClick={() => navigate('/orders')}>
          <ArrowLeft size={16} className="mr-2" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 p-4 pb-8 sm:p-6">
      {/* ============ HEADER ============ */}
      <header className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted transition-colors hover:text-accent-primary"
        >
          <ArrowLeft size={14} /> Danh sách đơn hàng
        </button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="break-all text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
                {order.orderNumber}
              </h1>
              <StatusBadge status={currentStatus.label} variant={currentStatus.variant} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatDate(order.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package size={13} /> {order._id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center gap-2 rounded-btn border border-border-default bg-bg-surface px-3 text-sm text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary"
          >
            <Printer size={15} /> In
          </button>
        </div>

        {/* SUMMARY GRID */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Tổng thanh toán"
            value={formatCurrency(order.totalAmount)}
            description="Tổng giá trị đơn"
            icon={Wallet}
            valueClassName="text-accent-primary"
          />
          <SummaryCard
            title="Khách hàng"
            value={order.customerName}
            description={order.customerPhone}
            icon={UserRound}
          />
          <SummaryCard
            title="Trạng thái đơn"
            value={currentStatus.label}
            description="Trạng thái hiện tại"
            icon={Truck}
          />
          <SummaryCard
            title="Thanh toán"
            value={paymentStatus?.label || '—'}
            description={PAYMENT_METHOD_LABELS[order.paymentMethod]}
            icon={CreditCard}
          />
        </div>
      </header>

      {/* ALERTS */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveMessage && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-status-success/30 bg-status-success/10 px-3 py-2.5 text-sm text-status-success"
        >
          <Check size={15} className="mt-0.5 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* ============ MAIN ============ */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        {/* LEFT */}
        <div className="min-w-0 space-y-4">
          {/* Customer */}
          <Card title="Khách hàng" icon={UserRound}>
            <div className="divide-y divide-border-default">
              <Row label="Họ tên" value={order.customerName || 'Khách hàng'} />
              <Row label="Điện thoại" value={order.customerPhone} />
              <Row label="Email" value={order.customerEmail} />
              <Row
                label="Mã khách hàng"
                value={order.userId ? String(order.userId) : 'Khách chưa liên kết tài khoản'}
              />
            </div>

            {order.customerPhone && (
              <a
                href={`tel:${order.customerPhone}`}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-btn border border-border-default px-3 text-sm text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary"
              >
                <Phone size={14} /> Gọi khách
              </a>
            )}
          </Card>

          {/* Shipping */}
          <Card title="Địa chỉ nhận hàng" icon={MapPin}>
            <p className="wrap-break-word text-sm leading-6 text-text-primary">
              {fullAddress || 'Chưa có thông tin địa chỉ giao hàng.'}
            </p>
            <div className="mt-3 divide-y divide-border-default border-t border-border-default pt-1">
              <Row label="Người nhận" value={order.customerName} />
              <Row label="Điện thoại" value={order.customerPhone} />
            </div>
          </Card>

          {/* Items */}
          <OrderItemsTable items={orderItems} loading={itemsLoading} />

          {/* Note */}
          <Card title="Ghi chú" icon={Mail}>
            {order.note ? (
              <p className="whitespace-pre-wrap wrap-break-word text-sm leading-6 text-text-secondary">
                {order.note}
              </p>
            ) : (
              <p className="text-sm italic text-text-muted">Không có ghi chú.</p>
            )}
          </Card>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="min-w-0 space-y-4">
          {/* Update status */}
          <Card title="Cập nhật trạng thái" icon={Truck}>
            {allowedStatuses.length > 0 ? (
              <>
                <label htmlFor="order-status" className="mb-1.5 block text-xs text-text-muted">
                  Chuyển sang
                </label>
                <select
                  id="order-status"
                  value={selectedStatus}
                  disabled={saving}
                  onChange={(event) => {
                    setSelectedStatus(event.target.value as OrderStatus);
                    setSaveMessage('');
                    setError('');
                  }}
                  className="h-10 w-full rounded-btn border border-border-default bg-bg-surface px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value={order.status}>{currentStatus.label}</option>
                  {allowedStatuses.map((status) => (
                    <option key={status} value={status}>
                      {ORDER_STATUS_META[status].label}
                    </option>
                  ))}
                </select>

                {hasStatusChange && selectedStatus && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-status-warning/10 px-3 py-2 text-xs leading-5 text-status-warning">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Chuyển sang <strong>{ORDER_STATUS_META[selectedStatus].label}</strong>.
                    </span>
                  </div>
                )}

                <Button
                  className="mt-3 w-full"
                  disabled={!hasStatusChange || saving}
                  loading={saving}
                  onClick={() => void handleSaveStatus()}
                >
                  <Save size={15} className="mr-2" /> Lưu trạng thái
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Đơn ở trạng thái cuối, không thể chuyển tiếp.
              </p>
            )}
          </Card>

          {/* Payment summary */}
          <Card title="Tổng kết thanh toán" icon={CreditCard}>
            <div className="divide-y divide-border-default">
              <Row label="Tiền hàng" value={formatCurrency(order.subtotal)} />
              <Row
                label="Giảm giá"
                value={`−${formatCurrency(order.discountAmount)}`}
                valueClassName="text-status-success"
              />
              <Row label="Phí vận chuyển" value={formatCurrency(order.shippingFee)} />
              <Row label="Thuế" value={formatCurrency(order.taxAmount)} />
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border-default pt-3">
              <span className="text-sm font-semibold text-text-primary">Tổng</span>
              <span className="text-lg font-bold text-accent-primary">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>

            <div className="mt-4 space-y-2 rounded-lg bg-bg-app p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">Phương thức</span>
                <span className="text-right text-xs font-medium text-text-primary">
                  {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-muted">Trạng thái</span>
                {paymentStatus && (
                  <StatusBadge status={paymentStatus.label} variant={paymentStatus.variant} />
                )}
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <OrderStatusTimeline order={order} />
        </aside>
      </div>
    </div>
  );
}