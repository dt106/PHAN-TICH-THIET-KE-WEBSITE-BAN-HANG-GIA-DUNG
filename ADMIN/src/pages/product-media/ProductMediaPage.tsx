import {
  CalendarDays,
  Film,
  Image as ImageIcon,
  Images,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  AlertCircle,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import { LoadingState } from '../../components/shared/LoadingState';
import PageHeader from '../../components/shared/PageHeader';
import Pagination from '../../components/shared/Pagination';
import SearchBar from '../../components/shared/SearchBar';
import StatCard from '../../components/shared/StatCard';

import { Button } from '../../components/ui/buttons/Button';
import Modal from '../../components/ui/overlays/Modal';

import { productsService } from '../../services/catalog/products.service';
import { productMediaService } from '../../services/catalog/productMedia.service';

import type { Product } from '../../types/product.types';
import type {
  MediaType,
  ProductMedia,
  ProductMediaPayload,
} from '../../types/product-media.types';

import { ProductMediaFormModal } from './components/ProductMediaFormModal';

// =====================================================
// TYPES
// =====================================================

type TypeFilter = 'all' | MediaType;
type PrimaryFilter = 'all' | 'primary' | 'secondary';

interface ProductMediaFormValues {
  productId: string;
  mediaList: ProductMediaPayload[];
  files?: File[];
}

interface MediaLoadResult {
  data: ProductMedia[];
  failed: boolean;
}

// =====================================================
// CONSTANTS
// =====================================================

const PAGE_SIZE = 7;
const PRODUCT_PAGE_LIMIT = 100;

// =====================================================
// HELPERS
// =====================================================

const formatDate = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getProductId = (product: Product): string =>
  String(product._id || product.id || '');

const getErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const response = error.response;

    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response
    ) {
      const data = response.data;

      if (
        typeof data === 'object' &&
        data !== null &&
        'message' in data &&
        typeof data.message === 'string'
      ) {
        return data.message;
      }
    }
  }

  return error instanceof Error
    ? error.message
    : 'Đã xảy ra lỗi. Vui lòng thử lại.';
};

// =====================================================
// MAIN PAGE
// =====================================================

