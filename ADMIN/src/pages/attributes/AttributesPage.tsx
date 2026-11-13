
import {
  ArrowDownAZ,
  ListFilter,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Tags,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import PageHeader from '../../components/shared/PageHeader';
import Pagination from '../../components/shared/Pagination';
import StatCard from '../../components/shared/StatCard';
import { Button } from '../../components/ui/buttons/Button';
import Modal from '../../components/ui/overlays/Modal';

import { attributesService } from '../../services/catalog/attributes.service';

import type {
  AttributeFormData,
  ProductAttribute,
} from '../../types/attribute.types';

const PAGE_SIZE = 7;

type FilterValue = 'all' | 'with-values' | 'without-values';
type SortValue = 'name-asc' | 'name-desc' | 'values-desc';

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(value: string): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export default function AttributesPage() {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [sort, setSort] = useState<SortValue>('name-asc');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductAttribute | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [valuesText, setValuesText] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleting, setDeleting] = useState<ProductAttribute | null>(null);

  // =========================
  // LOAD ATTRIBUTES
  // =========================

  const loadAttributes = useCallback(async () => {
    try {
      setPageError('');

      const result = await attributesService.getAll();

      setAttributes(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Failed to load attributes:', error);
      setPageError('Không thể tải danh sách thuộc tính. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchAttributes() {
      try {
        const result = await attributesService.getAll();

        if (active) {
          setAttributes(Array.isArray(result) ? result : []);
          setPageError('');
        }
      } catch (error) {
        console.error('Failed to load attributes:', error);

        if (active) {
          setPageError(
            'Không thể tải danh sách thuộc tính. Vui lòng thử lại.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void fetchAttributes();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    attributesService
      .getAll()
      .then((result) => {
        if (!active) return;

        setAttributes(Array.isArray(result) ? result : []);
        setPageError('');
      })
      .catch((error) => {
        console.error('Failed to load attributes:', error);

        if (active) {
          setPageError(
            'Không thể tải danh sách thuộc tính. Vui lòng thử lại.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // =========================
  // STATISTICS
  // =========================

  const totalValues = useMemo(
    () =>
      attributes.reduce(
        (total, attribute) => total + (attribute.values?.length ?? 0),
        0,
      ),
    [attributes],
  );

  const attributesWithValues = useMemo(
    () =>
      attributes.filter(
        (attribute) => (attribute.values?.length ?? 0) > 0,
      ).length,
    [attributes],
  );

  // =========================
  // SEARCH / FILTER / SORT
  // =========================

  const filteredAttributes = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');

    const result = attributes.filter((attribute) => {
      const values = attribute.values ?? [];

      const matchesSearch =
        !keyword ||
        attribute.name.toLocaleLowerCase('vi').includes(keyword) ||
        attribute.slug.toLowerCase().includes(keyword) ||
        values.some((item) =>
          item.value.toLocaleLowerCase('vi').includes(keyword),
        );

      const matchesFilter =
        filter === 'all' ||
        (filter === 'with-values' && values.length > 0) ||
        (filter === 'without-values' && values.length === 0);

      return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
      if (sort === 'name-desc') {
        return b.name.localeCompare(a.name, 'vi');
      }

      if (sort === 'values-desc') {
        return (
          (b.values?.length ?? 0) - (a.values?.length ?? 0)
        );
      }

      return a.name.localeCompare(b.name, 'vi');
    });
  }, [attributes, search, filter, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAttributes.length / PAGE_SIZE),
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedAttributes = useMemo(
    () =>
      filteredAttributes.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filteredAttributes, currentPage],
  );

  // =========================
  // FORM
  // =========================

  function resetForm() {
    setEditing(null);
    setName('');
    setSlug('');
    setValuesText('');
    setSlugTouched(false);
    setFormError('');
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(attribute: ProductAttribute) {
    setEditing(attribute);
    setName(attribute.name);
    setSlug(attribute.slug);
    setValuesText(
      attribute.values?.map((item) => item.value).join('\n') ?? '',
    );
    setSlugTouched(true);
    setFormError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  }

  function handleNameChange(value: string) {
    setName(value);

    if (!slugTouched) {
      setSlug(createSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setSlug(createSlug(value));
  }

  function validateForm(
    cleanName: string,
    cleanSlug: string,
    cleanValues: string[],
  ): boolean {
    if (!cleanName || !cleanSlug) {
      setFormError('Vui lòng nhập tên và slug hợp lệ.');
      return false;
    }

    const duplicateSlug = attributes.some(
      (item) =>
        item.slug.toLowerCase() === cleanSlug.toLowerCase() &&
        item.id !== editing?.id,
    );

    if (duplicateSlug) {
      setFormError('Slug này đã được sử dụng.');
      return false;
    }

    const normalizedValues = cleanValues.map((value) =>
      value.toLocaleLowerCase('vi'),
    );

    if (new Set(normalizedValues).size !== normalizedValues.length) {
      setFormError(
        'Các giá trị trong cùng thuộc tính không được trùng nhau.',
      );
      return false;
    }

    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanSlug = createSlug(slug || cleanName);

    const cleanValues = Array.from(
      new Set(
        valuesText
          .split(/[\n,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    setFormError('');

    if (!validateForm(cleanName, cleanSlug, cleanValues)) {
      return;
    }

    const payload: AttributeFormData = {
      name: cleanName,
      slug: cleanSlug,
      values: cleanValues,
    };

    setSaving(true);

    try {
      if (editing) {
        await attributesService.update(editing.id, payload);
      } else {
        await attributesService.create(payload);
      }

      setModalOpen(false);
      resetForm();

      await loadAttributes();

      if (!editing) {
        setPage(1);
      }
    } catch (error) {
      console.error('Failed to save attribute:', error);
      setFormError(
        'Không thể lưu thuộc tính. Vui lòng kiểm tra dữ liệu và thử lại.',
      );
    } finally {
      setSaving(false);
    }
  }

  // =========================
  // DELETE
  // =========================

  async function handleDelete() {
    if (!deleting) return;

    setDeletingLoading(true);

    try {
      await attributesService.remove(deleting.id);

      setDeleting(null);

      await loadAttributes();
    } catch (error) {
      console.error('Failed to delete attribute:', error);
      setPageError('Không thể xóa thuộc tính. Vui lòng thử lại.');
    } finally {
      setDeletingLoading(false);
    }
  }

  // =========================
  // TABLE COLUMNS
  // =========================

  const columns: DataTableColumn<ProductAttribute>[] = [
    {
      key: 'name',
      header: 'THUỘC TÍNH',
      render: (attribute) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-elevated">
            <SlidersHorizontal
              size={17}
              className="text-accent-primary"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">
              {attribute.name}
            </p>

            <p className="mt-0.5 truncate text-xs text-text-muted">
              {attribute.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'values',
      header: 'GIÁ TRỊ',
      render: (attribute) => {
        const values = attribute.values ?? [];

        return (
          <div className="flex max-w-105 flex-wrap gap-1.5">
            {values.length ? (
              <>
                {values.slice(0, 4).map((item) => (
                  <span
                    key={item.id}
                    title={item.value}
                    className="max-w-28 truncate rounded-md border border-border-default bg-bg-elevated px-2 py-1 text-xs text-text-secondary"
                  >
                    {item.value}
                  </span>
                ))}

                {values.length > 4 && (
                  <span className="rounded-md bg-accent-primary/10 px-2 py-1 text-xs font-medium text-accent-primary">
                    +{values.length - 4}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-text-muted">
                Chưa có giá trị
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'count',
      header: 'SỐ GIÁ TRỊ',
      headerClassName: 'text-center',
      className: 'text-center',
      render: (attribute) => (
        <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-bg-elevated px-2 py-1 text-xs font-semibold text-text-primary">
          {attribute.values?.length ?? 0}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'CẬP NHẬT',
      render: (attribute) => (
        <span className="whitespace-nowrap text-xs text-text-secondary">
          {formatDate(attribute.updatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (attribute) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="icon"
            title="Sửa thuộc tính"
            aria-label={`Sửa ${attribute.name}`}
            onClick={() => openEdit(attribute)}
          >
            <Pencil size={16} />
          </Button>

          <Button
            type="button"
            variant="icon"
            title="Xóa thuộc tính"
            aria-label={`Xóa ${attribute.name}`}
            onClick={() => setDeleting(attribute)}
          >
            <Trash2 size={16} className="text-status-danger" />
          </Button>
        </div>
      ),
    },
  ];

  // =========================
  // RENDER
  // =========================

  return (
    <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        <PageHeader
          title="Thuộc tính sản phẩm"
          description="Quản lý thuộc tính và các giá trị dùng để phân loại biến thể sản phẩm."
          actions={
            <Button type="button" onClick={openCreate}>
              <Plus size={16} />
              Thêm thuộc tính
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Tổng thuộc tính"
            value={String(attributes.length)}
            icon={SlidersHorizontal}
            accent="primary"
          />

          <StatCard
            label="Tổng giá trị"
            value={totalValues.toLocaleString('vi-VN')}
            icon={Tags}
            accent="cyan"
          />

          <StatCard
            label="Đã có giá trị"
            value={`${attributesWithValues}/${attributes.length}`}
            icon={ListFilter}
            accent="purple"
          />
        </div>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
          <div className="flex flex-col gap-3 border-b border-border-default p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text-primary">
                Danh sách thuộc tính
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                {filteredAttributes.length} thuộc tính phù hợp
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3 xl:w-170">
              <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg border border-border-default bg-bg-app px-3 focus-within:border-accent-primary sm:col-span-3 xl:col-span-1">
                <Search size={16} className="shrink-0 text-text-muted" />

                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm thuộc tính..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
                />

                {search && (
                  <button
                    type="button"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>

              <label className="min-w-0">
                <span className="sr-only">Lọc giá trị</span>

                <select
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value as FilterValue);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-border-default bg-bg-app px-3 text-sm text-text-secondary outline-none focus:border-accent-primary"
                >
                  <option value="all">Tất cả thuộc tính</option>
                  <option value="with-values">Có giá trị</option>
                  <option value="without-values">Chưa có giá trị</option>
                </select>
              </label>

              <label className="relative min-w-0">
                <span className="sr-only">Sắp xếp</span>

                <ArrowDownAZ
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
                />

                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as SortValue)
                  }
                  className="h-10 w-full appearance-none rounded-lg border border-border-default bg-bg-app pl-8 pr-2 text-sm text-text-secondary outline-none focus:border-accent-primary"
                >
                  <option value="name-asc">Tên A–Z</option>
                  <option value="name-desc">Tên Z–A</option>
                  <option value="values-desc">Nhiều giá trị</option>
                </select>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-default px-3 py-3 text-xs text-text-muted sm:px-4">
            <span>
              <strong className="text-text-primary">
                {attributes.length}
              </strong>{' '}
              thuộc tính
            </span>

            <span>
              <strong className="text-text-primary">
                {totalValues}
              </strong>{' '}
              giá trị
            </span>

            <span>
              <strong className="text-text-primary">
                {attributes.length - attributesWithValues}
              </strong>{' '}
              thuộc tính chưa có giá trị
            </span>
          </div>

          {pageError && (
            <div
              role="alert"
              className="m-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger"
            >
              {pageError}
              <button
                type="button"
                onClick={() => void loadAttributes()}
                className="ml-2 font-semibold underline"
              >
                Tải lại
              </button>
            </div>
          )}

          <div className="min-w-0 px-3 pb-2 sm:px-4">
            {loading ? (
              <div className="flex min-h-36 items-center justify-center gap-3 text-sm text-text-secondary">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border-strong border-t-accent-primary" />
                Đang tải danh sách thuộc tính...
              </div>
            ) : (
              <DataTable<ProductAttribute>
                columns={columns}
                data={paginatedAttributes}
                getRowId={(attribute) => attribute.id}
                emptyTitle="Không tìm thấy thuộc tính"
                emptyDescription="Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc."
                className="min-w-0"
              />
            )}
          </div>

          <div className="px-3 pb-4 sm:px-4">
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filteredAttributes.length}
              onPageChange={setPage}
              pageSizeOptions={[PAGE_SIZE]}
            />
          </div>
        </section>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Chỉnh sửa thuộc tính' : 'Thêm thuộc tính'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Tên thuộc tính <span className="text-status-danger">*</span>
            </span>

            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ví dụ: Màu sắc"
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Slug <span className="text-status-danger">*</span>
            </span>

            <input
              required
              maxLength={120}
              value={slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="mau-sac"
              disabled={saving}
              className="h-10 w-full rounded-lg border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
            />

            <span className="mt-1 block text-xs text-text-muted">
              Tự tạo từ tên thuộc tính; có thể chỉnh sửa.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">
              Giá trị thuộc tính
            </span>

            <textarea
              rows={5}
              value={valuesText}
              onChange={(event) => setValuesText(event.target.value)}
              placeholder={'Trắng\nĐen\nXám\nĐỏ'}
              disabled={saving}
              className="w-full resize-y rounded-lg border border-border-default bg-bg-app px-3 py-2.5 text-sm leading-6 text-text-primary outline-none placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
            />

            <span className="mt-1 block text-xs leading-5 text-text-muted">
              Mỗi dòng là một giá trị riêng. Ví dụ, thuộc tính Màu sắc có
              thể gồm Trắng, Đen và Xám.
            </span>
          </label>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger"
            >
              {formError}
            </p>
          )}

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
              {editing ? 'Lưu thay đổi' : 'Thêm thuộc tính'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Xóa thuộc tính"
        description={
          deleting
            ? `Bạn có chắc muốn xóa "${deleting.name}" cùng ${(deleting.values ?? []).length} giá trị liên quan? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmText="Xóa thuộc tính"
        cancelText="Hủy"
        variant="danger"
        loading={deletingLoading}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deletingLoading) setDeleting(null);
        }}
      />
    </div>
  );
}
