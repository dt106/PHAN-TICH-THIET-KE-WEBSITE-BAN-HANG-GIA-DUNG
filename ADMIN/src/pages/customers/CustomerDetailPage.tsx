
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Mail,
  Phone,
  Pencil,
  UserRound,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';

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

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Chưa cập nhật'
    : date.toLocaleString('vi-VN');
};

const statusText: Record<CustomerStatus, string> = {
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  blocked: 'Đã khóa',
};

const statusVariant: Record<
  CustomerStatus,
  'success' | 'danger' | 'neutral'
> = {
  active: 'success',
  inactive: 'neutral',
  blocked: 'danger',
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
};

const panelClass =
  'rounded-xl border border-border-default bg-bg-surface';

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
      status={statusText[status]}
      variant={statusVariant[status]}
      className="border border-border-default"
    />
  );
}

/* =====================================================
   CUSTOMER AVATAR
===================================================== */

function ProfileAvatar({
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
    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-strong bg-bg-elevated text-xl font-bold text-accent-primary sm:h-18 sm:w-18 sm:text-2xl">
      {customer.avatar ? (
        <img
          src={customer.avatar}
          alt={`Ảnh đại diện của ${customer.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials || <UserRound size={26} />
      )}
    </div>
  );
}

/* =====================================================
   INFORMATION ROW
===================================================== */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 border-b border-border-default py-3 last:border-b-0">
      <div className="mt-0.5 shrink-0 text-text-muted">
        <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-text-muted">
          {label}
        </p>

        <p className="mt-1 break-words text-sm text-text-primary">
          {value || 'Chưa cập nhật'}
        </p>
      </div>
    </div>
  );
}

/* =====================================================
   SECTION HEADING
===================================================== */

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-text-primary">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-xs text-text-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}

/* =====================================================
   CUSTOMER DETAIL PAGE
===================================================== */

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  /* =====================================================
     LOAD CUSTOMER DETAIL
  ===================================================== */

  const loadCustomer = useCallback(async () => {
    if (!id) {
      setCustomer(null);
      setError('Không tìm thấy mã khách hàng trên đường dẫn.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await customersService.getCustomerById(id);

      setCustomer(response.data);
    } catch (err) {
      setCustomer(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    let cancelled = false;

    const fetchCustomer = async () => {
      if (!id) {
        setCustomer(null);
        setError('Không tìm thấy mã khách hàng trên đường dẫn.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await customersService.getCustomerById(id);

        if (cancelled) return;

        setCustomer(response.data);
      } catch (err) {
        if (cancelled) return;

        setCustomer(null);
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCustomer();

    return () => {
      cancelled = true;
    };
  }, [id]);

  /* =====================================================
     UPDATE CUSTOMER STATUS
  ===================================================== */

  const handleToggleStatus = async () => {
    if (!customer || updatingStatus) return;

    const nextStatus: CustomerStatus =
      customer.status === 'blocked' ? 'active' : 'blocked';

    const confirmed = window.confirm(
      nextStatus === 'blocked'
        ? `Bạn có chắc chắn muốn khóa tài khoản "${customer.name}"?`
        : `Bạn có chắc chắn muốn kích hoạt lại tài khoản "${customer.name}"?`,
    );

    if (!confirmed) return;

    setUpdatingStatus(true);
    setActionError('');

    try {
      const response = await customersService.updateCustomerStatus(
        customer._id,
        { status: nextStatus },
      );

      setCustomer(response.data);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setUpdatingStatus(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-bg-app p-6 text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />

        <p className="text-sm">Đang tải thông tin khách hàng...</p>
      </div>
    );
  }

  /* =====================================================
     ERROR / NOT FOUND
  ===================================================== */

  if (error || !customer) {
    return (
      <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-6">
        <div
          className={`${panelClass} mx-auto max-w-2xl p-8 text-center sm:p-12`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-text-muted">
            <UserRound size={22} aria-hidden="true" />
          </div>

          <h1 className="mt-4 text-lg font-semibold text-text-primary">
            Không thể tải thông tin khách hàng
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {error || 'Hồ sơ khách hàng không tồn tại.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void loadCustomer()}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Thử lại
            </Button>

            <Link
              to="/customers"
              className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-[#111111] transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        {/* BREADCRUMB */}

        <nav
          aria-label="Đường dẫn điều hướng"
          className="flex flex-wrap items-center gap-2 text-xs text-text-muted"
        >
          <Link
            to="/dashboard"
            className="transition-colors hover:text-accent-primary"
          >
            Dashboard
          </Link>

          <span aria-hidden="true">/</span>

          <Link
            to="/customers"
            className="transition-colors hover:text-accent-primary"
          >
            Khách hàng
          </Link>

          <span aria-hidden="true">/</span>

          <span className="font-medium text-text-secondary">
            {customer.name}
          </span>
        </nav>

        {/* PROFILE HEADER */}

        <div>
          <Link
            to="/customers"
            className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-text-secondary transition-colors hover:text-accent-primary"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Quay lại danh sách khách hàng
          </Link>

          <section className={`${panelClass} p-4 sm:p-5`}>
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <ProfileAvatar customer={customer} />

                <div className="min-w-0">
                  <h1 className="break-words text-lg font-semibold tracking-tight text-text-primary sm:text-2xl">
                    {customer.name}
                  </h1>

                  <p className="mt-1 break-all text-xs text-text-muted">
                    ID: {customer._id}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <CustomerStatusBadge status={customer.status} />

                    <StatusBadge
                      status={
                        customer.emailVerifiedAt
                          ? 'Email đã xác thực'
                          : 'Email chưa xác thực'
                      }
                      variant={
                        customer.emailVerifiedAt ? 'success' : 'neutral'
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled
                  title="Backend chưa cung cấp chức năng chỉnh sửa hồ sơ khách hàng"
                >
                  <Pencil size={15} aria-hidden="true" />
                  Chỉnh sửa
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  loading={updatingStatus}
                  disabled={updatingStatus}
                  onClick={() => void handleToggleStatus()}
                  title={
                    customer.status === 'blocked'
                      ? 'Kích hoạt lại tài khoản'
                      : 'Khóa tài khoản'
                  }
                >
                  {customer.status === 'blocked' ? (
                    <ShieldCheck size={15} aria-hidden="true" />
                  ) : (
                    <Ban size={15} aria-hidden="true" />
                  )}

                  {customer.status === 'blocked'
                    ? 'Mở khóa tài khoản'
                    : 'Khóa tài khoản'}
                </Button>
              </div>
            </div>

            {actionError && (
              <p className="mt-4 rounded-lg border border-[#F04438]/20 bg-[#F04438]/10 px-3 py-2 text-xs text-[#F04438]">
                {actionError}
              </p>
            )}
          </section>
        </div>

        {/* CUSTOMER STATISTICS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={CalendarDays}
            label="Ngày tham gia"
            value={formatDate(customer.createdAt)}
            accent="primary"
          />

          <StatCard
            icon={ShieldCheck}
            label="Xác thực email"
            value={customer.emailVerifiedAt ? 'Đã xác thực' : 'Chưa xác thực'}
            accent="cyan"
          />

          <StatCard
            icon={RefreshCw}
            label="Cập nhật lần cuối"
            value={formatDate(customer.updatedAt)}
            accent="purple"
          />
        </div>

        {/* MAIN CONTENT */}

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          {/* PERSONAL INFORMATION */}

          <section className={`${panelClass} min-w-0 xl:col-span-2`}>
            <SectionHeading
              title="Thông tin cá nhân"
              description="Thông tin hồ sơ và liên hệ của khách hàng"
            />

            <div className="px-4 sm:px-5">
              <InfoRow
                icon={UserRound}
                label="Họ và tên"
                value={customer.name}
              />

              <InfoRow
                icon={Mail}
                label="Địa chỉ email"
                value={customer.email}
              />

              <InfoRow
                icon={Phone}
                label="Số điện thoại"
                value={customer.phone || ''}
              />

              <InfoRow
                icon={CalendarDays}
                label="Ngày đăng ký"
                value={formatDateTime(customer.createdAt)}
              />

              <InfoRow
                icon={CalendarDays}
                label="Cập nhật lần cuối"
                value={formatDateTime(customer.updatedAt)}
              />
            </div>
          </section>

          {/* ACCOUNT INFORMATION */}

          <section className={`${panelClass} min-w-0`}>
            <SectionHeading
              title="Thông tin tài khoản"
              description="Trạng thái và quyền truy cập"
            />

            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <p className="text-[11px] font-medium text-text-muted">
                  Loại tài khoản
                </p>

                <p className="mt-1 text-sm font-semibold text-text-primary">
                  Khách hàng
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-text-muted">
                  Trạng thái tài khoản
                </p>

                <div className="mt-2">
                  <CustomerStatusBadge status={customer.status} />
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-text-muted">
                  Trạng thái xác thực email
                </p>

                <div className="mt-2">
                  <StatusBadge
                    status={
                      customer.emailVerifiedAt
                        ? 'Đã xác thực'
                        : 'Chưa xác thực'
                    }
                    variant={
                      customer.emailVerifiedAt ? 'success' : 'neutral'
                    }
                  />
                </div>

                {customer.emailVerifiedAt && (
                  <p className="mt-2 text-xs text-text-secondary">
                    Xác thực lúc: {formatDateTime(customer.emailVerifiedAt)}
                  </p>
                )}
              </div>

              <div className="border-t border-border-default pt-4">
                <p className="text-xs leading-relaxed text-text-muted">
                  Thông tin đơn hàng, địa chỉ giao hàng và lịch sử mua
                  hàng chưa được cung cấp bởi API quản lý khách hàng
                  hiện tại.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
