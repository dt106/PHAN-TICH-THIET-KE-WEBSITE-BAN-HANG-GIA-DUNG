import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Eye,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  TriangleAlert,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

import {
  getProducts,
  saveProducts,
} from '../../mocks/products.mock';
import type { Product, ProductStatus } from '../../types/product.types';

type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
type StatusFilter = 'all' | ProductStatus;

const PAGE_SIZE = 8;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const statusLabel: Record<ProductStatus, string> = {
  active: 'Đang bán',
  inactive: 'Ngừng bán',
  draft: 'Bản nháp',
};

const statusVariant: Record<
  ProductStatus,
  'success' | 'neutral' | 'warning'
> = {
  active: 'success',
  inactive: 'neutral',
  draft: 'warning',
};

function getStockStatus(stock: number): StockFilter {
  if (stock <= 0) return 'out-of-stock';
  if (stock <= 10) return 'low-stock';
  return 'in-stock';
}

function ProductImage({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-bg-elevated">
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <Package className="h-5 w-5 text-text-muted" />
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [sortByPrice, setSortByPrice] = useState<'asc' | 'desc' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((product) => product.status === 'active').length,
      lowStock: products.filter(
        (product) => product.stock > 0 && product.stock <= 10,
      ).length,
      outOfStock: products.filter((product) => product.stock <= 0).length,
    }),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesSearch =
        !keyword ||
        product.name.toLowerCase().includes(keyword) ||
        product.sku.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter;

      const matchesStock =
        stockFilter === 'all' ||
        getStockStatus(product.stock) === stockFilter;

      return matchesSearch && matchesStatus && matchesStock;
    });

    if (!sortByPrice) return result;

    return [...result].sort((a, b) =>
      sortByPrice === 'asc' ? a.price - b.price : b.price - a.price,
    );
  }, [products, search, statusFilter, stockFilter, sortByPrice]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / pageSize),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    stockFilter !== 'all' ||
    sortByPrice !== null;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setStockFilter('all');
    setSortByPrice(null);
    setPage(1);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    const nextProducts = products.filter(
      (product) => product.id !== deleteTarget.id,
    );

    saveProducts(nextProducts);
    setProducts(nextProducts);
    setDeleteTarget(null);

    setPage((current) =>
      Math.min(
        current,
        Math.max(1, Math.ceil(nextProducts.length / pageSize)),
      ),
    );
  };

  const columns = [
    {
      key: 'product',
      header: 'SẢN PHẨM',
      className: 'min-w-64',
      render: (product: Product) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductImage src={product.image} name={product.name} />

          <div className="min-w-0">
            <Link
              to={`/products/${product.id}`}
              title={product.name}
              className="block max-w-64 truncate font-medium text-text-primary transition-colors hover:text-accent-primary"
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
      render: (product: Product) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-text-primary">
            {product.category}
          </p>
          <p className="mt-1 truncate text-xs text-text-muted">
            {product.brand}
          </p>
        </div>
      ),
    },
    {
      key: 'price',
      header: (
        <button
          type="button"
          onClick={() => {
            setSortByPrice((current) =>
              current === 'asc' ? 'desc' : 'asc',
            );
            setPage(1);
          }}
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-md transition-colors hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          aria-label={`Sắp xếp giá ${sortByPrice === 'asc'
            ? 'từ thấp đến cao'
            : sortByPrice === 'desc'
              ? 'từ cao đến thấp'
              : ''
            }`}
        >
          GIÁ BÁN
          {sortByPrice === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-accent-primary" />
          ) : sortByPrice === 'desc' ? (
            <ArrowDown className="h-3.5 w-3.5 text-accent-primary" />
          ) : (
            <ArrowDownUp className="h-3.5 w-3.5" />
          )}
        </button>
      ),
      className: 'min-w-36',
      render: (product: Product) => (
        <span className="whitespace-nowrap font-semibold text-text-primary">
          {formatCurrency(product.price)}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'TỒN KHO',
      className: 'min-w-28',
      render: (product: Product) => {
        const stockStatus = getStockStatus(product.stock);

        return (
          <div className="flex items-center gap-2">
            <span
              className={
                product.stock <= 0
                  ? 'font-semibold text-danger'
                  : product.stock <= 10
                    ? 'font-semibold text-warning'
                    : 'font-medium text-text-primary'
              }
            >
              {product.stock}
            </span>

            {stockStatus === 'low-stock' && (
              <TriangleAlert
                className="h-4 w-4 text-warning"
                aria-label="Sắp hết hàng"
              />
            )}

            {stockStatus === 'out-of-stock' && (
              <XCircle
                className="h-4 w-4 text-danger"
                aria-label="Hết hàng"
              />
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'TRẠNG THÁI',
      className: 'min-w-32',
      render: (product: Product) => (
        <StatusBadge
          status={statusLabel[product.status]}
          variant={statusVariant[product.status]}
        />
      ),
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      className: 'min-w-36 text-right',
      headerClassName: 'text-right',
      render: (product: Product) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/products/${product.id}`}
            title="Xem chi tiết"
            aria-label={`Xem ${product.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <Eye className="h-4 w-4" />
          </Link>

          <Link
            to={`/products/${product.id}/edit`}
            title="Chỉnh sửa"
            aria-label={`Sửa ${product.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          >
            <Pencil className="h-4 w-4" />
          </Link>

          <button
            type="button"
            title="Xóa sản phẩm"
            aria-label={`Xóa ${product.name}`}
            onClick={() => setDeleteTarget(product)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 p-4 pb-8 sm:p-5 sm:pb-8 xl:p-6 xl:pb-8">      {/* Page header */}
      <PageHeader
        title="Quản lý sản phẩm"
        description="Theo dõi danh sách sản phẩm, giá bán và tình trạng tồn kho."
        eyebrow="CATALOG MANAGEMENT"
        actions={
          <Link
            to="/products/new"
            className="inline-flex w-full items-center justify-center sm:w-auto"
          >
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </Link>
        }
      />

      {/* Statistics */}
      <section
        aria-label="Thống kê sản phẩm"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4"
      >
        <StatCard
          label="Tổng sản phẩm"
          value={String(stats.total)}
          icon={ShoppingBag}
          accent="primary"
        />

        <StatCard
          label="Đang kinh doanh"
          value={String(stats.active)}
          icon={Package}
          accent="cyan"
        />

        <StatCard
          label="Sắp hết hàng"
          value={String(stats.lowStock)}
          icon={TriangleAlert}
          accent="warning"
        />

        <StatCard
          label="Hết hàng"
          value={String(stats.outOfStock)}
          icon={XCircle}
          accent="purple"
        />
      </section>

      {/* Product list */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
        {/* List heading + search */}
        <div className="flex flex-col gap-4 border-b border-border-default p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <Package className="h-4 w-4" />
              </div>

              <h2 className="text-base font-semibold text-text-primary">
                Danh sách sản phẩm
              </h2>
            </div>

            <p className="mt-2 text-sm leading-5 text-text-muted">
              Quản lý thông tin, giá bán và tình trạng hàng hóa.
            </p>
          </div>

          <div className="w-full min-w-0 xl:max-w-sm">
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Tìm tên, SKU, danh mục..."
            />
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-border-default bg-bg-app/30 px-4 py-4 sm:px-5">
          <FilterBar
            showReset={hasActiveFilters}
            onReset={resetFilters}
            resetLabel="Xóa bộ lọc"
          >
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2 text-text-muted">
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap text-sm font-medium">
                  Bộ lọc
                </span>
              </div>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as StatusFilter);
                  setPage(1);
                }}
                className="h-[42px] w-full min-w-0 rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 sm:w-auto sm:min-w-40"
                aria-label="Lọc theo trạng thái"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang bán</option>
                <option value="inactive">Ngừng bán</option>
                <option value="draft">Bản nháp</option>
              </select>

              <select
                value={stockFilter}
                onChange={(event) => {
                  setStockFilter(event.target.value as StockFilter);
                  setPage(1);
                }}
                className="h-[42px] w-full min-w-0 rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15 sm:w-auto sm:min-w-40"
                aria-label="Lọc theo tồn kho"
              >
                <option value="all">Tất cả tồn kho</option>
                <option value="in-stock">Còn hàng</option>
                <option value="low-stock">Sắp hết hàng</option>
                <option value="out-of-stock">Hết hàng</option>
              </select>

              {sortByPrice && (
                <span className="inline-flex min-h-9 items-center gap-2 self-start rounded-lg border border-border-default bg-bg-elevated px-3 text-xs text-text-secondary sm:self-auto">
                  Giá:{' '}
                  {sortByPrice === 'asc'
                    ? 'Thấp đến cao'
                    : 'Cao đến thấp'}

                  <button
                    type="button"
                    onClick={() => setSortByPrice(null)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                    aria-label="Bỏ sắp xếp giá"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}

              <div className="sm:ml-auto">
                <span className="text-sm text-text-muted">
                  Kết quả:{' '}
                  <span className="font-semibold text-text-primary">
                    {filteredProducts.length}
                  </span>
                </span>
              </div>
            </div>
          </FilterBar>
        </div>

        {/* Table */}
        <div className="min-w-0">
          <DataTable
            columns={columns}
            data={paginatedProducts}
            getRowId={(product) => String(product.id)}
            emptyTitle="Không tìm thấy sản phẩm"
            emptyDescription="Thử đổi từ khóa hoặc điều chỉnh bộ lọc để tìm sản phẩm."
          />
        </div>

        {/* Pagination */}
        <div className="border-t border-border-default bg-bg-app/20 px-4 py-4 sm:px-5">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={filteredProducts.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </section>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Xóa sản phẩm?"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xóa "${deleteTarget.name}"? Sản phẩm sẽ bị xóa khỏi danh sách mock được lưu trên trình duyệt.`
            : ''
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}