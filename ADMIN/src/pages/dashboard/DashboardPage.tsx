
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  RefreshCw,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Warehouse,
  AlertTriangle,
} from 'lucide-react';

import Header from '../../layouts/Header';

import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';

import { Button } from '../../components/ui/buttons/Button';

import { dashboardService } from '../../services/dashboard/dashboard.service';

import type {
  DashboardOverview,
  DashboardPeriod,
} from '../../types/dashboard.types';

import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

/* =====================================================
   CONSTANTS
===================================================== */

const PERIOD_OPTIONS: Array<{
  value: DashboardPeriod;
  label: string;
}> = [
    { value: '7d', label: '7 ngày gần nhất' },
    { value: '30d', label: '30 ngày gần nhất' },
    { value: '12m', label: '12 tháng gần nhất' },
  ];

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  returned: 'Đã hoàn trả',
};

const ORDER_STATUS_VARIANTS: Record<
  string,
  'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'
> = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'warning',
  shipping: 'info',
  delivered: 'success',
  completed: 'success',
  cancelled: 'danger',
  returned: 'purple',
};

/* =====================================================
   HELPERS
===================================================== */

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const formatDate = (value: string): string => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatChartLabel = (
  value: string,
  period: DashboardPeriod,
): string => {
  if (period === '12m') {
    const [year, month] = value.split('-');

    return `${month}/${year.slice(2)}`;
  }

  const [, month, day] = value.split('-');

  return `${day}/${month}`;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Không thể tải dữ liệu Dashboard. Vui lòng thử lại.';
};

/* =====================================================
   TABLE COLUMNS
===================================================== */

type DashboardOrder = DashboardOverview['recentOrders'][number];

