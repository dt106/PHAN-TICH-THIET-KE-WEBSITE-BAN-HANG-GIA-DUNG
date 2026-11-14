
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Banknote,
    Clock3,
    Eye,
    RotateCcw,
    Search,
    ShoppingCart,
    Truck,
} from 'lucide-react';

import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import DataTable, {
    type DataTableColumn,
} from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Pagination from '../../components/shared/Pagination';
import { Button } from '../../components/ui/buttons/Button';

import { ordersService } from '../../services/orders/orders.service';

import type {
    Order,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
} from '../../types/order.types';

const PAGE_SIZE = 7;

type BadgeVariant =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'purple'
    | 'neutral';

type OrderWithOptionalId = Omit<Order, '_id'> & {
    _id?: string;
    id?: string | number;
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    delivered: 'Đã giao hàng',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
    returned: 'Đã trả hàng',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    pending: 'Chưa thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thanh toán thất bại',
    refunded: 'Đã hoàn tiền',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    COD: 'COD',
    BANK: 'Chuyển khoản',
    MOMO: 'MoMo',
    VNPAY: 'VNPay',
    ZALOPAY: 'ZaloPay',
};

const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
    pending: 'warning',
    confirmed: 'info',
    processing: 'purple',
    shipping: 'info',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger',
    returned: 'neutral',
};

