import {
  Eye,
  Package,
  Pencil,
  Plus,
  Power,
  Star,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import PageHeader from '../../components/shared/PageHeader';
import Pagination from '../../components/shared/Pagination';
import SearchBar from '../../components/shared/SearchBar';
import StatCard from '../../components/shared/StatCard';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/buttons/Button';

import { productsService } from '../../services/catalog/products.service';

import type { DataTableColumn } from '../../components/shared/DataTable';
import type {
  Product,
  ProductReference,
  ProductStats,
} from '../../types/product.types';

type StatusFilter = 'all' | 'active' | 'inactive';
type FeaturedFilter = 'all' | 'featured' | 'not-featured';

const PAGE_SIZE = 10;

const initialStats: ProductStats = {
  totalProducts: 0,
  activeProducts: 0,
  inactiveProducts: 0,
  featuredProducts: 0,
};

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

function getReferenceName(
  value: string | ProductReference | null | undefined,
) {
  if (!value) return 'Chưa liên kết';
  if (typeof value === 'string') return value;
  return value.name || 'Chưa cập nhật';
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>(initialStats);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [featuredFilter, setFeaturedFilter] =
    useState<FeaturedFilter>('all');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError('');

      try {
        const response = await productsService.getAdminProducts({
          page,
          limit: pageSize,
          search: search.trim() || undefined,
          isActive:
            statusFilter === 'all'
              ? undefined
              : statusFilter === 'active',
          isFeatured:
            featuredFilter === 'all'
              ? undefined
              : featuredFilter === 'featured',
        });

        if (cancelled) return;

        setProducts(response.data ?? []);
        setStats(response.stats ?? initialStats);
        setTotal(response.pagination?.total ?? 0);

        const totalPages = Math.max(
          1,
          response.pagination?.totalPages ?? 1,
        );

        if (page > totalPages) {
          setPage(totalPages);
        }
      } catch (err) {
        if (cancelled) return;

        setProducts([]);
        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh sách sản phẩm.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    search,
    statusFilter,
    featuredFilter,
    reloadKey,
  ]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setFeaturedFilter('all');
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    setActionLoading(true);
    setError('');

    try {
      await productsService.deleteProduct(deleteTarget.id);

      setDeleteTarget(null);

      if (products.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể xóa sản phẩm.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus(product: Product) {
    setActionLoading(true);
    setError('');

    try {
      await productsService.updateProductStatus(product.id, {
        isActive: !product.isActive,
      });

      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái sản phẩm.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleFeatured(product: Product) {
    setActionLoading(true);
    setError('');

    try {
      await productsService.updateProductFeatured(product.id, {
        isFeatured: !product.isFeatured,
      });

      setReloadKey((current) => current + 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể cập nhật trạng thái nổi bật.',
      );
    } finally {
      setActionLoading(false);
    }
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'product',
      header: 'SẢN PHẨM',
      className: 'min-w-64',
      render: (product) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-text-muted">
            <Package className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <Link
              to={`/products/${product.id}`}
              className="block max-w-64 truncate font-medium text-text-primary transition-colors hover:text-accent-primary"
              title={product.name}
            >
              {product.name}
            </Link>

            <p className="mt-1 text-xs text-text-muted">
              SKU: {product.sku}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'DANH MỤC',
      className: 'min-w-36',
      render: (product) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-text-primary">
            {getReferenceName(product.categoryId)}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">
            {getReferenceName(product.brandId)}
          </p>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'GIÁ GỐC / GIÁ KHUYẾN MÃI',
      className: 'min-w-48',
      render: (product) => (
        <div>
          <p className="whitespace-nowrap text-sm font-semibold text-text-primary">
            {formatCurrency(product.basePrice)}
          </p>

          {product.salePrice !== null &&
            product.salePrice !== undefined ? (
            <p className="mt-1 whitespace-nowrap text-xs text-accent-primary">
              Khuyến mãi: {formatCurrency(product.salePrice)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-muted">
              Không khuyến mãi
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'KINH DOANH',
      className: 'min-w-36',
      render: (product) =>
        product.isActive ? (
          <StatusBadge status="Đang kinh doanh" variant="success" />
        ) : (
          <StatusBadge status="Ngừng kinh doanh" variant="neutral" />
        ),
    },
    {
      key: 'featured',
      header: 'NỔI BẬT',
      className: 'min-w-28',
      render: (product) =>
        product.isFeatured ? (
          <StatusBadge status="Nổi bật" variant="warning" />
        ) : (
          <StatusBadge status="Thông thường" variant="neutral" />
        ),
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      className: 'min-w-44 text-right',
      headerClassName: 'text-right',
      render: (product) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/products/${product.id}`}
            title="Xem chi tiết"
            aria-label={`Xem ${product.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-accent-primary"
          >
            <Eye className="h-4 w-4" />
          </Link>

          <Link
            to={`/products/${product.id}/edit`}
            title="Chỉnh sửa"
            aria-label={`Sửa ${product.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-accent-primary"
          >
            <Pencil className="h-4 w-4" />
          </Link>

          <button
            type="button"
            title={product.isActive ? 'Ngừng kinh doanh' : 'Mở kinh doanh'}
            aria-label={
              product.isActive
                ? `Ngừng kinh doanh ${product.name}`
                : `Mở kinh doanh ${product.name}`
            }
            disabled={actionLoading}
            onClick={() => void handleToggleStatus(product)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-accent-primary disabled:opacity-50"
          >
            <Power className="h-4 w-4" />
          </button>

          <button
            type="button"
            title={product.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
            aria-label={
              product.isFeatured
                ? `Bỏ nổi bật ${product.name}`
                : `Đánh dấu nổi bật ${product.name}`
            }
            disabled={actionLoading}
            onClick={() => void handleToggleFeatured(product)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-amber-400 disabled:opacity-50"
          >
            <Star
              className={`h-4 w-4 ${product.isFeatured ? 'fill-amber-400 text-amber-400' : ''
                }`}
            />
          </button>

          <button
            type="button"
            title="Xóa sản phẩm"
            aria-label={`Xóa ${product.name}`}
            disabled={actionLoading}
            onClick={() => setDeleteTarget(product)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    featuredFilter !== 'all';

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Quản lý sản phẩm"
        description="Theo dõi thông tin, giá bán và trạng thái kinh doanh sản phẩm."
        eyebrow="CATALOG MANAGEMENT"
        actions={
          <Link to="/products/new" className="w-full sm:w-auto">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng sản phẩm"
          value={String(stats.totalProducts)}
          icon={Package}
          accent="primary"
        />

        <StatCard
          label="Đang kinh doanh"
          value={String(stats.activeProducts)}
          icon={Power}
          accent="cyan"
        />

        <StatCard
          label="Ngừng kinh doanh"
          value={String(stats.inactiveProducts)}
          icon={Package}
          accent="warning"
        />

        <StatCard
          label="Sản phẩm nổi bật"
          value={String(stats.featuredProducts)}
          icon={Star}
          accent="purple"
        />
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
        <div className="flex flex-col gap-4 border-b border-border-default p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent-primary" />
              <h2 className="font-semibold text-text-primary">
                Danh sách sản phẩm
              </h2>
            </div>

            <p className="mt-2 text-sm text-text-muted">
              Tổng cộng {total} sản phẩm phù hợp với điều kiện lọc.
            </p>
          </div>

          <div className="w-full xl:max-w-sm">
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tìm theo tên hoặc SKU..."
            />
          </div>
        </div>

        <div className="border-b border-border-default bg-bg-app/30 px-4 py-4 sm:px-5">
          <FilterBar
            showReset={hasActiveFilters}
            onReset={resetFilters}
            resetLabel="Xóa bộ lọc"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Kinh doanh</span>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="h-[42px] rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none focus:border-accent-primary"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang kinh doanh</option>
                  <option value="inactive">Ngừng kinh doanh</option>
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Nổi bật</span>
                <select
                  value={featuredFilter}
                  onChange={(event) => {
                    setFeaturedFilter(
                      event.target.value as FeaturedFilter,
                    );
                    setPage(1);
                  }}
                  className="h-[42px] rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none focus:border-accent-primary"
                >
                  <option value="all">Tất cả</option>
                  <option value="featured">Nổi bật</option>
                  <option value="not-featured">Thông thường</option>
                </select>
              </label>
            </div>
          </FilterBar>
        </div>

        <DataTable
          columns={columns}
          data={products}
          getRowId={(product) => product.id}
          loading={loading}
          emptyTitle="Không tìm thấy sản phẩm"
          emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
        />

        <div className="p-4 sm:p-5">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            pageSizeOptions={[10, 20, 50, 100]}
          />
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa sản phẩm?"
        description={
          deleteTarget
            ? `M có chắc muốn xóa sản phẩm "${deleteTarget.name}" không? Backend có thể từ chối nếu sản phẩm đang được dữ liệu khác tham chiếu.`
            : ''
        }
        confirmText="Xóa sản phẩm"
        cancelText="Hủy"
        variant="danger"
        loading={actionLoading}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </main>
  );
}