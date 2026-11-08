
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';

import PageHeader from '../../components/shared/PageHeader';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/buttons/Button';

import { productsService } from '../../services/catalog/products.service';
import { productVariantsService } from '../../services/catalog/productVariants.service';
import { attributesService } from '../../services/catalog/attributes.service';
import { variantAttributesService } from '../../services/catalog/variantAttributes.service';

import type { Product } from '../../types/product.types';
import type {
  ProductVariant,
  VariantAttributePayload,
} from '../../types/product-variant.types';
import type { ProductAttribute } from '../../types/attribute.types';
import type {
  VariantAttribute,
  VariantAttributeFormData,
} from '../../types/variant-attribute.types';

import {
  VariantAttributeFormModal,
  type VariantOption,
} from './components/VariantAttributeFormModal';
import { VariantAttributeTable } from './components/VariantAttributeTable';

interface VariantEntry {
  productId: string;
  productName: string;
  variant: ProductVariant;
}

const PAGE_SIZE = 7;

function getProductId(product: Product): string {
  return product.id || product._id || '';
}

function getVariantId(variant: ProductVariant): string {
  return variant.id || variant._id || '';
}

function getReferenceId(
  value:
    | string
    | {
      id?: string;
      _id?: string;
    },
): string {
  if (typeof value === 'string') return value;
  return value.id || value._id || '';
}

function getAttributeName(
  attributeId: string,
  attributes: ProductAttribute[],
): string {
  return (
    attributes.find(
      (item) => getReferenceId(item) === attributeId,
    )?.name ?? ''
  );
}

function getAttributeValue(
  attributeId: string,
  attributeValueId: string,
  attributes: ProductAttribute[],
): string {
  const attribute = attributes.find(
    (item) => getReferenceId(item) === attributeId,
  );

  return (
    attribute?.values?.find(
      (item) => getReferenceId(item) === attributeValueId,
    )?.value ?? ''
  );
}

/**
 * Chuẩn hóa response API về dạng mảng.
 * Hỗ trợ:
 * - [...]
 * - { data: [...] }
 * - { data: { products: [...] } }
 * - { data: { variants: [...] } }
 * - { data: { data: [...] } }
 */
function extractArray<T>(
  response: unknown,
  keys: string[],
  depth = 0,
): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (
    !response ||
    typeof response !== 'object' ||
    depth > 5
  ) {
    return [];
  }

  const object = response as Record<string, unknown>;

  for (const key of keys) {
    if (Array.isArray(object[key])) {
      return object[key] as T[];
    }
  }

  for (const key of ['data', 'result', 'results']) {
    const nested = object[key];

    if (nested && typeof nested === 'object') {
      const result = extractArray<T>(
        nested,
        keys,
        depth + 1,
      );

      if (result.length > 0) {
        return result;
      }
    }
  }

  return [];
}

