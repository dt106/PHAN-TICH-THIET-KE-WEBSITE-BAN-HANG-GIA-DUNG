
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Download,
  Eye,
  Mail,
  Phone,
} from 'lucide-react';

import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';

import { Button } from '../../components/ui/buttons/Button';

import { customersService } from '../../services/customers/customers.service';

import type {
  AdminCustomer,
  CustomerStatus,
} from '../../types/customer.types';

/* =====================================================
   FORMATTERS
===================================================== */

const formatDate = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Chưa cập nhật'
    : date.toLocaleDateString('vi-VN');
};

const statusLabels: Record<CustomerStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  blocked: 'Đã khóa',
};

const statusVariants: Record<
  CustomerStatus,
  'success' | 'neutral' | 'danger'
> = {
  active: 'success',
  inactive: 'neutral',
  blocked: 'danger',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;

  return 'Không thể tải danh sách khách hàng. Vui lòng thử lại.';
};

/* =====================================================
   CUSTOMER AVATAR
===================================================== */

function CustomerAvatar({
  customer,
}: {
  customer: AdminCustomer;
}) {
  const initials = customer.name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-bg-elevated text-[11px] font-semibold text-accent-primary">
      {customer.avatar ? (
        <img
          src={customer.avatar}
          alt={`Ảnh đại diện của ${customer.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials || customer.name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

/* =====================================================
   CUSTOMER STATUS
===================================================== */

function CustomerStatusBadge({
  status,
}: {
  status: CustomerStatus;
}) {
  return (
    <StatusBadge
      status={statusLabels[status]}
      variant={statusVariants[status]}
      className="whitespace-nowrap"
    />
  );
}

/* =====================================================
   CUSTOMERS PAGE
===================================================== */

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | 'all'>('all');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* =====================================================
     LOAD CUSTOMERS FROM API
  ===================================================== */

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await customersService.getCustomers({
        keyword: search.trim() || undefined,
        status: status === 'all' ? undefined : status,
        page,
        limit: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      setCustomers(response.data);
      setTotal(response.pagination.total);
      setTotalPages(Math.max(1, response.pagination.totalPages));
    } catch (err) {
      setCustomers([]);
      setTotal(0);
      setTotalPages(1);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize]);

  useEffect(() => {
    let cancelled = false;

    const fetchCustomers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await customersService.getCustomers({
          keyword: search.trim() || undefined,
          status: status === 'all' ? undefined : status,
          page,
          limit: pageSize,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

        if (cancelled) return;

        setCustomers(response.data);
        setTotal(response.pagination.total);
        setTotalPages(Math.max(1, response.pagination.totalPages));
      } catch (err) {
        if (cancelled) return;

        setCustomers([]);
        setTotal(0);
        setTotalPages(1);
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCustomers();

    return () => {
      cancelled = true;
    };
  }, [search, status, page, pageSize]);

  /* =====================================================
     STATISTICS
     These counts describe the currently loaded page.
     The backend does not provide aggregate statistics.
  ===================================================== */

  const stats = useMemo(
    () => ({
      total,

      active: customers.filter(
        (customer) => customer.status === 'active',
      ).length,

      blocked: customers.filter(
        (customer) => customer.status === 'blocked',
      ).length,
    }),
    [customers, total],
  );

  /* =====================================================
     RESET FILTERS
  ===================================================== */

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(search.trim()) || status !== 'all';

  /* =====================================================
     TABLE COLUMNS
  ===================================================== */

  const columns: DataTableColumn<AdminCustomer>[] = [
    {
      key: 'customer',
      header: 'Khách hàng',
      className: 'min-w-[210px]',
      headerClassName: 'min-w-[210px]',
      render: (customer) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <CustomerAvatar customer={customer} />

          <div className="min-w-0">
            <Link
              to={`/customers/${customer._id}`}
              title={customer.name}
              className="block max-w-50 truncate text-xs font-semibold text-text-primary transition-colors hover:text-accent-primary"
            >
              {customer.name}
            </Link>

            <p className="mt-0.5 text-[10px] text-text-muted">
              ID: {customer._id}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Thông tin liên hệ',
      className: 'min-w-[220px]',
      headerClassName: 'min-w-[220px]',
      render: (customer) => (
        <div className="min-w-0 space-y-1.5">
          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-secondary">
            <Mail
              size={12}
              className="shrink-0 text-text-muted"
              aria-hidden="true"
            />

            <span className="truncate" title={customer.email}>
              {customer.email || 'Chưa cập nhật'}
            </span>
          </p>

          <p className="flex min-w-0 items-center gap-1.5 text-[11px] text-text-muted">
            <Phone
              size={12}
              className="shrink-0"
              aria-hidden="true"
            />

            <span className="truncate">
              {customer.phone || 'Chưa cập nhật'}
            </span>
          </p>
        </div>
      ),
    },
    {
      key: 'emailVerified',
      header: 'Xác thực email',
      className: 'min-w-[130px]',
      headerClassName: 'min-w-[130px]',
      render: (customer) => (
        <StatusBadge
          status={customer.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}
          variant={customer.emailVerifiedAt ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày đăng ký',
      className: 'min-w-[120px]',
      headerClassName: 'min-w-[120px]',
      render: (customer) => (
        <span className="whitespace-nowrap text-[11px] text-text-secondary">
          {formatDate(customer.createdAt)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      className: 'min-w-[130px]',
      headerClassName: 'min-w-[130px]',
      render: (customer) => (
        <CustomerStatusBadge status={customer.status} />
      ),
    },
    {
      key: 'actions',
      header: 'Chi tiết',
      className: 'min-w-[80px] text-right',
      headerClassName: 'min-w-[80px] text-right',
      render: (customer) => (
        <div className="flex justify-end">
          <Link
            to={`/customers/${customer._id}`}
            title="Xem chi tiết"
            aria-label={`Xem chi tiết ${customer.name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-default text-text-secondary transition-colors hover:border-accent-primary/40 hover:bg-accent-primary/10 hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <Eye size={15} aria-hidden="true" />
          </Link>
        </div>
      ),
    },
  ];

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <PageHeader
          eyebrow="Quản lý / Khách hàng"
          title="Khách hàng"
          description="Theo dõi hồ sơ và trạng thái tài khoản khách hàng."
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.print()}
            >
              <Download size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Xuất / In</span>
            </Button>
          }
        />

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="min-w-0">
            <StatCard
              label="Tổng khách hàng"
              value={stats.total.toLocaleString('vi-VN')}
              icon={Users}
              accent="primary"
            />
            <p className="px-1 pt-2 text-xs text-text-muted">
              Tổng số hồ sơ từ hệ thống
            </p>
          </div>

          <div className="min-w-0">
            <StatCard
              label="Đang hoạt động"
              value={stats.active.toLocaleString('vi-VN')}
              icon={UserCheck}
              accent="primary"
            />
            <p className="px-1 pt-2 text-xs text-text-muted">
              Trong trang dữ liệu hiện tại
            </p>
          </div>

          <div className="min-w-0">
            <StatCard
              label="Đã khóa"
              value={stats.blocked.toLocaleString('vi-VN')}
              icon={Users}
              accent="cyan"
            />
            <p className="px-1 pt-2 text-xs text-text-muted">
              Trong trang dữ liệu hiện tại
            </p>
          </div>
        </div>

        {/* CUSTOMER LIST */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
          {/* TABLE HEADER */}

          <div className="flex flex-col gap-3 border-b border-border-default p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Danh sách khách hàng
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                {total.toLocaleString('vi-VN')} khách hàng
                {' · '}
                Dữ liệu từ hệ thống
              </p>
            </div>

            <div className="min-w-0 xl:w-155">
              <FilterBar
                onReset={resetFilters}
                showReset={hasActiveFilters}
                resetLabel="Xóa bộ lọc"
                className="rounded-lg p-2"
              >
                <div className="w-full min-w-0 sm:flex-1">
                  <SearchBar
                    value={search}
                    onChange={(value) => {
                      setSearch(value);
                      setPage(1);
                    }}
                    placeholder="Tìm tên, email, số điện thoại..."
                    className="w-full"
                    ariaLabel="Tìm kiếm khách hàng"
                  />
                </div>

                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary sm:min-w-36.25">
                  <span>Trạng thái</span>

                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(
                        event.target.value as CustomerStatus | 'all',
                      );
                      setPage(1);
                    }}
                    className="h-10 w-full rounded-lg border border-border-strong bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                    <option value="blocked">Đã khóa</option>
                  </select>
                </label>
              </FilterBar>
            </div>
          </div>

          {/* RESULT SUMMARY */}

          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[11px] text-text-muted sm:px-4">
            <span>
              Hiển thị{' '}
              <strong className="font-semibold text-text-primary">
                {customers.length}
              </strong>{' '}
              / {total} khách hàng
            </span>

            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
              Dữ liệu API
            </span>
          </div>

          {/* LOADING */}

          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-text-muted">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
              <p className="text-sm">Đang tải danh sách khách hàng...</p>
            </div>
          ) : error ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm text-danger">{error}</p>

              <Button
                type="button"
                variant="secondary"
                onClick={() => void loadCustomers()}
              >
                Thử tải lại
              </Button>
            </div>
          ) : (
            <>
              {/* SHARED DATA TABLE */}

              <div className="min-w-0 overflow-x-auto px-3 pb-3 sm:px-4">
                <div className="min-w-[850px]">
                  <DataTable
                    columns={columns}
                    data={customers}
                    getRowId={(customer) => customer._id}
                    emptyTitle="Không tìm thấy khách hàng"
                    emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
                  />
                </div>
              </div>

              {/* SHARED PAGINATION */}

              <div className="px-3 pb-4 sm:px-4">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={(nextPageSize) => {
                    setPageSize(nextPageSize);
                    setPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </>
          )}
        </section>

        {/* PAGE INFORMATION */}

        {!loading && !error && totalPages > 0 && (
          <p className="text-right text-[11px] text-text-muted">
            Trang {page} / {totalPages}
          </p>
        )}
      </div>
    </div>
  );
}