const orderColumns: DataTableColumn<DashboardOrder>[] = [
  {
    key: 'orderNumber',
    header: 'Mã đơn hàng',
    render: (order) => (
      <span className="whitespace-nowrap text-sm font-semibold text-text-primary">
        {order.orderNumber || '—'}
      </span>
    ),
  },
  {
    key: 'customerName',
    header: 'Khách hàng',
    render: (order) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {order.customerName || 'Khách hàng'}
        </p>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {order.customerEmail || ''}
        </p>
      </div>
    ),
  },
  {
    key: 'createdAt',
    header: 'Ngày đặt',
    render: (order) => (
      <span className="whitespace-nowrap text-sm text-text-muted">
        {formatDate(order.createdAt)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (order) => (
      <StatusBadge
        status={ORDER_STATUS_LABELS[order.status] ?? order.status}
        variant={ORDER_STATUS_VARIANTS[order.status] ?? 'neutral'}
      />
    ),
  },
  {
    key: 'totalAmount',
    header: 'Tổng tiền',
    className: 'text-right',
    headerClassName: 'text-right',
    render: (order) => (
      <span className="block whitespace-nowrap text-right text-sm font-semibold text-text-primary">
        {formatCurrency(order.totalAmount)}
      </span>
    ),
  },
];

/* =====================================================
   REVENUE CHART
===================================================== */

function RevenueChart({
  data,
  period,
}: {
  data: DashboardOverview['revenueChart'];
  period: DashboardPeriod;
}) {
  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [
      item.collected,
      item.refunded,
    ]),
  );

  if (data.length === 0) {
    return (
      <div className="flex min-h-56 items-center justify-center text-sm text-text-muted">
        Chưa có dữ liệu doanh thu.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-primary" />
          <span className="text-xs text-text-secondary">
            Tiền thu
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-status-danger" />
          <span className="text-xs text-text-secondary">
            Tiền hoàn
          </span>
        </div>
      </div>

      <div
        role="img"
        aria-label="Biểu đồ tiền thu và tiền hoàn theo thời gian"
        className="flex h-56 min-w-0 items-end gap-1 overflow-hidden border-b border-border-default pb-2 sm:h-64 sm:gap-2"
      >
        {data.map((point) => {
          const collectedHeight =
            point.collected > 0
              ? Math.max(5, (point.collected / maxValue) * 100)
              : 0;

          const refundedHeight =
            point.refunded > 0
              ? Math.max(5, (point.refunded / maxValue) * 100)
              : 0;

          return (
            <div
              key={point.date}
              className="group flex h-full min-w-0 flex-1 items-end justify-center gap-0.5"
              title={`${formatChartLabel(point.date, period)} | Thu: ${formatCurrency(point.collected)} | Hoàn: ${formatCurrency(point.refunded)}`}
            >
              <div
                className="w-1/2 max-w-5 rounded-t-sm bg-accent-primary transition-all duration-200 group-hover:opacity-70"
                style={{ height: `${collectedHeight}%` }}
              />

              <div
                className="w-1/2 max-w-5 rounded-t-sm bg-status-danger transition-all duration-200 group-hover:opacity-70"
                style={{ height: `${refundedHeight}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between gap-1 text-[10px] text-text-muted sm:text-[11px]">
        {data.map((point, index) => {
          const shouldShow =
            data.length <= 12 ||
            index === 0 ||
            index === data.length - 1 ||
            index % 5 === 0;

          return (
            <span
              key={point.date}
              className="min-w-0 flex-1 truncate text-center"
            >
              {shouldShow
                ? formatChartLabel(point.date, period)
                : ''}
            </span>
          );
        })}
      </div>
    </>
  );
}

/* =====================================================
   DASHBOARD PAGE
===================================================== */

export default function DashboardPage() {
  const [period, setPeriod] =
    useState<DashboardPeriod>('30d');

  const [dashboard, setDashboard] =
    useState<DashboardOverview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    dashboardService
      .getOverview(period, controller.signal)
      .then((response) => {
        setDashboard(response.data);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [period, refreshKey]);

  const summary = dashboard?.summary;
  const handlePeriodChange = (
    value: DashboardPeriod,
  ) => {
    setLoading(true);
    setDashboard(null);
    setPeriod(value);
  };
  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const stats: Array<{
    label: string;
    value: string;
    icon: LucideIcon;
    accent: 'primary' | 'cyan' | 'warning' | 'purple';
  }> = [
      {
        label: 'Doanh thu thuần',
        value: summary
          ? formatCurrency(summary.revenue.netRevenue)
          : '—',
        icon: DollarSign,
        accent: 'primary',
      },
      {
        label: 'Đơn hàng trong kỳ',
        value: summary
          ? formatNumber(summary.orders.total)
          : '—',
        icon: ShoppingBag,
        accent: 'cyan',
      },
      {
        label: 'Tổng khách hàng',
        value: summary
          ? formatNumber(summary.customers.total)
          : '—',
        icon: Users,
        accent: 'purple',
      },
      {
        label: 'Sản phẩm hoạt động',
        value: summary
          ? formatNumber(summary.products.active)
          : '—',
        icon: Package,
        accent: 'warning',
      },
    ];

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Tổng quan hoạt động kinh doanh của cửa hàng"
      />

      <main className="min-w-0 space-y-5 p-4 sm:p-5 lg:space-y-6 lg:p-8">

        {/* PAGE ACTIONS */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Tổng quan kinh doanh
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Dữ liệu được cập nhật từ hệ thống.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="dashboard-period"
              className="sr-only"
            >
              Khoảng thời gian thống kê
            </label>

            <select
              id="dashboard-period"
              value={period}
              onChange={(event) =>
                handlePeriodChange(
                  event.target.value as DashboardPeriod,
                )
              }
              className={cn(
                'h-9 rounded-btn border border-border-strong',
                'bg-bg-elevated px-3 text-xs text-text-primary',
                'outline-none transition-colors',
                'focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15',
              )}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Làm mới Dashboard"
            >
              <RefreshCw
                size={14}
                className={loading ? 'animate-spin' : ''}
              />
              <span className="hidden sm:inline">
                Làm mới
              </span>
            </Button>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-status-danger/30 bg-status-danger/10 px-4 py-3"
          >
            <div className="flex items-center gap-2 text-sm text-status-danger">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleRefresh}
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* STATISTICS */}

        <section
          aria-label="Thống kê tổng quan"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={loading && !dashboard ? '...' : stat.value}
              accent={stat.accent}
              icon={stat.icon}
            />
          ))}
        </section>

        {/* REVENUE AND TOP PRODUCTS */}

        <section className="grid min-w-0 grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-3">

          {/* REVENUE */}

          <div className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4 sm:p-5 xl:col-span-2">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-text-primary">
                  Doanh thu
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Tiền thực thu và tiền hoàn theo kỳ
                </p>
              </div>

              {summary && (
                <div className="text-right">
                  <p className="text-xs text-text-muted">
                    Doanh thu thuần
                  </p>
                  <p className="mt-1 text-base font-bold text-accent-primary">
                    {formatCurrency(summary.revenue.netRevenue)}
                  </p>
                </div>
              )}
            </div>

            {loading && !dashboard ? (
              <div className="flex h-56 items-center justify-center text-sm text-text-muted">
                Đang tải biểu đồ...
              </div>
            ) : (
              <RevenueChart
                data={dashboard?.revenueChart ?? []}
                period={period}
              />
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border-default pt-4">
              <div>
                <p className="text-xs text-text-muted">
                  Tổng tiền thu
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {summary
                    ? formatCurrency(summary.revenue.totalCollected)
                    : '—'}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-muted">
                  Tổng tiền hoàn
                </p>
                <p className="mt-1 text-sm font-semibold text-status-danger">
                  {summary
                    ? formatCurrency(summary.revenue.totalRefunded)
                    : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* TOP PRODUCTS */}

          <div className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4 sm:p-5">
            <div className="mb-5">
              <h2 className="font-semibold text-text-primary">
                Sản phẩm bán chạy
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                Top sản phẩm theo số lượng đã bán
              </p>
            </div>

            {loading && !dashboard ? (
              <div className="flex min-h-36 items-center justify-center text-sm text-text-muted">
                Đang tải dữ liệu...
              </div>
            ) : dashboard?.topProducts.length ? (
              <div className="space-y-4">
                {dashboard.topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-border-default bg-bg-elevated text-xs font-bold text-text-secondary">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        title={product.productName}
                        className="truncate text-sm font-medium text-text-primary"
                      >
                        {product.productName}
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
                        {formatNumber(product.totalQuantity)} sản phẩm đã bán
                      </p>
                    </div>

                    <p className="shrink-0 text-right text-xs font-semibold text-text-primary sm:text-sm">
                      {formatCurrency(product.totalRevenue)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-36 items-center justify-center text-center text-sm text-text-muted">
                Chưa có dữ liệu sản phẩm.
              </div>
            )}
          </div>
        </section>

        {/* ORDER STATUS AND INVENTORY */}

        <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">

          {/* ORDER STATUS */}

          <div className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4 sm:p-5">
            <div className="mb-5">
              <h2 className="font-semibold text-text-primary">
                Trạng thái đơn hàng
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                Phân bố đơn hàng được tạo trong kỳ
              </p>
            </div>

            {dashboard?.orderStatusChart.length ? (
              <div className="space-y-3">
                {dashboard.orderStatusChart
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <div
                      key={item.status}
                      className="flex items-center justify-between gap-3"
                    >
                      <StatusBadge
                        status={
                          ORDER_STATUS_LABELS[item.status] ??
                          item.status
                        }
                        variant={
                          ORDER_STATUS_VARIANTS[item.status] ??
                          'neutral'
                        }
                      />

                      <span className="text-sm font-semibold tabular-nums text-text-primary">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  ))}

                {!dashboard.orderStatusChart.some(
                  (item) => item.count > 0,
                ) && (
                    <p className="py-6 text-center text-sm text-text-muted">
                      Chưa có đơn hàng trong kỳ.
                    </p>
                  )}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-text-muted">
                Chưa có dữ liệu trạng thái đơn hàng.
              </p>
            )}
          </div>

          {/* INVENTORY */}

          <div className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4 sm:p-5">
            <div className="mb-5 flex items-center gap-2">
              <Warehouse
                size={18}
                className="text-accent-primary"
              />
              <div>
                <h2 className="font-semibold text-text-primary">
                  Tình trạng kho hàng
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Thống kê tồn kho biến thể đang hoạt động
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-btn border border-border-default bg-bg-elevated p-3">
                <p className="text-xs text-text-muted">
                  Tổng tồn kho
                </p>
                <p className="mt-2 text-xl font-bold text-text-primary">
                  {summary
                    ? formatNumber(summary.inventory.totalStock)
                    : '—'}
                </p>
              </div>

              <div className="rounded-btn border border-border-default bg-bg-elevated p-3">
                <p className="text-xs text-text-muted">
                  Tổng biến thể
                </p>
                <p className="mt-2 text-xl font-bold text-text-primary">
                  {summary
                    ? formatNumber(summary.inventory.totalVariants)
                    : '—'}
                </p>
              </div>

              <div className="rounded-btn border border-status-warning/20 bg-status-warning/5 p-3">
                <p className="text-xs text-text-muted">
                  Sắp hết hàng
                </p>
                <p className="mt-2 text-xl font-bold text-status-warning">
                  {summary
                    ? formatNumber(summary.inventory.lowStockVariants)
                    : '—'}
                </p>
              </div>

              <div className="rounded-btn border border-status-danger/20 bg-status-danger/5 p-3">
                <p className="text-xs text-text-muted">
                  Hết hàng
                </p>
                <p className="mt-2 text-xl font-bold text-status-danger">
                  {summary
                    ? formatNumber(summary.inventory.outOfStockVariants)
                    : '—'}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-text-muted">
              Ngưỡng cảnh báo sắp hết hàng:{' '}
              <strong className="text-text-primary">
                {summary?.inventory.lowStockThreshold ?? 5}
              </strong>{' '}
              sản phẩm/biến thể.
            </p>
          </div>
        </section>

        {/* LOW STOCK PRODUCTS */}

        <section className="min-w-0 rounded-card border border-border-default bg-bg-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-text-primary">
                Sản phẩm sắp hết hàng
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                Những biến thể cần được bổ sung tồn kho
              </p>
            </div>

            <AlertTriangle
              size={18}
              className="text-status-warning"
            />
          </div>

          {dashboard?.lowStockProducts.length ? (
            <div className="space-y-3">
              {dashboard.lowStockProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {product.productName}
                    </p>

                    <p className="mt-1 text-xs text-text-muted">
                      SKU sản phẩm: {product.productSku || '—'}
                      {' · '}
                      SKU biến thể: {product.variantSku || '—'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-status-warning">
                      {formatNumber(product.stockQuantity)}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Còn trong kho
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-text-muted">
              {loading
                ? 'Đang tải dữ liệu...'
                : 'Không có biến thể nào sắp hết hàng.'}
            </p>
          )}
        </section>

        {/* RECENT ORDERS */}

        <section className="min-w-0 overflow-hidden rounded-card border border-border-default bg-bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default p-4 sm:p-5">
            <div>
              <h2 className="font-semibold text-text-primary">
                Đơn hàng gần đây
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                8 đơn hàng mới nhất trong hệ thống
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-primary transition-colors hover:text-accent-hover"
            >
              Xem tất cả
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <div className="min-w-0 overflow-x-auto p-3 sm:p-4">
            <div className="min-w-[650px]">
              <DataTable
                columns={orderColumns}
                data={dashboard?.recentOrders ?? []}
                getRowId={(order) => order._id}
                loading={loading && !dashboard}
                emptyTitle="Chưa có đơn hàng"
                emptyDescription="Các đơn hàng gần đây sẽ hiển thị tại đây."
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-default px-4 py-3">
            <p className="text-xs text-text-muted">
              Hiển thị {dashboard?.recentOrders.length ?? 0} đơn hàng gần đây
            </p>

            <Link
              to="/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent-primary transition-colors hover:text-accent-hover"
            >
              Quản lý đơn hàng
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