const PAYMENT_STATUS_VARIANTS: Record<PaymentStatus, BadgeVariant> = {
    pending: 'warning',
    paid: 'success',
    failed: 'danger',
    refunded: 'purple',
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

function formatCurrency(value?: number | null): string {
    return CURRENCY_FORMATTER.format(value ?? 0);
}

function formatDate(value?: string | null): string {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return DATE_FORMATTER.format(date);
}

function normalizeOrder(order: OrderWithOptionalId): Order | null {
    const id = order._id || order.id;

    if (id === undefined || id === null || String(id).trim() === '') {
        return null;
    }

    return {
        ...order,
        _id: String(id),
    } as Order;
}

export default function OrdersPage() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] =
        useState<OrderStatus | 'all'>('all');
    const [paymentFilter, setPaymentFilter] =
        useState<PaymentStatus | 'all'>('all');
    const [methodFilter, setMethodFilter] =
        useState<PaymentMethod | 'all'>('all');

    const [page, setPage] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Tải danh sách đơn hàng.

    const fetchOrders = useCallback(
        async (signal: { cancelled: boolean }) => {
            try {
                const response = await ordersService.getOrders({
                    page,
                    limit: PAGE_SIZE,
                    search: search.trim() || undefined,
                    status:
                        statusFilter === 'all'
                            ? undefined
                            : statusFilter,
                    paymentStatus:
                        paymentFilter === 'all'
                            ? undefined
                            : paymentFilter,
                    paymentMethod:
                        methodFilter === 'all'
                            ? undefined
                            : methodFilter,
                });

                if (signal.cancelled) return;

                const rawOrders = Array.isArray(response.data)
                    ? response.data
                    : [];

                const normalizedOrders = rawOrders
                    .map((order) =>
                        normalizeOrder(order as OrderWithOptionalId),
                    )
                    .filter((order): order is Order => order !== null);

                setOrders(normalizedOrders);
                setTotalOrders(response.pagination?.total ?? 0);
                setTotalPages(
                    Math.max(1, response.pagination?.totalPages ?? 1),
                );
                setError('');
            } catch (err) {
                if (signal.cancelled) return;

                setOrders([]);
                setTotalOrders(0);
                setTotalPages(1);

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Không thể tải danh sách đơn hàng.',
                );
            } finally {
                if (!signal.cancelled) {
                    setLoading(false);
                }
            }
        },
        [
            page,
            search,
            statusFilter,
            paymentFilter,
            methodFilter,
        ],
    );

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            await Promise.resolve();

            if (cancelled) return;

            void fetchOrders({
                get cancelled() {
                    return cancelled;
                },
            });
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [fetchOrders]);


    // Thống kê trên trang hiện tại.
    const pendingCount = orders.filter(
        (order) => order.status === 'pending',
    ).length;

    const shippingCount = orders.filter(
        (order) => order.status === 'shipping',
    ).length;

    const completedRevenue = orders
        .filter((order) => order.status === 'completed')
        .reduce(
            (total, order) => total + (order.totalAmount || 0),
            0,
        );

    // Chuyển trang.
    const handlePageChange = (nextPage: number) => {
        setLoading(true);
        setPage(nextPage);
    };

    // Đặt lại bộ lọc.
    const resetFilters = () => {
        setLoading(true);
        setSearch('');
        setStatusFilter('all');
        setPaymentFilter('all');
        setMethodFilter('all');
        setPage(1);
    };

    // Cấu hình cột.
    const columns: DataTableColumn<Order>[] = [
        {
            key: 'order',
            header: 'Đơn hàng',
            className: 'min-w-[180px]',
            render: (order) => (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-text-primary">
                        {order.orderNumber || 'Chưa có mã đơn'}
                    </span>
                    <span className="text-xs text-text-muted">
                        {formatDate(order.createdAt)}
                    </span>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            className: 'min-w-[190px]',
            render: (order) => (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-text-primary">
                        {order.customerName || 'Khách hàng'}
                    </span>
                    <span className="text-xs text-text-secondary">
                        {order.customerPhone || '—'}
                    </span>
                    <span className="max-w-[220px] truncate text-xs text-text-muted">
                        {order.customerEmail || '—'}
                    </span>
                </div>
            ),
        },
        {
            key: 'total',
            header: 'Tổng thanh toán',
            className: 'min-w-[155px]',
            render: (order) => (
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-text-primary">
                        {formatCurrency(order.totalAmount)}
                    </span>

                    {order.discountAmount > 0 && (
                        <span className="text-xs text-text-muted">
                            Giảm {formatCurrency(order.discountAmount)}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'payment',
            header: 'Thanh toán',
            className: 'min-w-[170px]',
            render: (order) => (
                <div className="flex flex-col items-start gap-2">
                    <span className="text-sm text-text-primary">
                        {PAYMENT_METHOD_LABELS[order.paymentMethod] ??
                            order.paymentMethod ??
                            '—'}
                    </span>

                    <StatusBadge
                        status={
                            PAYMENT_STATUS_LABELS[order.paymentStatus] ??
                            order.paymentStatus
                        }
                        variant={
                            PAYMENT_STATUS_VARIANTS[order.paymentStatus] ??
                            'neutral'
                        }
                    />
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái đơn',
            className: 'min-w-[155px]',
            render: (order) => (
                <StatusBadge
                    status={
                        ORDER_STATUS_LABELS[order.status] ?? order.status
                    }
                    variant={
                        ORDER_STATUS_VARIANTS[order.status] ?? 'neutral'
                    }
                />
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            className: 'min-w-[90px]',
            headerClassName: 'text-right',
            render: (order) => (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Xem đơn ${order.orderNumber}`}
                        onClick={() => {
                            if (!order._id) {
                                setError(
                                    'Đơn hàng không có ID hợp lệ, không thể xem chi tiết.',
                                );
                                return;
                            }

                            navigate(
                                `/orders/${encodeURIComponent(order._id)}`,
                            );
                        }}
                    >
                        <Eye size={17} />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 xl:p-8">
            <PageHeader
                title="Quản lý đơn hàng"
                description="Theo dõi đơn hàng, trạng thái xử lý và tình hình thanh toán."
            />

            {/* Thống kê */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Tổng đơn hàng"
                    value={String(totalOrders)}
                    icon={ShoppingCart}
                    accent="primary"
                />

                <StatCard
                    label="Chờ xác nhận"
                    value={String(pendingCount)}
                    icon={Clock3}
                    accent="warning"
                />

                <StatCard
                    label="Đang giao"
                    value={String(shippingCount)}
                    icon={Truck}
                    accent="cyan"
                />

                <StatCard
                    label="Doanh thu hoàn thành"
                    value={formatCurrency(completedRevenue)}
                    icon={Banknote}
                    accent="purple"
                />
            </section>

            {/* Danh sách đơn hàng */}
            <section className="overflow-hidden rounded-card border border-border-default bg-bg-surface">
                <div className="flex flex-col gap-4 border-b border-border-default p-4 lg:p-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-text-primary">
                                Danh sách đơn hàng
                            </h2>
                            <p className="mt-1 text-sm text-text-secondary">
                                Tìm kiếm và lọc đơn hàng theo thông tin nghiệp vụ.
                            </p>
                        </div>

                        <div className="relative w-full xl:max-w-sm">
                            <Search
                                size={17}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                            />
                            <input
                                value={search}
                                onChange={(event) => {
                                    setLoading(true);
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Mã đơn, tên khách hàng, email..."
                                aria-label="Tìm kiếm đơn hàng"
                                className="h-11 w-full rounded-btn border border-border-default bg-bg-app pl-10 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <select
                            value={statusFilter}
                            onChange={(event) => {
                                setLoading(true);
                                setStatusFilter(
                                    event.target.value as OrderStatus | 'all',
                                );
                                setPage(1);
                            }}
                            aria-label="Lọc trạng thái đơn hàng"
                            className="h-11 rounded-btn border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                        >
                            <option value="all">Tất cả trạng thái đơn</option>
                            {Object.entries(ORDER_STATUS_LABELS).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>

                        <select
                            value={paymentFilter}
                            onChange={(event) => {
                                setLoading(true);
                                setPaymentFilter(
                                    event.target.value as PaymentStatus | 'all',
                                );
                                setPage(1);
                            }}
                            aria-label="Lọc trạng thái thanh toán"
                            className="h-11 rounded-btn border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                        >
                            <option value="all">Tất cả thanh toán</option>
                            {Object.entries(PAYMENT_STATUS_LABELS).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>

                        <select
                            value={methodFilter}
                            onChange={(event) => {
                                setLoading(true);
                                setMethodFilter(
                                    event.target.value as PaymentMethod | 'all',
                                );
                                setPage(1);
                            }}
                            aria-label="Lọc phương thức thanh toán"
                            className="h-11 rounded-btn border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
                        >
                            <option value="all">Tất cả phương thức</option>
                            {Object.entries(PAYMENT_METHOD_LABELS).map(
                                ([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ),
                            )}
                        </select>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={resetFilters}
                            className="w-full"
                        >
                            <RotateCcw size={16} />
                            Đặt lại bộ lọc
                        </Button>
                    </div>
                </div>

                {/* Thông báo lỗi */}
                {error && (
                    <div
                        role="alert"
                        className="m-4 flex items-start justify-between gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 text-sm text-status-danger"
                    >
                        <span>{error}</span>
                        <button
                            type="button"
                            onClick={() => setError('')}
                            className="shrink-0 font-medium hover:underline"
                        >
                            Đóng
                        </button>
                    </div>
                )}

                {/* Bảng dữ liệu */}
                {loading ? (
                    <div className="space-y-4 p-5">
                        <div className="h-10 animate-pulse rounded-lg bg-bg-elevated" />
                        <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
                        <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
                        <div className="h-14 animate-pulse rounded-lg bg-bg-elevated" />
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={orders}
                        getRowId={(order) => order._id}
                        emptyTitle={
                            error
                                ? 'Không thể tải đơn hàng'
                                : 'Không tìm thấy đơn hàng'
                        }
                        emptyDescription={
                            error
                                ? 'Vui lòng kiểm tra kết nối API và thử lại.'
                                : 'Hãy thử thay đổi từ khóa hoặc điều kiện lọc.'
                        }
                    />
                )}

                {/* Phân trang */}
                <div className="border-t border-border-default p-4">
                    <div className="mb-3 text-xs text-text-muted">
                        Đang hiển thị {orders.length} / {totalOrders} đơn hàng
                        {' · '}
                        Thống kê trạng thái và doanh thu tính trên trang hiện tại.
                    </div>

                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={totalOrders}
                        onPageChange={handlePageChange}
                        pageSizeOptions={[PAGE_SIZE]}
                    />

                    {page > totalPages && (
                        <button
                            type="button"
                            className="mt-3 text-sm text-accent-primary hover:underline"
                            onClick={() => handlePageChange(totalPages)}
                        >
                            Trở về trang hợp lệ
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
}
