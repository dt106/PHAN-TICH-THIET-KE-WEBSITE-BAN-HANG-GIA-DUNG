import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Edit2,
  Gift,
  Plus,
  Power,
  Ticket,
  Users,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import { Card } from '../../components/ui/data-display/Card';
import Modal from '../../components/ui/overlays/Modal';

import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';

import { couponsService } from '../../services/coupons/coupons.service';

import type {
  Coupon,
  CouponDiscountType,
  CouponPayload,
  CouponUpdatePayload,
} from '../../types/coupon.types';

type StatusFilter = 'all' | 'active' | 'inactive' | 'upcoming' | 'expired';

type CouponFormValues = {
  code: string;
  name: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: string;
  minimumOrderAmount: string;
  maximumDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
};

const PAGE_SIZE_DEFAULT = 7;

const EMPTY_FORM: CouponFormValues = {
  code: '',
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minimumOrderAmount: '0',
  maximumDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('vi-VN').format(value);

const formatDate = (value: string | null) => {
  if (!value) return 'Không giới hạn';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const toDateInput = (value: string | null) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000,
  );

  return localDate.toISOString().slice(0, 16);
};

const toIsoDate = (value: string) =>
  value ? new Date(value).toISOString() : null;

const getCouponStatus = (coupon: Coupon) => {
  const now = Date.now();

  if (!coupon.isActive) {
    return { label: 'Đã tắt', variant: 'neutral' as const };
  }

  if (
    coupon.startsAt &&
    new Date(coupon.startsAt).getTime() > now
  ) {
    return { label: 'Sắp diễn ra', variant: 'info' as const };
  }

  if (
    coupon.expiresAt &&
    new Date(coupon.expiresAt).getTime() < now
  ) {
    return { label: 'Hết hạn', variant: 'danger' as const };
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    return { label: 'Hết lượt', variant: 'warning' as const };
  }

  return { label: 'Đang hoạt động', variant: 'success' as const };
};

const getDiscountLabel = (coupon: Coupon) =>
  coupon.discountType === 'percentage'
    ? `${coupon.discountValue}%`
    : formatMoney(coupon.discountValue);

const getInitialForm = (coupon: Coupon | null): CouponFormValues => {
  if (!coupon) return { ...EMPTY_FORM };

  return {
    code: coupon.code,
    name: coupon.name,
    description: coupon.description ?? '',
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minimumOrderAmount: String(coupon.minimumOrderAmount),
    maximumDiscountAmount:
      coupon.maximumDiscountAmount === null
        ? ''
        : String(coupon.maximumDiscountAmount),
    usageLimit:
      coupon.usageLimit === null ? '' : String(coupon.usageLimit),
    perUserLimit:
      coupon.perUserLimit === null ? '' : String(coupon.perUserLimit),
    startsAt: toDateInput(coupon.startsAt),
    expiresAt: toDateInput(coupon.expiresAt),
    isActive: coupon.isActive,
  };
};

const inputClass =
  'mt-1.5 h-10 w-full rounded-btn border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:ring-1 focus:ring-accent-primary';