export default function VariantAttributesPage() {
  const [entries, setEntries] = useState<VariantEntry[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [items, setItems] = useState<VariantAttribute[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [filterAttributeId, setFilterAttributeId] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VariantAttribute | null>(null);
  const [deletingItem, setDeletingItem] = useState<VariantAttribute | null>(
    null,
  );

  // Tải sản phẩm, thuộc tính và biến thể theo từng sản phẩm.
  const loadData = useCallback(async () => {
    try {
      setError('');

      // 1. Tải sản phẩm và thuộc tính song song.
      const [productResponse, attributeResponse] = await Promise.all([
        productsService.getAdminProducts({
          page: 1,
          limit: 100,
        }),
        attributesService.getAll(),
      ]);

      // 2. Chuẩn hóa response sản phẩm.
      const products = extractArray<Product>(
        productResponse,
        ['products', 'items'],
      );

      // 3. Chuẩn hóa response thuộc tính.
      const attributeList = extractArray<ProductAttribute>(
        attributeResponse,
        ['attributes', 'items'],
      );

      console.log('[Variant Attributes] Product response:', productResponse);
      console.log('[Variant Attributes] Attribute response:', attributeResponse);
      console.log('[Variant Attributes] Products:', products);
      console.log('[Variant Attributes] Attributes:', attributeList);

      // 4. Tải biến thể của từng sản phẩm.
      // Dùng allSettled để một sản phẩm lỗi không làm dừng toàn bộ.
      const productResults = await Promise.allSettled(
        products.map(async (product) => {
          const productId = getProductId(product);

          if (!productId) {
            return [];
          }

          const variantResponse =
            await productVariantsService.getByProduct(productId);

          const variants = extractArray<ProductVariant>(
            variantResponse,
            ['variants', 'items'],
          );

          return variants.map((variant) => ({
            productId,
            productName: product.name,
            variant,
          }));
        }),
      );

      const allEntries: VariantEntry[] = [];
      const failedProducts: string[] = [];

      productResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allEntries.push(...result.value);
        } else {
          const productName =
            products[index]?.name ?? 'Không xác định';

          failedProducts.push(productName);

          console.error(
            `[Variant Attributes] Không tải được biến thể của ${productName}:`,
            result.reason,
          );
        }
      });

      // 5. Lấy toàn bộ biến thể.
      const allVariants = allEntries.map(
        (entry) => entry.variant,
      );

      // 6. Lấy danh sách thuộc tính đã gán cho biến thể.
      const assignments =
        variantAttributesService.getFromVariants(allVariants);

      // 7. Tạo Map để tìm sản phẩm theo ID biến thể.
      const entryByVariantId = new Map(
        allEntries.map((entry) => [
          getVariantId(entry.variant),
          entry,
        ]),
      );

      // 8. Chuyển dữ liệu API thành dữ liệu hiển thị trên bảng.
      const mappedItems: VariantAttribute[] = assignments.map(
        (assignment) => {
          const entry = entryByVariantId.get(
            assignment.variantId,
          );

          return {
            id: `${assignment.variantId}:${assignment.attributeId}`,
            variantId: assignment.variantId,
            attributeId: assignment.attributeId,
            attributeValueId: assignment.attributeValueId,

            productName: entry?.productName ?? '',
            variantSku: assignment.variantSku,

            attributeName:
              assignment.attributeName ||
              getAttributeName(
                assignment.attributeId,
                attributeList,
              ),

            attributeValue:
              assignment.attributeValue ||
              getAttributeValue(
                assignment.attributeId,
                assignment.attributeValueId,
                attributeList,
              ),
          };
        },
      );

      // 9. Cập nhật state.
      setEntries(allEntries);
      setAttributes(attributeList);
      setItems(mappedItems);

      if (failedProducts.length > 0) {
        setError(
          `Không tải được biến thể của ${failedProducts.length} sản phẩm: ${failedProducts.join(', ')}`,
        );
      }

      // 10. Log kiểm tra dữ liệu.
      console.log('[Variant Attributes] Entries:', allEntries);
      console.log('[Variant Attributes] All variants:', allVariants);
      console.log('[Variant Attributes] Assignments:', assignments);
      console.log('[Variant Attributes] Table items:', mappedItems);
    } catch (loadError) {
      console.error(
        'Failed to load variant attributes:',
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Không thể tải dữ liệu thuộc tính biến thể.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };

    fetchData().catch((error) => {
      console.error(
        'Failed to initialize variant attributes:',
        error,
      );
    });
  }, [loadData]);

  // Danh sách biến thể cho form.
  const variantOptions = useMemo<VariantOption[]>(
    () =>
      entries.map((entry) => ({
        id: getVariantId(entry.variant),
        productName: entry.productName,
        sku: entry.variant.sku,
      })),
    [entries],
  );

  // Tìm kiếm và lọc dữ liệu.
  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi');

    return items.filter((item) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [
          item.productName,
          item.variantSku,
          item.attributeName,
          item.attributeValue,
        ].some((value) =>
          value.toLocaleLowerCase('vi').includes(normalizedKeyword),
        );

      const matchesAttribute =
        !filterAttributeId || item.attributeId === filterAttributeId;

      return matchesKeyword && matchesAttribute;
    });
  }, [items, keyword, filterAttributeId]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, page]);

  // Thống kê.
  const assignedVariantIds = useMemo(
    () => new Set(items.map((item) => item.variantId)),
    [items],
  );

  const usedAttributeIds = useMemo(
    () => new Set(items.map((item) => item.attributeId)),
    [items],
  );

  const stats = [
    {
      label: 'Tổng lượt gán thuộc tính',
      value: items.length,
    },
    {
      label: 'Biến thể đã được gán',
      value: assignedVariantIds.size,
    },
    {
      label: 'Thuộc tính đang sử dụng',
      value: usedAttributeIds.size,
    },
    {
      label: 'Biến thể chưa được gán',
      value: entries.filter(
        (entry) => !assignedVariantIds.has(getVariantId(entry.variant)),
      ).length,
    },
  ];

  const openCreateModal = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (item: VariantAttribute) => {
    setEditing(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
  };

  // Chuyển dữ liệu attributes hiện tại thành payload API.
  const getCurrentAttributePayload = (
    variant: ProductVariant,
  ): VariantAttributePayload[] =>
    (variant.attributes ?? [])
      .map((item) => ({
        attributeId: getReferenceId(item.attributeId),
        attributeValueId: getReferenceId(item.attributeValueId),
      }))
      .filter((item) => item.attributeId && item.attributeValueId);

  // Thêm hoặc sửa thuộc tính thông qua API cập nhật biến thể.
  const handleSave = async (payload: VariantAttributeFormData) => {
    const entry = entries.find(
      (item) => getVariantId(item.variant) === payload.variantId,
    );

    if (!entry) {
      throw new Error('Không tìm thấy biến thể sản phẩm.');
    }

    const currentAttributes = getCurrentAttributePayload(entry.variant);

    // Khi sửa, bỏ liên kết cũ trước khi thêm liên kết mới.
    const attributesWithoutEditing = currentAttributes.filter(
      (item) =>
        !(
          editing &&
          item.attributeId === editing.attributeId
        ),
    );

    // Một biến thể không được gán trùng một thuộc tính.
    const duplicate = attributesWithoutEditing.some(
      (item) => item.attributeId === payload.attributeId,
    );

    if (duplicate) {
      throw new Error(
        'Biến thể này đã được gán thuộc tính đang chọn.',
      );
    }

    const nextAttributes: VariantAttributePayload[] = [
      ...attributesWithoutEditing,
      {
        attributeId: payload.attributeId,
        attributeValueId: payload.attributeValueId,
      },
    ];

    try {
      setSaving(true);

      await productVariantsService.update(
        getVariantId(entry.variant),
        {
          attributes: nextAttributes,
        },
      );

      setModalOpen(false);
      setEditing(null);

      await loadData();
    } catch (saveError) {
      console.error('Failed to save variant attribute:', saveError);

      throw saveError instanceof Error
        ? saveError
        : new Error('Không thể lưu thuộc tính biến thể.');
    } finally {
      setSaving(false);
    }
  };

  // Xóa một thuộc tính khỏi danh sách gán của biến thể.
  const handleDelete = async () => {
    if (!deletingItem) return;

    const entry = entries.find(
      (item) => getVariantId(item.variant) === deletingItem.variantId,
    );

    if (!entry) {
      setError('Không tìm thấy biến thể cần cập nhật.');
      setDeletingItem(null);
      return;
    }

    try {
      setDeleting(true);

      const currentAttributes = getCurrentAttributePayload(entry.variant);

      const nextAttributes = currentAttributes.filter(
        (item) => item.attributeId !== deletingItem.attributeId,
      );

      await productVariantsService.update(
        getVariantId(entry.variant),
        {
          attributes: nextAttributes,
        },
      );

      setDeletingItem(null);

      await loadData();
    } catch (deleteError) {
      console.error('Failed to delete variant attribute:', deleteError);

      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Không thể xóa thuộc tính biến thể.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        eyebrow="QUẢN LÝ SẢN PHẨM"
        title="Thuộc tính biến thể"
        description="Quản lý các thuộc tính và giá trị được gán cho từng biến thể sản phẩm."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            <span>Thêm thuộc tính</span>
          </Button>
        }
      />

      {/* Thống kê */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border-default bg-bg-surface p-5"
          >
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="mt-3 text-2xl font-semibold text-text-primary">
              {stat.value.toLocaleString('vi-VN')}
            </p>
          </div>
        ))}
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-default bg-bg-surface p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />

          <input
            type="text"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            placeholder="Tìm sản phẩm, SKU, thuộc tính hoặc giá trị..."
            className="h-11 w-full rounded-xl border border-border-default bg-bg-elevated pl-10 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary"
          />
        </div>

        <div className="flex items-center gap-2 lg:w-[260px]">
          <SlidersHorizontal
            size={17}
            className="shrink-0 text-text-muted"
          />

          <select
            value={filterAttributeId}
            onChange={(event) => {
              setFilterAttributeId(event.target.value);
              setPage(1);
            }}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary"
          >
            <option value="">Tất cả thuộc tính</option>

            {attributes.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lỗi tải dữ liệu */}
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-status-danger">{error}</p>

          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadData()}
          >
            Thử tải lại
          </Button>
        </div>
      )}

      {/* Bảng dữ liệu */}
      <div className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
        <div className="flex flex-col gap-1 border-b border-border-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">
              Danh sách thuộc tính biến thể
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Các thuộc tính đã được gán cho biến thể sản phẩm.
            </p>
          </div>

          <span className="text-sm text-text-muted">
            {filteredItems.length.toLocaleString('vi-VN')} kết quả
          </span>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
              Đang tải dữ liệu...
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated text-text-muted">
              <Search size={21} />
            </div>

            <p className="font-medium text-text-primary">
              Không tìm thấy thuộc tính biến thể
            </p>

            <p className="mt-1 max-w-md text-sm text-text-muted">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc, hoặc thêm thuộc tính
              cho một biến thể sản phẩm.
            </p>
          </div>
        ) : (
          <>
            <VariantAttributeTable
              data={paginatedItems}
              onEdit={openEditModal}
              onDelete={setDeletingItem}
            />

            <div className="border-t border-border-default px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">
                  Hiển thị{' '}
                  {Math.min((page - 1) * PAGE_SIZE + 1, filteredItems.length)}
                  {' – '}
                  {Math.min(page * PAGE_SIZE, filteredItems.length)}
                  {' trong '}
                  {filteredItems.length} kết quả
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    Trước
                  </Button>

                  <span className="min-w-[90px] text-center text-sm text-text-secondary">
                    Trang {page} / {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal thêm / sửa */}
      {modalOpen && (
        <VariantAttributeFormModal
          key={editing?.id ?? 'create'}
          open={modalOpen}
          editing={editing}
          variants={variantOptions}
          attributes={attributes}
          loading={saving}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      )}

      {/* Xác nhận xóa */}
      <ConfirmDialog
        open={Boolean(deletingItem)}
        title="Xóa thuộc tính biến thể?"
        description={
          deletingItem
            ? `Bạn có chắc chắn muốn xóa thuộc tính "${deletingItem.attributeName}" với giá trị "${deletingItem.attributeValue}" khỏi biến thể ${deletingItem.variantSku}?`
            : ''
        }
        confirmText="Xóa thuộc tính"
        cancelText="Hủy"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeletingItem(null);
        }}
      />
    </div>
  );
}