export default function ProductMediaPage() {
  // ---------------------------------------------------
  // DATA
  // ---------------------------------------------------

  const [products, setProducts] = useState<Product[]>([]);
  const [media, setMedia] = useState<ProductMedia[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  const [pageError, setPageError] = useState('');
  const [actionError, setActionError] = useState('');

  // Ngăn request cũ ghi đè dữ liệu mới.
  const requestIdRef = useRef(0);

  // ---------------------------------------------------
  // FILTERS
  // ---------------------------------------------------

  const [keyword, setKeyword] = useState('');
  const [productFilter, setProductFilter] = useState('all');

  const [typeFilter, setTypeFilter] =
    useState<TypeFilter>('all');

  const [primaryFilter, setPrimaryFilter] =
    useState<PrimaryFilter>('all');

  // ---------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  // ---------------------------------------------------
  // MODALS
  // ---------------------------------------------------

  const [formModalOpen, setFormModalOpen] = useState(false);

  const [editingMedia, setEditingMedia] =
    useState<ProductMedia | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<ProductMedia | null>(null);

  const [previewTarget, setPreviewTarget] =
    useState<ProductMedia | null>(null);

  // ---------------------------------------------------
  // PRODUCT MAP
  // ---------------------------------------------------

  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          getProductId(product),
          product,
        ]),
      ),
    [products],
  );

  const getProduct = useCallback(
    (productId: string) => productMap.get(productId),
    [productMap],
  );

  // ---------------------------------------------------
  // LOAD DATA
  // ---------------------------------------------------

  /*
   * Không setState trước await đầu tiên trong hàm này.
   *
   * Nhờ đó useEffect gọi loadData() sẽ không gây cảnh báo:
   * Calling setState synchronously within an effect.
   *
   * loading ban đầu đã được khởi tạo bằng useState(true).
   */

  const loadData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    try {
      const productResponse =
        await productsService.getAdminProducts({
          page: 1,
          limit: PRODUCT_PAGE_LIMIT,
        });

      const productList = Array.isArray(productResponse.data)
        ? productResponse.data
        : [];

      const validProducts = productList.filter((product) =>
        getProductId(product),
      );

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setProducts(productList);

      // Tải media của từng sản phẩm.
      const mediaResults: MediaLoadResult[] =
        await Promise.all(
          validProducts.map(async (product) => {
            const productId = getProductId(product);

            try {
              const response =
                await productMediaService.getByProduct(
                  productId,
                );

              return {
                data: Array.isArray(response.data)
                  ? response.data
                  : [],
                failed: false,
              };
            } catch (error) {
              console.error(
                `Không thể tải media sản phẩm ${productId}:`,
                error,
              );

              return {
                data: [],
                failed: true,
              };
            }
          }),
        );

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setMedia(
        mediaResults.flatMap((result) => result.data),
      );

      const failedCount = mediaResults.filter(
        (result) => result.failed,
      ).length;

      setPageError(
        failedCount > 0
          ? `Đã tải được dữ liệu, nhưng có ${failedCount} sản phẩm không thể tải media. Vui lòng thử làm mới.`
          : '',
      );
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      setPageError(getErrorMessage(error));
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // ---------------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const taskId = window.setTimeout(() => {
      if (!cancelled) {
        void loadData();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(taskId);
      requestIdRef.current += 1;
    };
  }, [loadData]);

  // ---------------------------------------------------
  // REFRESH
  // ---------------------------------------------------

  const handleRefresh = useCallback(() => {
    if (loading || refreshing) {
      return;
    }

    setPageError('');
    setRefreshing(true);

    void loadData();
  }, [loading, refreshing, loadData]);

  // ---------------------------------------------------
  // STATISTICS
  // ---------------------------------------------------

  const stats = useMemo(
    () => ({
      total: media.length,

      images: media.filter(
        (item) => item.mediaType === 'image',
      ).length,

      videos: media.filter(
        (item) => item.mediaType === 'video',
      ).length,

      primary: media.filter(
        (item) =>
          item.mediaType === 'image' &&
          item.isPrimary,
      ).length,
    }),
    [media],
  );

  // ---------------------------------------------------
  // SEARCH & FILTER
  // ---------------------------------------------------

  const filteredMedia = useMemo(() => {
    const normalizedKeyword = keyword
      .trim()
      .toLocaleLowerCase('vi');

    return media
      .filter((item) => {
        const product = getProduct(item.productId);

        const searchableValues = [
          item.mediaUrl,
          item.altText ?? '',
          product?.name ?? '',
          product?.sku ?? '',
        ];

        const matchesKeyword =
          !normalizedKeyword ||
          searchableValues.some((value) =>
            String(value)
              .toLocaleLowerCase('vi')
              .includes(normalizedKeyword),
          );

        const matchesProduct =
          productFilter === 'all' ||
          item.productId === productFilter;

        const matchesType =
          typeFilter === 'all' ||
          item.mediaType === typeFilter;

        const matchesPrimary =
          primaryFilter === 'all' ||
          (primaryFilter === 'primary' &&
            item.isPrimary) ||
          (primaryFilter === 'secondary' &&
            !item.isPrimary);

        return (
          matchesKeyword &&
          matchesProduct &&
          matchesType &&
          matchesPrimary
        );
      })
      .sort((a, b) => {
        const nameA =
          getProduct(a.productId)?.name ?? '';

        const nameB =
          getProduct(b.productId)?.name ?? '';

        const productCompare = nameA.localeCompare(
          nameB,
          'vi',
        );

        if (productCompare !== 0) {
          return productCompare;
        }

        if (a.isPrimary !== b.isPrimary) {
          return a.isPrimary ? -1 : 1;
        }

        return a.sortOrder - b.sortOrder;
      });
  }, [
    media,
    keyword,
    productFilter,
    typeFilter,
    primaryFilter,
    getProduct,
  ]);

  const hasActiveFilters =
    keyword.trim() !== '' ||
    productFilter !== 'all' ||
    typeFilter !== 'all' ||
    primaryFilter !== 'all';

  // ---------------------------------------------------
  // FILTER ACTIONS
  // ---------------------------------------------------

  const resetFilters = useCallback(() => {
    setKeyword('');
    setProductFilter('all');
    setTypeFilter('all');
    setPrimaryFilter('all');
    setPage(1);
  }, []);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(1);
  };

  const handleProductFilterChange = (value: string) => {
    setProductFilter(value);
    setPage(1);
  };

  const handleTypeFilterChange = (value: TypeFilter) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handlePrimaryFilterChange = (
    value: PrimaryFilter,
  ) => {
    setPrimaryFilter(value);
    setPage(1);
  };

  // ---------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMedia.length / pageSize),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedMedia = useMemo(
    () =>
      filteredMedia.slice(
        (safePage - 1) * pageSize,
        safePage * pageSize,
      ),
    [filteredMedia, safePage, pageSize],
  );

  // ---------------------------------------------------
  // CREATE / EDIT MODAL
  // ---------------------------------------------------

  const openCreateModal = () => {
    if (
      loading ||
      saving ||
      products.length === 0
    ) {
      return;
    }

    setEditingMedia(null);
    setActionError('');
    setFormModalOpen(true);
  };

  const openEditModal = (item: ProductMedia) => {
    if (saving || actionLoadingId !== null) {
      return;
    }

    setEditingMedia(item);
    setActionError('');
    setFormModalOpen(true);
  };

  const closeFormModal = () => {
    if (saving) {
      return;
    }

    setFormModalOpen(false);
    setEditingMedia(null);
    setActionError('');
  };

  // ---------------------------------------------------
  // CREATE / UPDATE MEDIA
  // ---------------------------------------------------

  const handleSubmit = async (
    values: ProductMediaFormValues,
  ) => {
    if (saving) {
      return;
    }

    setSaving(true);
    setActionError('');

    try {
      if (!values.productId) {
        throw new Error('Vui lòng chọn sản phẩm.');
      }

      if (editingMedia) {
        const payload = values.mediaList[0];

        if (!payload) {
          throw new Error(
            'Không có dữ liệu media để cập nhật.',
          );
        }

        await productMediaService.update(
          editingMedia._id,
          payload,
        );
      } else {
        const files = values.files ?? [];

        if (files.length > 0) {
          // API upload đã tự tạo media trong database.
          // Không gọi createBatch sau uploadFiles.
          await productMediaService.uploadFiles(
            values.productId,
            files,
          );
        } else if (values.mediaList.length === 1) {
          await productMediaService.create(
            values.productId,
            values.mediaList[0],
          );
        } else if (values.mediaList.length > 1) {
          await productMediaService.createBatch(
            values.productId,
            values.mediaList,
          );
        } else {
          throw new Error(
            'Vui lòng chọn file hoặc nhập URL media.',
          );
        }
      }

      setFormModalOpen(false);
      setEditingMedia(null);
      setActionError('');

      setPageError('');
      setRefreshing(true);

      await loadData();
    } catch (error) {
      const message = getErrorMessage(error);

      setActionError(message);

      throw error;
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------
  // SET PRIMARY IMAGE
  // ---------------------------------------------------

  const handleSetPrimary = async (
    target: ProductMedia,
  ) => {
    if (
      target.mediaType !== 'image' ||
      target.isPrimary ||
      actionLoadingId !== null ||
      saving
    ) {
      return;
    }

    setActionLoadingId(target._id);
    setPageError('');

    try {
      await productMediaService.setPrimary(
        target._id,
      );

      setRefreshing(true);
      await loadData();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  };

  // ---------------------------------------------------
  // DELETE MEDIA
  // ---------------------------------------------------

  const openDeleteDialog = (item: ProductMedia) => {
    if (actionLoadingId !== null || saving) {
      return;
    }

    setDeleteTarget(item);
  };

  const handleDelete = async () => {
    if (
      !deleteTarget ||
      actionLoadingId !== null ||
      saving
    ) {
      return;
    }

    const target = deleteTarget;

    setActionLoadingId(target._id);
    setPageError('');

    try {
      await productMediaService.delete(target._id);

      setDeleteTarget(null);

      setPreviewTarget((current) =>
        current?._id === target._id
          ? null
          : current,
      );

      setRefreshing(true);
      await loadData();
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  };

  // ---------------------------------------------------
  // TABLE COLUMNS
  // ---------------------------------------------------

  const columns = useMemo<DataTableColumn<ProductMedia>[]>(
    () => [
      {
        key: 'preview',
        header: 'Xem trước',

        render: (item) => (
          <button
            type="button"
            onClick={() => setPreviewTarget(item)}
            title="Xem trước media"
            className="group block h-16 w-20 overflow-hidden rounded-lg border border-border-default bg-bg-app transition-colors hover:border-accent-primary"
          >
            {item.mediaType === 'image' ? (
              <img
                src={item.mediaUrl}
                alt={item.altText ?? 'Ảnh sản phẩm'}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-accent-cyan">
                <Film size={24} />
              </span>
            )}
          </button>
        ),
      },

      {
        key: 'product',
        header: 'Sản phẩm',

        render: (item) => {
          const product = getProduct(item.productId);

          return (
            <div className="min-w-0">
              <p className="max-w-52 truncate font-medium text-text-primary">
                {product?.name ??
                  'Sản phẩm không xác định'}
              </p>

              <p className="mt-1 text-xs text-text-muted">
                {product?.sku ?? item.productId}
              </p>
            </div>
          );
        },
      },

      {
        key: 'mediaUrl',
        header: 'Thông tin media',

        render: (item) => (
          <div className="min-w-0 max-w-64">
            <p className="truncate text-sm text-text-primary">
              {item.altText || 'Chưa có mô tả'}
            </p>

            <a
              href={item.mediaUrl}
              target="_blank"
              rel="noreferrer"
              title={item.mediaUrl}
              className="mt-1 block truncate text-xs text-accent-cyan hover:underline"
            >
              {item.mediaUrl}
            </a>
          </div>
        ),
      },

      {
        key: 'mediaType',
        header: 'Loại',

        render: (item) => (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.mediaType === 'image'
              ? 'bg-accent-primary/10 text-accent-primary'
              : 'bg-accent-cyan/10 text-accent-cyan'
              }`}
          >
            {item.mediaType === 'image' ? (
              <ImageIcon size={13} />
            ) : (
              <Film size={13} />
            )}

            {item.mediaType === 'image'
              ? 'Hình ảnh'
              : 'Video'}
          </span>
        ),
      },

      {
        key: 'sortOrder',
        header: 'Thứ tự',
        className: 'text-center',
        headerClassName: 'text-center',

        render: (item) => (
          <span className="font-medium tabular-nums text-text-primary">
            {item.sortOrder}
          </span>
        ),
      },

      {
        key: 'isPrimary',
        header: 'Ảnh chính',

        render: (item) =>
          item.isPrimary ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400">
              <Star
                size={13}
                fill="currentColor"
              />
              Ảnh chính
            </span>
          ) : item.mediaType === 'image' ? (
            <Button
              type="button"
              variant="secondary"
              loading={actionLoadingId === item._id}
              disabled={
                actionLoadingId !== null ||
                saving
              }
              onClick={() =>
                void handleSetPrimary(item)
              }
            >
              <Star size={14} />
              Đặt làm chính
            </Button>
          ) : (
            <span className="text-xs text-text-muted">
              Không áp dụng
            </span>
          ),
      },

      {
        key: 'actions',
        header: 'Thao tác',
        className: 'text-right',
        headerClassName: 'text-right',

        render: (item) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="icon"
              title="Chỉnh sửa"
              aria-label="Chỉnh sửa media"
              disabled={
                actionLoadingId !== null ||
                saving
              }
              onClick={() => openEditModal(item)}
            >
              <Pencil size={16} />
            </Button>

            <Button
              type="button"
              variant="icon"
              title="Xóa media"
              aria-label="Xóa media"
              disabled={
                actionLoadingId !== null ||
                saving
              }
              onClick={() =>
                openDeleteDialog(item)
              }
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ),
      },
    ],
    [
      getProduct,
      actionLoadingId,
      saving,
    ],
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">

        {/* HEADER */}

        <PageHeader
          eyebrow="QUẢN LÝ SẢN PHẨM"
          title="Hình ảnh & video sản phẩm"
          description="Quản lý media, ảnh đại diện và thứ tự hiển thị của sản phẩm."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleRefresh}
                loading={refreshing}
                disabled={loading || refreshing}
              >
                <RefreshCw size={16} />
                Làm mới
              </Button>

              <Button
                type="button"
                onClick={openCreateModal}
                disabled={
                  products.length === 0 ||
                  loading ||
                  saving
                }
              >
                <Plus size={18} />
                Thêm media
              </Button>
            </div>
          }
        />

        {/* ERROR */}

        {pageError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger"
          >
            <div className="flex items-start gap-2">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0"
              />

              <span className="leading-5">
                {pageError}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPageError('')}
              className="shrink-0 rounded-md p-1 hover:bg-status-danger/10"
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        )}

        {/* STATISTICS */}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tổng media"
            value={String(stats.total)}
            icon={Images}
            accent="primary"
          />

          <StatCard
            label="Hình ảnh"
            value={String(stats.images)}
            icon={ImageIcon}
            accent="cyan"
          />

          <StatCard
            label="Video"
            value={String(stats.videos)}
            icon={Film}
            accent="purple"
          />

          <StatCard
            label="Ảnh chính"
            value={String(stats.primary)}
            icon={Star}
            accent="warning"
          />
        </div>

        {/* MEDIA LIST */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-surface">

          {/* SECTION HEADER + FILTERS */}

          <div className="flex flex-col gap-3 border-b border-border-default p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-text-primary">
                Danh sách media
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                {filteredMedia.length} mục phù hợp với điều kiện tìm kiếm.
              </p>
            </div>

            <div className="min-w-0 xl:w-[780px]">
              <FilterBar
                onReset={resetFilters}
                showReset={hasActiveFilters}
                resetLabel="Xóa bộ lọc"
                className="rounded-lg p-2"
              >
                <div className="w-full min-w-0 sm:flex-1">
                  <SearchBar
                    value={keyword}
                    onChange={handleKeywordChange}
                    placeholder="Tìm sản phẩm, SKU, URL..."
                    className="w-full"
                    ariaLabel="Tìm kiếm media sản phẩm"
                  />
                </div>

                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary sm:min-w-36">
                  <span>Sản phẩm</span>

                  <select
                    value={productFilter}
                    onChange={(event) =>
                      handleProductFilterChange(
                        event.target.value,
                      )
                    }
                    className="h-10 w-full rounded-lg border border-border-strong bg-bg-app px-3 text-sm text-text-primary outline-none focus:border-accent-primary"
                  >
                    <option value="all">
                      Tất cả sản phẩm
                    </option>

                    {products.map((product) => (
                      <option
                        key={getProductId(product)}
                        value={getProductId(product)}
                      >
                        {product.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary sm:min-w-32">
                  <span>Loại media</span>

                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      handleTypeFilterChange(
                        event.target.value as TypeFilter,
                      )
                    }
                    className="h-10 w-full rounded-lg border border-border-strong bg-bg-app px-3 text-sm text-text-primary outline-none focus:border-accent-primary"
                  >
                    <option value="all">
                      Tất cả loại
                    </option>

                    <option value="image">
                      Hình ảnh
                    </option>

                    <option value="video">
                      Video
                    </option>
                  </select>
                </label>

                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-text-secondary sm:min-w-32">
                  <span>Vai trò</span>

                  <select
                    value={primaryFilter}
                    onChange={(event) =>
                      handlePrimaryFilterChange(
                        event.target.value as PrimaryFilter,
                      )
                    }
                    className="h-10 w-full rounded-lg border border-border-strong bg-bg-app px-3 text-sm text-text-primary outline-none focus:border-accent-primary"
                  >
                    <option value="all">
                      Tất cả media
                    </option>

                    <option value="primary">
                      Media chính
                    </option>

                    <option value="secondary">
                      Media phụ
                    </option>
                  </select>
                </label>
              </FilterBar>
            </div>
          </div>

          {/* RESULT INFO */}

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-text-muted">
            <p>
              Hiển thị{' '}
              <span className="font-semibold text-text-secondary">
                {filteredMedia.length === 0
                  ? 0
                  : (safePage - 1) * pageSize + 1}
                –
                {Math.min(
                  safePage * pageSize,
                  filteredMedia.length,
                )}
              </span>{' '}
              trên{' '}
              <span className="font-semibold text-text-secondary">
                {filteredMedia.length}
              </span>{' '}
              mục media
            </p>

            {hasActiveFilters && (
              <Button
                type="button"
                onClick={resetFilters}
                className="font-medium text-accent-primary hover:underline"
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>

          {/* TABLE */}

          <div className="min-w-0 overflow-x-auto px-3 pb-3 sm:px-4">
            <div className="min-w-[1000px]">
              {loading ? (
                <LoadingState />
              ) : (
                <DataTable
                  columns={columns}
                  data={paginatedMedia}
                  getRowId={(item) => item._id}
                  emptyTitle="Không tìm thấy media"
                  emptyDescription="Thử thay đổi từ khóa hoặc bộ lọc, hoặc thêm media mới."
                />
              )}
            </div>
          </div>

          {/* PAGINATION */}

          {!loading && (
            <div className="px-3 pb-4 sm:px-4">
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={filteredMedia.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                pageSizeOptions={[5, 7, 10, 20]}
              />
            </div>
          )}
        </section>

        {/* CREATE / EDIT MODAL */}

        <ProductMediaFormModal
          key={editingMedia?._id ?? 'create'}
          open={formModalOpen}
          products={products}
          editingMedia={editingMedia}
          saving={saving}
          submitError={actionError}
          onClose={closeFormModal}
          onSubmit={handleSubmit}
        />

        {/* PREVIEW MODAL */}

        <Modal
          open={previewTarget !== null}
          onClose={() => setPreviewTarget(null)}
          title="Xem trước media"
          maxWidth="lg"
        >
          {previewTarget && (
            <div className="space-y-4">
              {previewTarget.mediaType === 'image' ? (
                <img
                  src={previewTarget.mediaUrl}
                  alt={
                    previewTarget.altText ??
                    'Ảnh sản phẩm'
                  }
                  className="max-h-[60vh] w-full rounded-xl bg-bg-app object-contain"
                />
              ) : (
                <video
                  src={previewTarget.mediaUrl}
                  controls
                  className="max-h-[60vh] w-full rounded-xl bg-bg-app"
                >
                  Trình duyệt không hỗ trợ phát video.
                </video>
              )}

              <div className="space-y-2 rounded-xl border border-border-default bg-bg-app p-4">
                <div>
                  <p className="text-xs text-text-muted">
                    Sản phẩm
                  </p>

                  <p className="mt-1 text-sm font-medium text-text-primary">
                    {getProduct(
                      previewTarget.productId,
                    )?.name ??
                      'Sản phẩm không xác định'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-muted">
                    Mô tả
                  </p>

                  <p className="mt-1 break-words text-sm text-text-secondary">
                    {previewTarget.altText ||
                      'Chưa có mô tả'}
                  </p>
                </div>

                <p className="flex items-center gap-2 text-xs text-text-muted">
                  <CalendarDays size={14} />

                  Ngày thêm:{' '}
                  {formatDate(previewTarget.createdAt)}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setPreviewTarget(null)
                  }
                >
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* DELETE CONFIRMATION */}

        <ConfirmDialog
          open={deleteTarget !== null}
          title="Xóa media sản phẩm?"
          description={
            deleteTarget
              ? `Bạn có chắc muốn xóa media của sản phẩm "${getProduct(deleteTarget.productId)?.name ??
              'không xác định'
              }"? Thao tác này không thể hoàn tác.`
              : ''
          }
          confirmText="Xóa media"
          cancelText="Hủy"
          variant="danger"
          onConfirm={() => void handleDelete()}
          onCancel={() => {
            if (actionLoadingId === null) {
              setDeleteTarget(null);
            }
          }}
        />
      </div>
    </div>
  );
}