const labelClass = 'block text-sm font-medium text-text-secondary';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CouponDiscountType>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponFormValues>({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');

  // Tải toàn bộ danh sách coupon từ backend.
  useEffect(() => {
    let mounted = true;

    const loadCoupons = async () => {
      try {
        setLoading(true);
        setPageError('');

        const result = await couponsService.getAllCoupons();

        if (mounted) {
          setCoupons(result.items);
        }
      } catch (error) {
        if (mounted) {
          setPageError(
            error instanceof Error
              ? error.message
              : 'Không thể tải danh sách mã giảm giá.',
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCoupons();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const active = coupons.filter(
      (item) => getCouponStatus(item).label === 'Đang hoạt động',
    ).length;

    const expired = coupons.filter((item) =>
      ['Hết hạn', 'Hết lượt'].includes(getCouponStatus(item).label),
    ).length;

    const totalUsed = coupons.reduce(
      (sum, item) => sum + item.usedCount,
      0,
    );

    return {
      total: coupons.length,
      active,
      expired,
      totalUsed,
    };
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');

    return coupons
      .filter((coupon) => {
        const matchesSearch =
          !keyword ||
          coupon.code.toLocaleLowerCase('vi').includes(keyword) ||
          coupon.name.toLocaleLowerCase('vi').includes(keyword);

        const status = getCouponStatus(coupon).label;

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' && status === 'Đang hoạt động') ||
          (statusFilter === 'inactive' && status === 'Đã tắt') ||
          (statusFilter === 'upcoming' && status === 'Sắp diễn ra') ||
          (statusFilter === 'expired' &&
            ['Hết hạn', 'Hết lượt'].includes(status));

        const matchesType =
          typeFilter === 'all' || coupon.discountType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }, [coupons, search, statusFilter, typeFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCoupons.length / pageSize),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedCoupons = filteredCoupons.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const hasFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all';

  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm(getInitialForm(coupon));
    setFormError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCoupon(null);
    setFormError('');
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setPage(1);
  };

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      setActionId(coupon.id);
      setPageError('');

      const updatedCoupon = await couponsService.toggleCouponStatus(
        coupon.id,
      );

      setCoupons((current) =>
        current.map((item) =>
          item.id === coupon.id ? updatedCoupon : item,
        ),
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Không thể cập nhật trạng thái mã giảm giá.',
      );
    } finally {
      setActionId(null);
    }
  };

  const saveCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    const discountValue = Number(form.discountValue);
    const minimum = Number(form.minimumOrderAmount);

    const maximum = form.maximumDiscountAmount.trim()
      ? Number(form.maximumDiscountAmount)
      : null;

    const usageLimit = form.usageLimit.trim()
      ? Number(form.usageLimit)
      : null;

    const perUserLimit = form.perUserLimit.trim()
      ? Number(form.perUserLimit)
      : null;

    if (!editingCoupon && !code) {
      setFormError('Vui lòng nhập mã giảm giá.');
      return;
    }

    if (!name) {
      setFormError('Vui lòng nhập tên chương trình.');
      return;
    }

    if (
      !editingCoupon &&
      coupons.some((item) => item.code.toUpperCase() === code)
    ) {
      setFormError('Mã giảm giá này đã tồn tại.');
      return;
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setFormError('Giá trị giảm phải lớn hơn 0.');
      return;
    }

    if (form.discountType === 'percentage' && discountValue > 100) {
      setFormError('Giá trị giảm theo phần trăm không được vượt quá 100%.');
      return;
    }

    if (!Number.isFinite(minimum) || minimum < 0) {
      setFormError('Đơn hàng tối thiểu phải là số không âm.');
      return;
    }

    if (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) {
      setFormError('Giá trị giảm tối đa không hợp lệ.');
      return;
    }

    if (
      usageLimit !== null &&
      (!Number.isInteger(usageLimit) || usageLimit < 1)
    ) {
      setFormError('Tổng lượt sử dụng phải là số nguyên dương.');
      return;
    }

    if (
      perUserLimit !== null &&
      (!Number.isInteger(perUserLimit) || perUserLimit < 1)
    ) {
      setFormError('Giới hạn mỗi khách phải là số nguyên dương.');
      return;
    }

    if (
      usageLimit !== null &&
      editingCoupon &&
      usageLimit < editingCoupon.usedCount
    ) {
      setFormError(
        'Tổng lượt sử dụng không thể nhỏ hơn số lượt đã sử dụng.',
      );
      return;
    }

    if (
      form.startsAt &&
      form.expiresAt &&
      new Date(form.startsAt).getTime() >=
      new Date(form.expiresAt).getTime()
    ) {
      setFormError('Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }

    const payload: CouponPayload = {
      code,
      name,
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue,
      minimumOrderAmount: minimum,
      maximumDiscountAmount:
        form.discountType === 'percentage' ? maximum : null,
      usageLimit,
      perUserLimit,
      startsAt: toIsoDate(form.startsAt),
      expiresAt: toIsoDate(form.expiresAt),
      isActive: form.isActive,
    };

    try {
      setSaving(true);

      if (editingCoupon) {
        const updatePayload: CouponUpdatePayload = {
          name: payload.name,
          description: payload.description,
          discountType: payload.discountType,
          discountValue: payload.discountValue,
          minimumOrderAmount: payload.minimumOrderAmount,
          maximumDiscountAmount: payload.maximumDiscountAmount,
          usageLimit: payload.usageLimit,
          perUserLimit: payload.perUserLimit,
          startsAt: payload.startsAt,
          expiresAt: payload.expiresAt,
          isActive: payload.isActive,
        };

        const updatedCoupon = await couponsService.updateCoupon(
          editingCoupon.id,
          updatePayload,
        );

        setCoupons((current) =>
          current.map((item) =>
            item.id === editingCoupon.id ? updatedCoupon : item,
          ),
        );
      } else {
        const createdCoupon = await couponsService.createCoupon(payload);

        setCoupons((current) => [createdCoupon, ...current]);
        setPage(1);
      }

      setModalOpen(false);
      setEditingCoupon(null);
      setFormError('');
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Không thể lưu mã giảm giá.',
      );
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: 'coupon',
      header: 'MÃ GIẢM GIÁ',
      render: (coupon) => (
        <div className="flex min-w-48 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary">
            <Ticket size={19} />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-text-primary">
              {coupon.code}
            </p>
            <p className="mt-1 max-w-52 truncate text-xs text-text-muted">
              {coupon.name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'ƯU ĐÃI',
      render: (coupon) => (
        <div className="min-w-32">
          <p className="font-semibold text-accent-primary">
            {getDiscountLabel(coupon)}
          </p>

          <p className="mt-1 text-xs text-text-muted">
            {coupon.discountType === 'percentage'
              ? coupon.maximumDiscountAmount === null
                ? 'Không giới hạn mức giảm'
                : `Tối đa ${formatMoney(coupon.maximumDiscountAmount)}`
              : 'Giảm tiền cố định'}
          </p>
        </div>
      ),
    },
    {
      key: 'minimum',
      header: 'ĐƠN TỐI THIỂU',
      render: (coupon) => (
        <span className="whitespace-nowrap text-sm text-text-secondary">
          {formatMoney(coupon.minimumOrderAmount)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'LƯỢT SỬ DỤNG',
      render: (coupon) => {
        const limit = coupon.usageLimit;

        const progress =
          limit && limit > 0
            ? Math.min(100, (coupon.usedCount / limit) * 100)
            : 0;

        return (
          <div className="min-w-28">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-text-primary">
                {formatNumber(coupon.usedCount)}
              </span>

              <span className="text-text-muted">
                {limit === null ? '∞' : formatNumber(limit)}
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
              <div
                className="h-full rounded-full bg-accent-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'validity',
      header: 'THỜI HẠN',
      render: (coupon) => (
        <div className="min-w-36">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CalendarDays size={14} className="shrink-0 text-text-muted" />
            {formatDate(coupon.startsAt)}
          </div>

          <p className="mt-1 pl-6 text-xs text-text-muted">
            đến {formatDate(coupon.expiresAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'TRẠNG THÁI',
      render: (coupon) => {
        const status = getCouponStatus(coupon);

        return (
          <StatusBadge
            status={status.label}
            variant={status.variant}
          />
        );
      },
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (coupon) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="icon"
            title="Chỉnh sửa mã"
            aria-label={`Chỉnh sửa ${coupon.code}`}
            onClick={() => openEditModal(coupon)}
          >
            <Edit2 size={16} />
          </Button>

          <Button
            type="button"
            variant="icon"
            title={coupon.isActive ? 'Tắt mã' : 'Bật mã'}
            aria-label={coupon.isActive ? 'Tắt mã' : 'Bật mã'}
            disabled={actionId === coupon.id}
            onClick={() => void toggleCoupon(coupon)}
          >
            <Power
              size={16}
              className={
                coupon.isActive
                  ? 'text-status-warning'
                  : 'text-accent-primary'
              }
            />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-bg-app px-4 py-6 text-text-primary sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <PageHeader
          eyebrow="QUẢN LÝ CỬA HÀNG / KHUYẾN MÃI"
          title="Quản lý mã giảm giá"
          description="Tạo ưu đãi, kiểm soát thời hạn và theo dõi hiệu quả sử dụng mã giảm giá."
          actions={
            <Button onClick={openCreateModal}>
              <Plus size={17} />
              Tạo mã giảm giá
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng mã giảm giá"
            value={formatNumber(stats.total)}
            icon={Ticket}
            accent="primary"
          />

          <StatCard
            label="Đang hoạt động"
            value={formatNumber(stats.active)}
            icon={CheckCircle2}
            accent="cyan"
          />

          <StatCard
            label="Tổng lượt sử dụng"
            value={formatNumber(stats.totalUsed)}
            icon={Users}
            accent="purple"
          />

          <StatCard
            label="Hết hạn / hết lượt"
            value={formatNumber(stats.expired)}
            icon={Clock3}
            accent="warning"
          />
        </div>

        <Card>
          <div className="border-b border-border-default px-5 py-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-text-primary">
                  Danh sách mã giảm giá
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Tìm kiếm, lọc và quản lý các chương trình ưu đãi.
                </p>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-text-muted sm:mt-0">
                <CircleDollarSign
                  size={16}
                  className="text-accent-primary"
                />
                Dữ liệu từ máy chủ
              </div>
            </div>
          </div>

          <div className="border-b border-border-default p-4 sm:p-5">
            <FilterBar
              onReset={resetFilters}
              showReset={hasFilters}
              resetLabel="Xóa bộ lọc"
            >
              <SearchBar
                value={search}
                onChange={changeSearch}
                placeholder="Tìm mã hoặc tên chương trình..."
                ariaLabel="Tìm mã giảm giá"
                className="w-full sm:max-w-sm"
              />

              <div className="w-full sm:w-52">
                <select
                  aria-label="Lọc trạng thái mã giảm giá"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-lg border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã tắt</option>
                  <option value="upcoming">Sắp diễn ra</option>
                  <option value="expired">Hết hạn / hết lượt</option>
                </select>
              </div>

              <div className="w-full sm:w-52">
                <select
                  aria-label="Lọc loại ưu đãi"
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(
                      event.target.value as 'all' | CouponDiscountType,
                    );
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-lg border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                >
                  <option value="all">Tất cả loại ưu đãi</option>
                  <option value="percentage">Giảm theo phần trăm</option>
                  <option value="fixed">Giảm số tiền cố định</option>
                </select>
              </div>
            </FilterBar>
          </div>

          {pageError && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger"
            >
              {pageError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-default px-5 py-3">
            <p className="text-sm text-text-secondary">
              Tìm thấy{' '}
              <span className="font-semibold text-text-primary">
                {formatNumber(filteredCoupons.length)}
              </span>{' '}
              mã giảm giá
            </p>

            {hasFilters && (
              <p className="text-xs text-text-muted">
                Kết quả đã áp dụng bộ lọc
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-text-muted">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
                <p className="text-sm">Đang tải mã giảm giá...</p>
              </div>
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={paginatedCoupons}
                getRowId={(coupon) => coupon.id}
                emptyTitle="Không tìm thấy mã giảm giá"
                emptyDescription="Thử đổi từ khóa hoặc điều chỉnh bộ lọc."
              />

              <div className="px-4 pb-4 sm:px-5">
                <Pagination
                  page={safePage}
                  pageSize={pageSize}
                  total={filteredCoupons.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  pageSizeOptions={[7, 10, 20, 50]}
                />
              </div>
            </>
          )}
        </Card>

        <p className="text-xs leading-5 text-text-muted">
          <Gift size={14} className="mr-1 inline-block" />
          Dữ liệu được đồng bộ trực tiếp với máy chủ.
        </p>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingCoupon ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá'}
        maxWidth="lg"
      >
        <form onSubmit={saveCoupon} className="space-y-4">
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                Thông tin chương trình
              </p>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Mã giảm giá{' '}
                  <span className="text-status-danger">*</span>

                  <input
                    required
                    maxLength={50}
                    disabled={Boolean(editingCoupon)}
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value
                          .toUpperCase()
                          .replace(/\s/g, ''),
                      }))
                    }
                    placeholder="VD: WELCOME10"
                    className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
                  />

                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    {editingCoupon
                      ? 'Mã giảm giá không thể thay đổi sau khi tạo.'
                      : 'Chỉ dùng chữ, số, dấu gạch ngang và gạch dưới.'}
                  </span>
                </label>

                <label className={labelClass}>
                  Tên chương trình{' '}
                  <span className="text-status-danger">*</span>

                  <input
                    required
                    maxLength={150}
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="VD: Ưu đãi khách hàng mới"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={`${labelClass} mt-4`}>
                Mô tả chương trình

                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Mô tả điều kiện hoặc đối tượng áp dụng..."
                  className="mt-1.5 w-full resize-y rounded-btn border border-border-default bg-bg-app px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                />
              </label>
            </div>

            <div className="border-t border-border-default pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                Giá trị và điều kiện áp dụng
              </p>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Loại ưu đãi

                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discountType: event.target.value as CouponDiscountType,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="percentage">Giảm theo phần trăm (%)</option>
                    <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                  </select>
                </label>

                <label className={labelClass}>
                  Giá trị giảm{' '}
                  <span className="text-status-danger">*</span>

                  <input
                    required
                    type="number"
                    min="0.01"
                    max={
                      form.discountType === 'percentage' ? 100 : undefined
                    }
                    step="any"
                    value={form.discountValue}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        discountValue: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Đơn hàng tối thiểu (VNĐ)

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.minimumOrderAmount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minimumOrderAmount: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </label>

                {form.discountType === 'percentage' && (
                  <label className={labelClass}>
                    Giảm tối đa (VNĐ)

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.maximumDiscountAmount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maximumDiscountAmount: event.target.value,
                        }))
                      }
                      placeholder="Không giới hạn"
                      className={inputClass}
                    />
                  </label>
                )}

                <label className={labelClass}>
                  Tổng lượt sử dụng

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.usageLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        usageLimit: event.target.value,
                      }))
                    }
                    placeholder="Không giới hạn"
                    className={inputClass}
                  />
                </label>

                <label className={labelClass}>
                  Giới hạn mỗi khách

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.perUserLimit}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        perUserLimit: event.target.value,
                      }))
                    }
                    placeholder="Không giới hạn"
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <div className="border-t border-border-default pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
                Thời gian và trạng thái
              </p>

              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  Ngày giờ bắt đầu

                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startsAt: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />

                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    Để trống nếu không giới hạn ngày bắt đầu.
                  </span>
                </label>

                <label className={labelClass}>
                  Ngày giờ kết thúc

                  <input
                    type="datetime-local"
                    min={form.startsAt || undefined}
                    value={form.expiresAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                    className={inputClass}
                  />

                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    Để trống nếu không giới hạn ngày kết thúc.
                  </span>
                </label>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border-default bg-bg-app p-3.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 accent-lime-500"
                />

                <span>
                  <span className="block text-sm font-medium text-text-primary">
                    Kích hoạt mã giảm giá
                  </span>

                  <span className="mt-1 block text-xs leading-5 text-text-muted">
                    Mã chỉ có thể sử dụng khi được bật, nằm trong thời hạn và
                    chưa vượt giới hạn lượt sử dụng.
                  </span>
                </span>
              </label>
            </div>

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2.5 text-sm text-status-danger"
              >
                {formError}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={closeModal}
              disabled={saving}
            >
              Hủy
            </Button>

            <Button type="submit" loading={saving} disabled={saving}>
              {editingCoupon ? (
                <>
                  <Edit2 size={16} />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Tạo mã giảm giá
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}