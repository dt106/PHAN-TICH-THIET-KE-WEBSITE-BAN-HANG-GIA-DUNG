
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle,
  Clock3,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Pagination from '../../components/shared/Pagination';

import { paymentsService } from '../../services/payments/payments.service';

import type {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentSummary,
} from '../../types/payment.types';

const PAGE_SIZE = 10;

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng',
  BANK: 'Chuyển khoản',
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  ZALOPAY: 'ZaloPay',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const PAYMENT_STATUS_VARIANTS: Record<
  PaymentStatus,
  'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'
> = {
  pending: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'purple',
};

const CURRENCY_FORMATTER = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const EMPTY_SUMMARY: PaymentSummary = {
  totalPaidAmount: 0,
  totalPaidCount: 0,
  totalRefundedAmount: 0,
};

function formatCurrency(amount: number): string {
  return CURRENCY_FORMATTER.format(amount || 0);
}

function formatDate(date?: string | null): string {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return '—';

  return DATE_FORMATTER.format(parsedDate);
}

function getOrderNumber(payment: Payment): string {
  if (typeof payment.orderId === 'string') {
    return payment.orderId;
  }

  return payment.orderId?.orderNumber || payment.orderId?._id || '—';
}

function getPaymentError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>(EMPTY_SUMMARY);

  const [search, setSearch] = useState('');

  const [statusFilter, setStatusFilter] = useState<
    PaymentStatus | 'all'
  >('all');

  const [methodFilter, setMethodFilter] = useState<
    PaymentMethod | 'all'
  >('all');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedPayment, setSelectedPayment] =
    useState<Payment | null>(null);

  const [refundReason, setRefundReason] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState('');

  /**
   * Tải danh sách thanh toán từ Backend.
   * Không gọi setState đồng bộ trước khi chờ API.
   */
  const loadPayments = useCallback(async () => {
    try {
      const response = await paymentsService.getPayments({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'all' && {
          status: statusFilter,
        }),
        ...(methodFilter !== 'all' && {
          paymentMethod: methodFilter,
        }),
      });

      setPayments(response.data ?? []);
      setSummary(response.summary ?? EMPTY_SUMMARY);

      setTotal(response.pagination?.total ?? 0);
      setTotalPages(
        Math.max(1, response.pagination?.totalPages ?? 1),
      );

      setError('');
    } catch (err) {
      setError(getPaymentError(err));
      setPayments([]);
      setSummary(EMPTY_SUMMARY);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, methodFilter]);

  /**
   * Tự động tải lại khi thay đổi trang hoặc bộ lọc.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchPayments = async () => {
      try {
        const response = await paymentsService.getPayments({
          page,
          limit: PAGE_SIZE,
          ...(statusFilter !== 'all' && {
            status: statusFilter,
          }),
          ...(methodFilter !== 'all' && {
            paymentMethod: methodFilter,
          }),
        });

        if (cancelled) return;

        setPayments(response.data ?? []);
        setSummary(response.summary ?? EMPTY_SUMMARY);

        setTotal(response.pagination?.total ?? 0);
        setTotalPages(
          Math.max(1, response.pagination?.totalPages ?? 1),
        );

        setError('');
      } catch (err) {
        if (cancelled) return;

        setError(getPaymentError(err));
        setPayments([]);
        setSummary(EMPTY_SUMMARY);
        setTotal(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchPayments();

    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, methodFilter]);

  /**
   * Tìm kiếm trên dữ liệu của trang hiện tại.
   */
  const filteredPayments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return payments;

    return payments.filter((payment) => {
      const orderNumber = getOrderNumber(payment).toLowerCase();

      const transactionCode =
        payment.transactionCode?.toLowerCase() || '';

      const gatewayOrderId =
        payment.gatewayOrderId?.toLowerCase() || '';

      return (
        orderNumber.includes(keyword) ||
        transactionCode.includes(keyword) ||
        gatewayOrderId.includes(keyword) ||
        payment._id.toLowerCase().includes(keyword)
      );
    });
  }, [payments, search]);

  /**
   * Làm mới dữ liệu.
   */
  const handleRefresh = () => {
    setLoading(true);
    void loadPayments();
  };

  /**
   * Xóa toàn bộ bộ lọc.
   */
  const resetFilters = () => {
    setLoading(true);
    setSearch('');
    setStatusFilter('all');
    setMethodFilter('all');
    setPage(1);
  };

  /**
   * Chuyển trang.
   */
  const handlePageChange = (nextPage: number) => {
    if (nextPage === page) return;

    setLoading(true);
    setPage(nextPage);
  };

  /**
   * Mở modal hoàn tiền.
   */
  const openRefundModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setRefundReason('');
    setRefundError('');
  };

  /**
   * Đóng modal hoàn tiền.
   */
  const closeRefundModal = () => {
    if (refunding) return;

    setSelectedPayment(null);
    setRefundReason('');
    setRefundError('');
  };

  /**
   * Gửi yêu cầu hoàn tiền.
   * Backend hiện mặc định hoàn toàn bộ số tiền nếu không truyền amount.
   */
  const handleRefund = async () => {
    if (!selectedPayment) return;

    setRefunding(true);
    setRefundError('');

    try {
      await paymentsService.refundPayment(
        selectedPayment._id,
        {
          ...(refundReason.trim() && {
            reason: refundReason.trim(),
          }),
        },
      );

      setSelectedPayment(null);
      setRefundReason('');

      setLoading(true);
      await loadPayments();
    } catch (err) {
      setRefundError(getPaymentError(err));
    } finally {
      setRefunding(false);
    }
  };

  const columns = [
    {
      key: 'transaction',
      header: 'Giao dịch',
      render: (payment: Payment) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {payment.transactionCode ||
              payment.gatewayOrderId ||
              'Chưa có mã giao dịch'}
          </p>

          <p className="mt-1 text-xs text-text-muted">
            ID: {payment._id}
          </p>

          <p className="mt-1 text-xs text-text-muted">
            Tạo lúc: {formatDate(payment.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Đơn hàng',
      render: (payment: Payment) => (
        <div>
          <p className="font-medium text-accent-primary">
            {getOrderNumber(payment)}
          </p>

          {typeof payment.orderId !== 'string' &&
            payment.orderId?.customerName && (
              <p className="mt-1 text-xs text-text-muted">
                {payment.orderId.customerName}
              </p>
            )}
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Phương thức',
      render: (payment: Payment) => (
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-elevated">
            {payment.paymentMethod === 'COD' ? (
              <Banknote
                size={16}
                className="text-text-secondary"
              />
            ) : (
              <CreditCard
                size={16}
                className="text-text-secondary"
              />
            )}
          </span>

          <span className="text-sm text-text-secondary">
            {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Số tiền',
      render: (payment: Payment) => (
        <div>
          <p className="whitespace-nowrap font-semibold tabular-nums text-text-primary">
            {formatCurrency(payment.amount)}
          </p>

          {payment.refundAmount > 0 && (
            <p className="mt-1 text-xs text-purple-400">
              Đã hoàn: {formatCurrency(payment.refundAmount)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (payment: Payment) => (
        <StatusBadge
          status={PAYMENT_STATUS_LABELS[payment.status]}
          variant={PAYMENT_STATUS_VARIANTS[payment.status]}
        />
      ),
    },
    {
      key: 'paidAt',
      header: 'Thanh toán lúc',
      render: (payment: Payment) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatDate(payment.paidAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      render: (payment: Payment) => (
        <div className="flex items-center gap-2">
          {payment.status === 'paid' && (
            <button
              type="button"
              onClick={() => openRefundModal(payment)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-purple-400 hover:text-purple-400"
            >
              <RotateCcw size={14} />
              Hoàn tiền
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý thanh toán"
        description="Theo dõi giao dịch, phương thức thanh toán và tình trạng thu tiền của các đơn hàng."
        eyebrow="TÀI CHÍNH"
      />

      {/* Thống kê */}
      <section
        aria-label="Tổng quan thanh toán"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Tổng giao dịch"
          value={total.toLocaleString('vi-VN')}
          icon={CreditCard}
          accent="primary"
        />

        <StatCard
          label="Tổng tiền đã thanh toán"
          value={formatCurrency(summary.totalPaidAmount)}
          icon={Wallet}
          accent="primary"
        />

        <StatCard
          label="Số giao dịch thành công"
          value={String(summary.totalPaidCount)}
          icon={CheckCircle}
          accent="cyan"
        />

        <StatCard
          label="Tổng tiền đã hoàn"
          value={formatCurrency(summary.totalRefundedAmount)}
          icon={RotateCcw}
          accent="purple"
        />
      </section>

      {/* Danh sách giao dịch */}
      <section className="overflow-hidden rounded-card border border-border-default bg-bg-surface">
        <div className="space-y-4 border-b border-border-default px-4 py-5 sm:px-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Danh sách giao dịch
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                Quản lý và theo dõi các khoản thanh toán của đơn hàng.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border-default px-3 text-sm text-text-secondary transition-colors hover:bg-bg-elevated disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? 'animate-spin' : ''}
              />
              Làm mới
            </button>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="w-full lg:max-w-sm">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Tìm mã giao dịch hoặc mã đơn..."
                ariaLabel="Tìm kiếm giao dịch thanh toán"
              />
            </div>

            <FilterBar
              onReset={resetFilters}
              showReset={
                search !== '' ||
                statusFilter !== 'all' ||
                methodFilter !== 'all'
              }
              resetLabel="Xóa bộ lọc"
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <select
                value={statusFilter}
                onChange={(event) => {
                  setLoading(true);
                  setStatusFilter(
                    event.target.value as PaymentStatus | 'all',
                  );
                  setPage(1);
                }}
                aria-label="Lọc theo trạng thái thanh toán"
                className="h-11 w-full rounded-btn border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary sm:w-auto"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ thanh toán</option>
                <option value="paid">Đã thanh toán</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Đã hoàn tiền</option>
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
                aria-label="Lọc theo phương thức thanh toán"
                className="h-11 w-full rounded-btn border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary sm:w-auto"
              >
                <option value="all">Tất cả phương thức</option>
                <option value="COD">Thanh toán khi nhận hàng</option>
                <option value="BANK">Chuyển khoản</option>
                <option value="MOMO">MoMo</option>
                <option value="VNPAY">VNPay</option>
                <option value="ZALOPAY">ZaloPay</option>
              </select>
            </FilterBar>
          </div>

          <div className="flex items-center justify-between text-sm text-text-secondary">
            <span>
              {filteredPayments.length} giao dịch trên trang hiện tại
            </span>

            <span>
              Tổng cộng {total.toLocaleString('vi-VN')} giao dịch
            </span>
          </div>
        </div>

        {error && (
          <div className="m-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <XCircle
              size={18}
              className="mt-0.5 shrink-0 text-red-400"
            />

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-400">
                Không thể tải dữ liệu thanh toán
              </p>

              <p className="mt-1 text-sm text-text-secondary">
                {error}
              </p>

              <button
                type="button"
                onClick={handleRefresh}
                className="mt-2 text-sm font-medium text-red-400 hover:underline"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-56 flex-col items-center justify-center gap-3">
            <RefreshCw
              size={24}
              className="animate-spin text-accent-primary"
            />

            <p className="text-sm text-text-muted">
              Đang tải dữ liệu thanh toán...
            </p>
          </div>
        ) : (
          <>
            <DataTable<Payment>
              columns={columns}
              data={filteredPayments}
              getRowId={(payment) => payment._id}
              emptyTitle="Không tìm thấy giao dịch"
              emptyDescription={
                search
                  ? 'Không tìm thấy giao dịch phù hợp trên trang hiện tại.'
                  : 'Chưa có giao dịch thanh toán hoặc không có dữ liệu phù hợp với bộ lọc.'
              }
            />

            <div className="flex flex-col gap-3 border-t border-border-default px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-text-muted">
                {total === 0
                  ? 'Không có dữ liệu'
                  : `Trang ${page} / ${totalPages} · ${total} giao dịch`}
              </p>

              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </section>

      {/* Modal hoàn tiền */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRefundModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-modal-title"
            className="w-full max-w-lg rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <div>
                <h2
                  id="refund-modal-title"
                  className="text-lg font-semibold text-text-primary"
                >
                  Hoàn tiền giao dịch
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Xác nhận hoàn tiền cho giao dịch này.
                </p>
              </div>

              <button
                type="button"
                onClick={closeRefundModal}
                disabled={refunding}
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-border-default bg-bg-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-text-muted">
                    Mã giao dịch
                  </span>

                  <span className="max-w-[65%] truncate text-right text-sm font-medium text-text-primary">
                    {selectedPayment.transactionCode ||
                      selectedPayment._id}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-text-muted">
                    Đơn hàng
                  </span>

                  <span className="text-sm font-medium text-text-primary">
                    {getOrderNumber(selectedPayment)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-text-muted">
                    Số tiền hoàn
                  </span>

                  <span className="text-base font-semibold text-purple-400">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="refund-reason"
                  className="mb-2 block text-sm font-medium text-text-primary"
                >
                  Lý do hoàn tiền
                  <span className="ml-1 text-text-muted">
                    (không bắt buộc)
                  </span>
                </label>

                <textarea
                  id="refund-reason"
                  value={refundReason}
                  onChange={(event) =>
                    setRefundReason(event.target.value)
                  }
                  maxLength={500}
                  rows={3}
                  placeholder="Nhập lý do hoàn tiền..."
                  className="w-full resize-none rounded-xl border border-border-default bg-bg-elevated px-3 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary"
                />

                <p className="mt-1 text-right text-xs text-text-muted">
                  {refundReason.length}/500 ký tự
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <Clock3
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <p className="text-xs leading-5 text-text-secondary">
                  Thao tác này sẽ gửi yêu cầu hoàn toàn bộ số tiền
                  đến Backend. Hãy kiểm tra kỹ trước khi xác nhận.
                </p>
              </div>

              {refundError && (
                <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                  {refundError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border-default px-5 py-4">
              <button
                type="button"
                onClick={closeRefundModal}
                disabled={refunding}
                className="h-10 rounded-lg border border-border-default px-4 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={() => void handleRefund()}
                disabled={refunding}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refunding ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} />
                    Xác nhận hoàn tiền
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
