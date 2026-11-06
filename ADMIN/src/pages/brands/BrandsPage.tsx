import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Tags,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Pagination from '../../components/shared/Pagination';

import BrandsTable from './components/BrandsTable';
import BrandFormModal from './components/BrandFormModal';

import { brandsService } from '../../services/catalog/brands.service';

import type {
  Brand,
  BrandCreatePayload,
  BrandListParams,
} from '../../types/brand.types';

type StatusFilter = 'all' | 'active' | 'inactive';
type SortBy = 'name' | 'createdAt' | 'updatedAt';

const PAGE_SIZE = 10;

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Bộ lọc và phân trang
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal thêm / chỉnh sửa
  const [formOpen, setFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Xác nhận xóa
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  /**
   * Lấy danh sách thương hiệu từ API admin.
   *
   * Backend hỗ trợ:
   * - page, limit
   * - search
   * - isActive
   * - sortBy: name | createdAt | updatedAt
   * - sortOrder: asc | desc
   */
  const loadBrands = useCallback(async () => {
    const params: BrandListParams = {
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      sortBy,
      sortOrder,
    };

    if (statusFilter !== 'all') {
      params.isActive = statusFilter === 'active';
    }

    const response = await brandsService.getList(params);

    setBrands(response.data ?? []);
    setTotal(response.pagination?.total ?? response.data?.length ?? 0);
    setError('');
  }, [page, search, sortBy, sortOrder, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const params: BrandListParams = {
          page,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          sortBy,
          sortOrder,
        };

        if (statusFilter !== 'all') {
          params.isActive = statusFilter === 'active';
        }

        const response = await brandsService.getList(params);

        if (cancelled) return;

        setBrands(response.data ?? []);
        setTotal(response.pagination?.total ?? response.data?.length ?? 0);
        setError('');
      } catch (requestError) {
        if (cancelled) return;

        setError(getErrorMessage(requestError));
        setBrands([]);
        setTotal(0);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [page, search, sortBy, sortOrder, statusFilter]);

  // Thống kê trên danh sách đang hiển thị
  const activeCount = brands.filter((brand) => brand.isActive).length;
  const inactiveCount = brands.filter((brand) => !brand.isActive).length;
  const logoCount = brands.filter((brand) => Boolean(brand.logo)).length;

  function openCreateModal() {
    setEditingBrand(null);
    setFormOpen(true);
  }

  function openEditModal(brand: Brand) {
    setEditingBrand(brand);
    setFormOpen(true);
  }

  function closeFormModal() {
    setFormOpen(false);
    setEditingBrand(null);
  }

  /**
   * Thêm mới hoặc cập nhật thương hiệu.
   */
  async function handleSubmitBrand(payload: BrandCreatePayload) {
    setSaving(true);

    try {
      if (editingBrand) {
        await brandsService.update(editingBrand.id, payload);
      } else {
        await brandsService.create(payload);
      }

      closeFormModal();
      await loadBrands();
    } catch (requestError) {
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    } finally {
      setSaving(false);
    }
  }

  /**
   * Bật / tắt trạng thái thương hiệu.
   */
  async function handleToggleStatus(brand: Brand) {
    try {
      setError('');

      await brandsService.toggleStatus(brand.id, !brand.isActive);

      await loadBrands();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  /**
   * Xóa thương hiệu.
   */
  async function handleDeleteBrand() {
    if (!deletingBrand) return;

    try {
      setError('');

      await brandsService.remove(deletingBrand.id);

      setDeletingBrand(null);

      // Nếu xóa phần tử cuối cùng của trang hiện tại,
      // chuyển về trang trước để tránh trang rỗng.
      const remainingItems = total - 1;
      const lastPage = Math.max(1, Math.ceil(remainingItems / PAGE_SIZE));
      const nextPage = Math.min(page, lastPage);

      if (nextPage !== page) {
        setPage(nextPage);
      } else {
        await loadBrands();
      }

      setTotal(remainingItems);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setDeletingBrand(null);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSortChange(value: string) {
    const [nextSortBy, nextSortOrder] = value.split('-') as [
      SortBy,
      'asc' | 'desc',
    ];

    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setPage(1);
  }

  async function handleRefresh() {
    setLoading(true);

    try {
      await loadBrands();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
      <div className="mx-auto max-w-[1800px] space-y-6">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Tags size={23} className="text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                Thương hiệu
              </h1>
            </div>

            <p className="mt-1 text-sm text-text-secondary">
              Quản lý thông tin và trạng thái các thương hiệu sản phẩm.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Làm mới
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={openCreateModal}
            >
              <Plus size={17} />
              Thêm thương hiệu
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Tổng thương hiệu
              </span>
              <Tags size={19} className="text-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {total}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Theo kết quả truy vấn hiện tại
            </p>
          </div>

          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Đang hoạt động
              </span>
              <CheckCircle2 size={19} className="text-success" />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {activeCount}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Trong trang hiện tại
            </p>
          </div>

          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Ngừng hoạt động
              </span>
              <XCircle size={19} className="text-danger" />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {inactiveCount}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Trong trang hiện tại
            </p>
          </div>

          <div className="rounded-xl border border-border-default bg-bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                Có logo
              </span>
              <ImageIcon size={19} className="text-info" />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">
              {logoCount}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Trong trang hiện tại
            </p>
          </div>
        </div>

        {/* Main content */}
        <section className="overflow-hidden rounded-xl border border-border-default bg-bg-surface">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border-default p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Tìm theo tên hoặc slug thương hiệu..."
                className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated pl-10 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(event.target.value as StatusFilter)
                }
                className="h-11 min-w-[170px] rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none focus:border-primary"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(event) => handleSortChange(event.target.value)}
                className="h-11 min-w-[190px] rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none focus:border-primary"
              >
                <option value="createdAt-desc">Mới tạo gần đây</option>
                <option value="createdAt-asc">Tạo lâu nhất</option>
                <option value="updatedAt-desc">Cập nhật gần đây</option>
                <option value="updatedAt-asc">Cập nhật lâu nhất</option>
                <option value="name-asc">Tên A - Z</option>
                <option value="name-desc">Tên Z - A</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="m-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  className="font-medium underline underline-offset-2"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="p-4">
            <BrandsTable
              brands={brands}
              loading={loading}
              onEdit={openEditModal}
              onToggleStatus={(brand) => void handleToggleStatus(brand)}
              onDelete={setDeletingBrand}
            />
          </div>

          {/* Pagination */}
          <div className="border-t border-border-default px-4 py-3">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </div>
        </section>
      </div>

      {/* Create / Update modal */}
      {formOpen && (
        <BrandFormModal
          key={editingBrand?.id ?? 'new-brand'}
          open={formOpen}
          brand={editingBrand}
          loading={saving}
          onClose={closeFormModal}
          onSubmit={handleSubmitBrand}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deletingBrand)}
        title="Xóa thương hiệu"
        description={
          deletingBrand
            ? `M có chắc chắn muốn xóa thương hiệu "${deletingBrand.name}" không? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa thương hiệu"
        cancelText="Hủy"
        onConfirm={() => void handleDeleteBrand()}
        onCancel={() => setDeletingBrand(null)}
      />
    </div>
  );
}