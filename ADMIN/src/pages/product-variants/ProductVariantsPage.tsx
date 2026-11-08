import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { productsService } from '../../services/catalog/products.service';
import { productVariantsService } from '../../services/catalog/productVariants.service';

import VariantManagement from './components/VariantManagement';

import type {
  ProductVariant,
  ProductVariantPayload,
} from '../../types/product-variant.types';

const PAGE_SIZE = 10;
const LOW_STOCK_THRESHOLD = 10;

type ProductOption = {
  id: string;
  name: string;
};

type VariantFormValues = {
  productId: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  weight: string;
  image: string;
  isActive: boolean;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

/* -------------------------------------------------------------------------- */
/* API response helpers                                                       */
/* -------------------------------------------------------------------------- */

function getErrorMessage(error: unknown): string {
  if (!isRecord(error)) {
    return error instanceof Error
      ? error.message
      : 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }

  const response = isRecord(error.response)
    ? error.response
    : null;

  const responseData =
    response && isRecord(response.data)
      ? response.data
      : null;

  if (responseData) {
    // Lỗi validate từ express-validator.
    if (Array.isArray(responseData.errors)) {
      const messages = responseData.errors
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }

          if (isRecord(item)) {
            if (typeof item.msg === 'string') {
              return item.msg;
            }

            if (typeof item.message === 'string') {
              return item.message;
            }
          }

          return '';
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return [...new Set(messages)].join('. ');
      }
    }

    // Lỗi nghiệp vụ từ backend.
    if (typeof responseData.message === 'string') {
      return responseData.message;
    }

    if (typeof responseData.error === 'string') {
      return responseData.error;
    }

    // Một số API bọc thêm data.
    if (isRecord(responseData.data)) {
      if (typeof responseData.data.message === 'string') {
        return responseData.data.message;
      }

      if (typeof responseData.data.error === 'string') {
        return responseData.data.error;
      }
    }
  }

  if (typeof error.message === 'string') {
    return error.message;
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function normalizeVariantResponse(
  response: unknown,
): ProductVariant[] {
  if (Array.isArray(response)) {
    return response as ProductVariant[];
  }

  if (!isRecord(response)) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data as ProductVariant[];
  }

  if (Array.isArray(response.variants)) {
    return response.variants as ProductVariant[];
  }

  if (isRecord(response.data)) {
    if (Array.isArray(response.data.variants)) {
      return response.data.variants as ProductVariant[];
    }

    if (Array.isArray(response.data.data)) {
      return response.data.data as ProductVariant[];
    }
  }

  return [];
}

function normalizeProductResponse(
  response: unknown,
): ProductOption[] {
  let data: unknown[] = [];

  if (Array.isArray(response)) {
    data = response;
  } else if (isRecord(response)) {
    if (Array.isArray(response.data)) {
      data = response.data;
    } else if (Array.isArray(response.products)) {
      data = response.products;
    } else if (isRecord(response.data)) {
      if (Array.isArray(response.data.products)) {
        data = response.data.products;
      } else if (Array.isArray(response.data.data)) {
        data = response.data.data;
      }
    }
  }

  return data
    .filter(isRecord)
    .map((item) => ({
      id: String(item._id ?? item.id ?? ''),
      name: String(item.name ?? 'Sản phẩm không tên'),
    }))
    .filter((product) => product.id !== '');
}

/* -------------------------------------------------------------------------- */
/* Form helpers                                                               */
/* -------------------------------------------------------------------------- */

function getInitialForm(productId = ''): VariantFormValues {
  return {
    productId,
    sku: '',
    price: '',
    compareAtPrice: '',
    stockQuantity: '0',
    weight: '',
    image: '',
    isActive: true,
  };
}

function toFormValues(
  variant: ProductVariant,
): VariantFormValues {
  return {
    productId: String(variant.productId ?? ''),
    sku: variant.sku ?? '',
    price: String(variant.price ?? ''),
    compareAtPrice:
      variant.compareAtPrice == null
        ? ''
        : String(variant.compareAtPrice),
    stockQuantity: String(variant.stockQuantity ?? 0),
    weight:
      variant.weight == null
        ? ''
        : String(variant.weight),
    image: variant.image ?? '',
    isActive: variant.isActive ?? true,
  };
}

/**
 * Chuyển dữ liệu form về đúng payload backend.
 *
 * Giá nhập trong UI có thể hiển thị dạng 1.500.000,
 * nhưng form lưu chuỗi số 1500000.
 *
 * productId truyền qua URL, không gửi trong body.
 */
