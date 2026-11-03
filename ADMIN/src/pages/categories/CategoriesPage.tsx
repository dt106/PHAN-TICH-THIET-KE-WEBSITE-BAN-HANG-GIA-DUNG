import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  FolderTree,
  Layers3,
  Package,
  Plus,
  Tags,
} from 'lucide-react';

import { Button } from '../../components/ui/buttons/Button';
import {
  Card,
  CardBody,
} from '../../components/ui/data-display/Card';

import PageHeader from '../../components/shared/PageHeader';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

import { mockCategories } from '../../mocks/categories.mock';

import type {
  Category,
  CategoryFormValues,
} from '../../types/category.types';

import CategoryFormModal from './components/CategoryFormModal';
import CategoryTable from './components/CategoryTable';

type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE = 7;

const controlClassName =
  'h-11 w-full rounded-[10px] border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-[border-color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:border-border-strong focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const cardClassName =
  'rounded-[14px] border border-border-default bg-bg-surface';

const iconSurfaceClassName =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-border-default bg-bg-elevated';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(() =>
    mockCategories.map((item) => ({ ...item })),
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null,
  );

  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Thống kê danh mục
  const stats = useMemo(() => {
    const active = categories.filter(
      (item) => item.status === 'active',
    ).length;

    const totalProducts = categories.reduce(
      (sum, item) => sum + item.productCount,
      0,
    );

    const rootCategories = categories.filter(
      (item) => item.parentId === null,
    ).length;

    return {
      total: categories.length,
      active,
      inactive: categories.length - active,
      totalProducts,
      rootCategories,
    };
  }, [categories]);

  // Tìm kiếm và lọc
  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');

    return categories.filter((category) => {
      const matchesSearch =
        !keyword ||
        category.name.toLocaleLowerCase('vi').includes(keyword) ||
        category.slug.toLowerCase().includes(keyword) ||
        category.description.toLocaleLowerCase('vi').includes(keyword);

      const matchesStatus =
        statusFilter === 'all' || category.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [categories, search, statusFilter]);

  // Phân trang
  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedCategories = filteredCategories.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  // Mở form tạo danh mục
  const openCreateModal = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  // Mở form chỉnh sửa danh mục
  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  // Lưu danh mục
  const saveCategory = (values: CategoryFormValues) => {
    if (editingCategory) {
      setCategories((current) =>
        current.map((item) =>
          item.id === editingCategory.id
            ? { ...item, ...values }
            : item,
        ),
      );
    } else {
      const newCategory: Category = {
        ...values,
        id: `CAT-${Date.now()}`,
        productCount: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      setCategories((current) => [newCategory, ...current]);
      setPage(1);
    }

    setModalOpen(false);
    setEditingCategory(null);
  };

  // Mở hộp thoại xác nhận xóa
  const requestDeleteCategory = (category: Category) => {
    setPendingDelete(category);
  };

  // Xác nhận xóa danh mục
  const confirmDeleteCategory = () => {
    if (!pendingDelete || deleteLoading) return;

    const categoryId = pendingDelete.id;

    setDeleteLoading(true);

    setCategories((current) =>
      current
        .filter((item) => item.id !== categoryId)
        .map((item) =>
          item.parentId === categoryId
            ? { ...item, parentId: null }
            : item,
        ),
    );

    setPendingDelete(null);
    setDeleteLoading(false);
  };

  // Bật / tắt trạng thái danh mục
  const toggleStatus = (category: Category) => {
    setCategories((current) =>
      current.map((item) =>
        item.id === category.id
          ? {
            ...item,
            status:
              item.status === 'active' ? 'inactive' : 'active',
          }
          : item,
      ),
    );
  };

  // Thay đổi từ khóa tìm kiếm
  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Thay đổi trạng thái lọc
  const changeStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  };

  // Xóa toàn bộ bộ lọc
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== '' || statusFilter !== 'all';

  const pendingChildrenCount = pendingDelete
    ? categories.filter(
      (item) => item.parentId === pendingDelete.id,
    ).length
    : 0;

  const deleteDescription = pendingDelete
    ? pendingChildrenCount > 0
      ? `Danh mục "${pendingDelete.name}" hiện có ${pendingChildrenCount} danh mục con. Nếu tiếp tục, danh mục sẽ bị xóa và các danh mục con sẽ được chuyển thành danh mục gốc.`
      : `Bạn có chắc muốn xóa danh mục "${pendingDelete.name}" khỏi dữ liệu mẫu hiện tại không?`
    : '';

  return (
    <div className="min-h-full bg-bg-app px-4 py-5 text-text-primary sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* Page header */}
        <PageHeader
          eyebrow="QUẢN LÝ CỬA HÀNG / DANH MỤC"
          title="Quản lý danh mục"
          description="Tổ chức danh mục sản phẩm, quản lý danh mục cha và danh mục con, theo dõi trạng thái hiển thị."
          actions={
            <Button
              onClick={openCreateModal}
              className="h-11 rounded-[10px] px-4 transition-[background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:brightness-110 active:translate-y-px active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app"
            >
              <Plus size={17} />
              Thêm danh mục
            </Button>
          }
        />

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className={cardClassName}>
            <CardBody className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">
                  Tổng danh mục
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
                  {stats.total}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Tất cả danh mục
                </p>
              </div>

              <div className={`${iconSurfaceClassName} text-accent-primary`}>
                <Layers3 size={21} />
              </div>
            </CardBody>
          </Card>

          <Card className={cardClassName}>
            <CardBody className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">
                  Đang hoạt động
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
                  {stats.active}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Danh mục đang bật
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-accent-primary/20 bg-accent-primary/10 text-accent-primary">
                <CheckCircle2 size={21} />
              </div>
            </CardBody>
          </Card>

          <Card className={cardClassName}>
            <CardBody className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">
                  Danh mục gốc
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
                  {stats.rootCategories}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Cấp cao nhất
                </p>
              </div>

              <div className={`${iconSurfaceClassName} text-cyan-400`}>
                <FolderTree size={21} />
              </div>
            </CardBody>
          </Card>

          <Card className={cardClassName}>
            <CardBody className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-sm text-text-secondary">
                  Sản phẩm thuộc danh mục
                </p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">
                  {stats.totalProducts.toLocaleString('vi-VN')}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Tổng theo dữ liệu mẫu
                </p>
              </div>

              <div className={`${iconSurfaceClassName} text-violet-400`}>
                <Package size={21} />
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Categories list */}
        <Card className={cardClassName}>
          <div className="border-b border-border-default px-5 py-4 sm:px-6">
            <h2 className="font-semibold text-text-primary">
              Danh sách danh mục
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Tìm kiếm, lọc và quản lý danh mục sản phẩm.
            </p>
          </div>

          {/* Filters */}
          <div className="border-b border-border-default p-4 sm:p-5">
            <FilterBar
              onReset={resetFilters}
              showReset={hasActiveFilters}
            >
              <SearchBar
                value={search}
                onChange={changeSearch}
                placeholder="Tìm tên, slug, mô tả..."
                ariaLabel="Tìm kiếm danh mục"
                className="w-full sm:max-w-sm"
              />

              <div className="relative w-full sm:w-56">
                <select
                  aria-label="Lọc theo trạng thái"
                  value={statusFilter}
                  onChange={(event) =>
                    changeStatus(event.target.value as StatusFilter)
                  }
                  className={`${controlClassName} appearance-none pr-10`}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>

                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </div>
            </FilterBar>
          </div>

          {/* Filter result summary */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-5 py-3 sm:px-6">
            <p className="text-sm text-text-secondary">
              Tìm thấy{' '}
              <span className="font-semibold tabular-nums text-text-primary">
                {filteredCategories.length}
              </span>{' '}
              danh mục
            </p>

            {hasActiveFilters && (
              <p className="text-xs text-text-muted">
                Kết quả đã được áp dụng bộ lọc
              </p>
            )}
          </div>

          {/* Table */}
          <CategoryTable
            categories={paginatedCategories}
            allCategories={categories}
            onEdit={openEditModal}
            onDelete={requestDeleteCategory}
            onToggleStatus={toggleStatus}
          />

          {/* Pagination */}
          <div className="border-t border-border-default px-4 py-3 sm:px-5">
            <Pagination
              page={safePage}
              pageSize={PAGE_SIZE}
              total={filteredCategories.length}
              onPageChange={setPage}
              pageSizeOptions={[PAGE_SIZE]}
            />
          </div>
        </Card>

        {/* Mock data note */}
        <p className="flex items-start gap-1.5 text-xs leading-5 text-text-muted">
          <Tags size={13} className="mt-0.5 shrink-0" />
          <span>
            Dữ liệu hiện tại là dữ liệu mẫu. Các thay đổi chỉ tồn tại trong
            state của trang và sẽ mất khi tải lại trình duyệt.
          </span>
        </p>
      </div>

      {/* Create / edit category modal */}
      <CategoryFormModal
        open={modalOpen}
        category={editingCategory}
        categories={categories}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={saveCategory}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Xác nhận xóa danh mục"
        description={deleteDescription}
        confirmText="Xóa danh mục"
        cancelText="Giữ lại"
        variant="danger"
        loading={deleteLoading}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}