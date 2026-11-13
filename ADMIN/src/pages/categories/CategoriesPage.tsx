import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  CheckCircle2,
  FolderTree,
  Layers3,
  Package,
  Tags,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import {
  Card,
  CardBody,
} from '../../components/ui/data-display/Card';
import { Select } from '../../components/ui/forms/Select';

import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import StatCard from '../../components/shared/StatCard';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

import CategoryTable from './components/CategoryTable';
import CategoryFormModal from './components/CategoryFormModal';

import { categoriesService } from '../../services/catalog/categories.service';
import type {
  Category,
  CategoryFormValues,
} from '../../types/category.types';


const PAGE_SIZE = 7;

const CATEGORY_LIST_PARAMS = {
  page: 1,
  limit: 100,
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    const apiError = error as Error & {
      data?: unknown;
    };

    const data = apiError.data;

    if (data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;

      if (typeof payload.message === 'string' && payload.message) {
        return payload.message;
      }

      if (typeof payload.error === 'string' && payload.error) {
        return payload.error;
      }

      if (Array.isArray(payload.errors)) {
        return payload.errors
          .map((item) => {
            if (typeof item === 'string') return item;

            if (item && typeof item === 'object') {
              const detail = item as Record<string, unknown>;
              return String(detail.message ?? detail.msg ?? '');
            }

            return '';
          })
          .filter(Boolean)
          .join(', ');
      }
    }

    return error.message;
  }

  return 'Không thể lưu danh mục. Vui lòng thử lại.';
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  /**
  * Tải danh sách danh mục từ API Admin.
  * Dùng chung cho lần tải đầu và sau các thao tác CRUD.
  */
  const reloadCategories = useCallback(async () => {
    try {
      setPageError('');

      const response = await categoriesService.getAdminList(
        CATEGORY_LIST_PARAMS,
      );

      setCategories(response.data);
    } catch (error) {
      setPageError(getErrorMessage(error));
      throw error;
    }
  }, []);

  /**
   * Tải danh sách danh mục lần đầu.
   */
  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        setLoading(true);
        setPageError('');

        const response = await categoriesService.getAdminList(
          CATEGORY_LIST_PARAMS,
        );

        if (!cancelled) {
          setCategories(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Tìm kiếm và lọc trạng thái.
   */
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch =
        !normalizedSearch ||
        category.name.toLowerCase().includes(normalizedSearch) ||
        category.slug.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'all' || category.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  /**
   * Phân trang phía frontend.
   */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedCategories = useMemo(() => {
    const startIndex = (safePage - 1) * PAGE_SIZE;

    return filteredCategories.slice(
      startIndex,
      startIndex + PAGE_SIZE,
    );
  }, [filteredCategories, safePage]);

  /**
   * Thống kê danh mục.
   */
  const stats = useMemo(() => {
    const activeCount = categories.filter(
      (category) => category.status === 'active',
    ).length;

    const inactiveCount = categories.length - activeCount;

    const rootCount = categories.filter(
      (category) => !category.parentId,
    ).length;

    const childCount = categories.length - rootCount;

    return {
      total: categories.length,
      active: activeCount,
      inactive: inactiveCount,
      root: rootCount,
      child: childCount,
    };
  }, [categories]);

  /**
   * Event handlers: tìm kiếm và lọc.
   */
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  /**
   * Mở modal tạo mới / chỉnh sửa.
   */
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setActionError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setActionError('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingCategory(null);
    setActionError('');
  };

  /**
   * Tạo mới hoặc cập nhật danh mục.
   */
  const handleSubmit = async (values: CategoryFormValues) => {
    if (saving) return;

    setSaving(true);
    setActionError('');

    try {
      if (editingCategory) {
        await categoriesService.update(editingCategory.id, values);
      } else {
        await categoriesService.create(values);
      }

      await reloadCategories();

      setModalOpen(false);
      setEditingCategory(null);
      setPage(1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Bật / tắt trạng thái danh mục.
   */
  const handleToggleStatus = async (category: Category) => {
    const nextStatus = category.status !== 'active';

    setActionError('');

    try {
      await categoriesService.updateStatus(
        category.id,
        nextStatus,
      );

      await reloadCategories();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  /**
   * Xóa danh mục sau khi xác nhận.
   */
  const handleDelete = async () => {
    if (!pendingDelete || deleteLoading) return;

    setDeleteLoading(true);
    setActionError('');

    try {
      await categoriesService.delete(pendingDelete.id);
      await reloadCategories();

      setPendingDelete(null);
      setPage(1);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  /**
   * Tải lại khi API gặp lỗi.
   */
  const handleRetry = async () => {
    setLoading(true);
    setPageError('');

    try {
      await reloadCategories();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Quản lý danh mục"
        description="Quản lý danh mục sản phẩm và cấu trúc danh mục của cửa hàng."
        actions={
          <Button onClick={handleOpenCreate}>
            <Tags size={16} />
            Thêm danh mục
          </Button>
        }
      />

      {/* Lỗi tải dữ liệu */}
      {pageError && (
        <Card>
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-red-400">{pageError}</p>

            <Button
              variant="secondary"
              onClick={handleRetry}
              loading={loading}
              disabled={loading}
            >
              Thử lại
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Lỗi thao tác */}
      {actionError && !modalOpen && (
        <Card>
          <CardBody>
            <p className="text-sm text-red-400">{actionError}</p>
          </CardBody>
        </Card>
      )}

      {/* Thống kê */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng danh mục"
          value={String(stats.total)}
          icon={FolderTree}
          accent="primary"
        />

        <StatCard
          label="Đang hoạt động"
          value={String(stats.active)}
          icon={CheckCircle2}
          accent="cyan"
        />

        <StatCard
          label="Danh mục gốc"
          value={String(stats.root)}
          icon={Layers3}
          accent="purple"
        />

        <StatCard
          label="Danh mục con"
          value={String(stats.child)}
          icon={Package}
          accent="warning"
        />
      </div>

      {/* Danh sách danh mục */}
      <Card>
        <CardBody className="space-y-4">
          {/* Tìm kiếm và lọc */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-md">
              <SearchBar
                value={search}
                onChange={handleSearchChange}
                placeholder="Tìm theo tên hoặc slug danh mục..."
              />
            </div>

            <div className="w-full lg:w-64">
              <FilterBar
                showReset
                onReset={handleResetFilters}
                resetLabel="Xóa bộ lọc"
              >
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  options={[
                    { label: 'Tất cả trạng thái', value: 'all' },
                    { label: 'Đang hoạt động', value: 'active' },
                    { label: 'Ngừng hoạt động', value: 'inactive' },
                  ]}
                />
              </FilterBar>
            </div>
          </div>

          {/* Thông tin kết quả */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            <span>
              Hiển thị {filteredCategories.length} danh mục
            </span>
            <span>·</span>
            <span>{stats.active} đang hoạt động</span>
            <span>·</span>
            <span>{stats.inactive} ngừng hoạt động</span>
          </div>

          {/* Loading */}
          {loading && categories.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center">
              <p className="text-sm text-text-muted">
                Đang tải danh sách danh mục...
              </p>
            </div>
          ) : (
            <CategoryTable
              categories={paginatedCategories}
              allCategories={categories}
              onEdit={handleOpenEdit}
              onDelete={setPendingDelete}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {/* Phân trang */}
          {!loading && filteredCategories.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-muted">
                Trang {safePage}/{totalPages} · {filteredCategories.length} danh mục
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={safePage <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                >
                  Trước
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1),
                    )
                  }
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal tạo / sửa: chỉ mount khi đang mở */}
      {modalOpen && (
        <CategoryFormModal
          key={editingCategory?.id ?? 'new-category'}
          open={modalOpen}
          category={editingCategory}
          categories={categories}
          onClose={handleCloseModal}
          onSave={handleSubmit}
        />
      )}

      {/* Xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Xóa danh mục"
        description={
          pendingDelete
            ? `Bạn có chắc muốn xóa danh mục "${pendingDelete.name}"? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa danh mục"
        cancelText="Hủy"
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) {
            setPendingDelete(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}