function toPayload(
  values: VariantFormValues,
): ProductVariantPayload {
  return {
    sku: values.sku.trim().toUpperCase(),
    price: Number(values.price),
    compareAtPrice:
      values.compareAtPrice.trim() === ''
        ? null
        : Number(values.compareAtPrice),
    stockQuantity: Number(values.stockQuantity),
    weight:
      values.weight.trim() === ''
        ? null
        : Number(values.weight),
    image: values.image.trim() || null,
    isActive: values.isActive,
  };
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProductVariantsPage() {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] =
    useState<ProductVariant | null>(null);

  const [formValues, setFormValues] =
    useState<VariantFormValues>(getInitialForm());

  const [deleteTarget, setDeleteTarget] =
    useState<ProductVariant | null>(null);

  const mountedRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Load data                                                              */
  /* ---------------------------------------------------------------------- */

  const loadProducts = useCallback(
    async (): Promise<ProductOption[]> => {
      const response = await productsService.getAdminProducts({
        page: 1,
        limit: 100,
      });

      const productOptions =
        normalizeProductResponse(response);

      if (mountedRef.current) {
        setProducts(productOptions);
      }

      return productOptions;
    },
    [],
  );

  const loadVariants = useCallback(
    async (productOptions: ProductOption[]) => {
      if (!mountedRef.current) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (productOptions.length === 0) {
          setVariants([]);
          return;
        }

        const responses = await Promise.all(
          productOptions.map((product) =>
            productVariantsService.getByProduct(
              product.id,
            ),
          ),
        );

        const allVariants = responses.flatMap(
          normalizeVariantResponse,
        );

        if (mountedRef.current) {
          setVariants(allVariants);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;

    async function initialize() {
      setLoading(true);
      setError('');

      try {
        const productOptions = await loadProducts();

        if (!mountedRef.current) {
          return;
        }

        await loadVariants(productOptions);
      } catch (err) {
        if (mountedRef.current) {
          setError(getErrorMessage(err));
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mountedRef.current = false;
    };
  }, [loadProducts, loadVariants]);

  const productNameMap = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product.name,
        ]),
      ),
    [products],
  );

  const refreshVariants = useCallback(
    () => loadVariants(products),
    [loadVariants, products],
  );

  /* ---------------------------------------------------------------------- */
  /* Search and filters                                                     */
  /* ---------------------------------------------------------------------- */

  const filteredVariants = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return variants.filter((variant) => {
      const productName =
        productNameMap.get(
          String(variant.productId),
        ) ?? '';

      const matchesSearch =
        !keyword ||
        String(variant.sku ?? '')
          .toLowerCase()
          .includes(keyword) ||
        productName.toLowerCase().includes(keyword);

      const matchesProduct =
        productFilter === 'all' ||
        String(variant.productId) === productFilter;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active'
          ? variant.isActive
          : !variant.isActive);

      const stock = Number(
        variant.stockQuantity ?? 0,
      );

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'out' && stock <= 0) ||
        (stockFilter === 'low' &&
          stock > 0 &&
          stock <= LOW_STOCK_THRESHOLD) ||
        (stockFilter === 'available' &&
          stock > LOW_STOCK_THRESHOLD);

      return (
        matchesSearch &&
        matchesProduct &&
        matchesStatus &&
        matchesStock
      );
    });
  }, [
    variants,
    search,
    productFilter,
    statusFilter,
    stockFilter,
    productNameMap,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredVariants.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedVariants = useMemo(
    () =>
      filteredVariants.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [
      filteredVariants,
      currentPage,
    ],
  );

  /* ---------------------------------------------------------------------- */
  /* Statistics                                                             */
  /* ---------------------------------------------------------------------- */

  const stats = useMemo(
    () => ({
      total: variants.length,

      active: variants.filter(
        (variant) => variant.isActive,
      ).length,

      inactive: variants.filter(
        (variant) => !variant.isActive,
      ).length,

      lowStock: variants.filter((variant) => {
        const stock = Number(
          variant.stockQuantity ?? 0,
        );

        return (
          stock > 0 &&
          stock <= LOW_STOCK_THRESHOLD
        );
      }).length,

      outOfStock: variants.filter(
        (variant) =>
          Number(variant.stockQuantity ?? 0) <= 0,
      ).length,
    }),
    [variants],
  );

  /* ---------------------------------------------------------------------- */
  /* Form actions                                                           */
  /* ---------------------------------------------------------------------- */

  function resetFilters() {
    setSearch('');
    setProductFilter('all');
    setStatusFilter('all');
    setStockFilter('all');
    setPage(1);
  }

  function resetForm() {
    setFormValues(
      getInitialForm(products[0]?.id ?? ''),
    );
  }

  function openCreateModal() {
    setEditingVariant(null);

    setFormValues(
      getInitialForm(products[0]?.id ?? ''),
    );

    setError('');
    setModalOpen(true);
  }

  function openEditModal(variant: ProductVariant) {
    setEditingVariant(variant);
    setFormValues(toFormValues(variant));
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setModalOpen(false);
    setEditingVariant(null);
    setError('');
    resetForm();
  }

  /* ---------------------------------------------------------------------- */
  /* Create / update                                                        */
  /* ---------------------------------------------------------------------- */

  async function handleSubmit() {
    const sku = formValues.sku.trim();
    const price = Number(formValues.price);

    const compareAtPrice =
      formValues.compareAtPrice.trim() === ''
        ? null
        : Number(formValues.compareAtPrice);

    const stock = Number(formValues.stockQuantity);

    const weight =
      formValues.weight.trim() === ''
        ? null
        : Number(formValues.weight);

    // Product
    if (!editingVariant && !formValues.productId) {
      setError('Vui lòng chọn sản phẩm.');
      return;
    }

    // SKU
    if (!sku) {
      setError('SKU không được để trống.');
      return;
    }

    if (sku.length > 100) {
      setError('SKU không được vượt quá 100 ký tự.');
      return;
    }

    // Price
    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        'Giá bán phải là số lớn hơn hoặc bằng 0.',
      );
      return;
    }

    if (
      compareAtPrice !== null &&
      (
        !Number.isFinite(compareAtPrice) ||
        compareAtPrice < 0
      )
    ) {
      setError(
        'Giá so sánh phải là số không âm.',
      );
      return;
    }

    // Stock
    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setError(
        'Số lượng tồn kho phải là số nguyên không âm.',
      );
      return;
    }

    // Weight
    if (
      weight !== null &&
      (
        !Number.isFinite(weight) ||
        weight < 0
      )
    ) {
      setError(
        'Khối lượng phải là số không âm.',
      );
      return;
    }

    // Image URL
    const image = formValues.image.trim();

    if (image.length > 500) {
      setError(
        'URL hình ảnh không được vượt quá 500 ký tự.',
      );
      return;
    }

    if (
      image !== '' &&
      !/^https?:\/\/\S+$/i.test(image)
    ) {
      setError(
        'URL hình ảnh phải bắt đầu bằng http:// hoặc https://.',
      );
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = toPayload(formValues);

      if (editingVariant) {
        await productVariantsService.update(
          editingVariant._id,
          payload,
        );
      } else {
        await productVariantsService.create(
          formValues.productId,
          payload,
        );
      }

      // Chỉ đóng dialog khi API thành công.
      setModalOpen(false);
      setEditingVariant(null);
      setError('');
      resetForm();

      // Tải lại danh sách sau khi tạo/cập nhật.
      await refreshVariants();
    } catch (err) {
      // Giữ dialog mở để người dùng sửa dữ liệu.
      setError(getErrorMessage(err));
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Status                                                                 */
  /* ---------------------------------------------------------------------- */

  async function handleToggleStatus(
    variant: ProductVariant,
  ) {
    setActionId(variant._id);
    setError('');

    try {
      await productVariantsService.updateStatus(
        variant._id,
        {
          isActive: !variant.isActive,
        },
      );

      await refreshVariants();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (mountedRef.current) {
        setActionId(null);
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Stock                                                                  */
  /* ---------------------------------------------------------------------- */

  async function handleUpdateStock(
    variant: ProductVariant,
    stockQuantity: number,
  ) {
    if (
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      setError(
        'Tồn kho phải là số nguyên không âm.',
      );
      return;
    }

    setActionId(variant._id);
    setError('');

    try {
      await productVariantsService.updateStock(
        variant._id,
        {
          stockQuantity,
        },
      );

      await refreshVariants();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (mountedRef.current) {
        setActionId(null);
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Delete                                                                 */
  /* ---------------------------------------------------------------------- */

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setActionId(deleteTarget._id);
    setError('');

    try {
      await productVariantsService.remove(
        deleteTarget._id,
      );

      setDeleteTarget(null);

      await refreshVariants();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (mountedRef.current) {
        setActionId(null);
      }
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <VariantManagement
      variants={paginatedVariants}
      products={products}
      productNameMap={productNameMap}
      stats={stats}
      loading={loading}
      submitting={submitting}
      actionId={actionId}
      error={error}
      search={search}
      productFilter={productFilter}
      statusFilter={statusFilter}
      stockFilter={stockFilter}
      page={currentPage}
      totalPages={totalPages}
      totalItems={filteredVariants.length}
      modalOpen={modalOpen}
      editingVariant={editingVariant}
      formValues={formValues}
      deleteTarget={deleteTarget}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onProductFilterChange={(value) => {
        setProductFilter(value);
        setPage(1);
      }}
      onStatusFilterChange={(value) => {
        setStatusFilter(value);
        setPage(1);
      }}
      onStockFilterChange={(value) => {
        setStockFilter(value);
        setPage(1);
      }}
      onResetFilters={resetFilters}
      onPageChange={setPage}
      onRefresh={refreshVariants}
      onCreate={openCreateModal}
      onEdit={openEditModal}
      onToggleStatus={handleToggleStatus}
      onUpdateStock={handleUpdateStock}
      onDeleteRequest={(variant) => {
        setError('');
        setDeleteTarget(variant);
      }}
      onDeleteCancel={() => setDeleteTarget(null)}
      onDeleteConfirm={handleDelete}
      onFormChange={setFormValues}
      onFormSubmit={handleSubmit}
      onModalClose={closeModal}
    />
  );
}