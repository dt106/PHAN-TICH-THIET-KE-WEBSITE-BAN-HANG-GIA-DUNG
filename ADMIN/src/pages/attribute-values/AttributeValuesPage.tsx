import {
    ListFilter,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import PageHeader from '../../components/shared/PageHeader';
import StatCard from '../../components/shared/StatCard';
import Pagination from '../../components/shared/Pagination';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { Button } from '../../components/ui/buttons/Button';

import AttributeValueFormModal from './components/AttributeValueFormModal';
import AttributeValueTable from './components/AttributeValueTable';

import { attributesService } from '../../services/catalog/attributes.service';
import { attributeValuesService } from '../../services/catalog/attributeValues.service';

import type { ProductAttribute } from '../../types/attribute.types';
import type {
    AttributeValue,
    AttributeOption,
    AttributeValueFormData,
} from '../../types/attribute-value.types';

const PAGE_SIZE = 7;

const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-app px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent-primary';

export default function AttributeValuesPage() {
    const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
    const [items, setItems] = useState<AttributeValue[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [pageError, setPageError] = useState('');

    const [search, setSearch] = useState('');
    const [attributeFilter, setAttributeFilter] = useState('all');
    const [page, setPage] = useState(1);

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<AttributeValue | null>(null);
    const [deleteTarget, setDeleteTarget] =
        useState<AttributeValue | null>(null);

    // =========================
    // ATTRIBUTE OPTIONS
    // =========================

    const attributeOptions = useMemo<AttributeOption[]>(
        () =>
            attributes.map((attribute) => ({
                id: attribute.id,
                name: attribute.name,
                slug: attribute.slug,
            })),
        [attributes],
    );

    const attributeNames = useMemo<Record<string, string>>(
        () =>
            Object.fromEntries(
                attributes.map((attribute) => [
                    attribute.id,
                    attribute.name,
                ]),
            ),
        [attributes],
    );

    // =========================
    // LOAD DATA
    // =========================

    const loadData = useCallback(async () => {
        try {
            const result = await attributesService.getAll();

            const safeAttributes = Array.isArray(result) ? result : [];

            setAttributes(safeAttributes);

            const allValues = safeAttributes.flatMap((attribute) =>
                Array.isArray(attribute.values) ? attribute.values : [],
            );

            setItems(allValues);
            setPageError('');
        } catch (error) {
            console.error('Failed to load attribute values:', error);

            setPageError(
                'Không thể tải danh sách giá trị thuộc tính. Vui lòng thử lại.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    // Tải dữ liệu ban đầu.
    // Không gọi loadData trực tiếp trong effect để tránh lỗi set-state-in-effect.
    useEffect(() => {
        let active = true;

        attributesService
            .getAll()
            .then((result) => {
                if (!active) return;

                const safeAttributes = Array.isArray(result) ? result : [];

                setAttributes(safeAttributes);

                const allValues = safeAttributes.flatMap((attribute) =>
                    Array.isArray(attribute.values) ? attribute.values : [],
                );

                setItems(allValues);
                setPageError('');
            })
            .catch((error) => {
                console.error('Failed to load attribute values:', error);

                if (active) {
                    setPageError(
                        'Không thể tải danh sách giá trị thuộc tính. Vui lòng thử lại.',
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
    // SEARCH & FILTER
    // =========================

    const filteredItems = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase('vi');

        return items.filter((item) => {
            const attributeName =
                attributeNames[item.attributeId] ?? '';

            const matchesSearch =
                item.value.toLocaleLowerCase('vi').includes(keyword) ||
                item.slug.toLocaleLowerCase('vi').includes(keyword) ||
                attributeName.toLocaleLowerCase('vi').includes(keyword);

            const matchesAttribute =
                attributeFilter === 'all' ||
                item.attributeId === attributeFilter;

            return matchesSearch && matchesAttribute;
        });
    }, [items, search, attributeFilter, attributeNames]);

    // =========================
    // PAGINATION
    // =========================

    const paginatedItems = useMemo(
        () =>
            filteredItems.slice(
                (page - 1) * PAGE_SIZE,
                page * PAGE_SIZE,
            ),
        [filteredItems, page],
    );

    // =========================
    // STATISTICS
    // =========================

    const totalValues = items.length;

    const usedAttributes = new Set(
        items.map((item) => item.attributeId),
    ).size;

    const visibleValues = filteredItems.length;

    // =========================
    // MODAL
    // =========================

    const openCreate = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const openEdit = (item: AttributeValue) => {
        setEditing(item);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditing(null);
    };

    // =========================
    // CREATE / UPDATE
    // =========================

    const handleSave = async (payload: AttributeValueFormData) => {
        const cleanValue = payload.value.trim();

        const duplicate = items.some(
            (item) =>
                item.attributeId === payload.attributeId &&
                item.value.toLocaleLowerCase('vi') ===
                cleanValue.toLocaleLowerCase('vi') &&
                item.id !== editing?.id,
        );

        if (duplicate) {
            throw new Error(
                'Giá trị này đã tồn tại trong thuộc tính đã chọn.',
            );
        }

        try {
            setSaving(true);

            if (editing) {
                await attributeValuesService.update(editing.id, {
                    value: cleanValue,
                });
            } else {
                await attributeValuesService.create(payload.attributeId, {
                    value: cleanValue,
                });
            }

            setModalOpen(false);
            setEditing(null);
            setPage(1);

            await loadData();
        } catch (error) {
            console.error('Failed to save attribute value:', error);

            throw error instanceof Error
                ? error
                : new Error('Không thể lưu giá trị thuộc tính.');
        } finally {
            setSaving(false);
        }
    };
    // =========================
    // DELETE
    // =========================

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            setDeleting(true);

            await attributeValuesService.remove(deleteTarget.id);

            setDeleteTarget(null);

            await loadData();

            setPage((currentPage) =>
                Math.min(
                    currentPage,
                    Math.max(1, Math.ceil((items.length - 1) / PAGE_SIZE)),
                ),
            );
        } catch (error) {
            console.error('Failed to delete attribute value:', error);

            setPageError(
                error instanceof Error
                    ? error.message
                    : 'Không thể xóa giá trị thuộc tính.',
            );
        } finally {
            setDeleting(false);
        }
    };

    // =========================
    // RESET FILTER
    // =========================

    const resetFilters = () => {
        setSearch('');
        setAttributeFilter('all');
        setPage(1);
    };

    // =========================
    // RENDER
    // =========================

    return (
        <div className="min-h-full bg-bg-app p-4 text-text-primary sm:p-5 xl:p-6">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
                <PageHeader
                    eyebrow="QUẢN LÝ SẢN PHẨM"
                    title="Giá trị thuộc tính"
                    description="Quản lý màu sắc, kích thước, dung tích và các lựa chọn của sản phẩm."
                    actions={
                        <Button
                            type="button"
                            onClick={openCreate}
                            disabled={attributeOptions.length === 0}
                        >
                            <Plus size={16} />
                            Thêm giá trị
                        </Button>
                    }
                />

                {pageError && (
                    <div className="flex flex-col gap-3 rounded-xl border border-status-danger/30 bg-bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-status-danger">{pageError}</p>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setLoading(true);
                                void loadData();
                            }}
                        >
                            <RotateCcw size={15} />
                            Thử lại
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <StatCard
                        label="Tổng giá trị"
                        value={String(totalValues)}
                        icon={ListFilter}
                        accent="primary"
                    />

                    <StatCard
                        label="Thuộc tính đang sử dụng"
                        value={String(usedAttributes)}
                        icon={SlidersHorizontal}
                        accent="cyan"
                    />

                    <StatCard
                        label="Giá trị đang hiển thị"
                        value={String(visibleValues)}
                        icon={Search}
                        accent="purple"
                    />
                </div>

                <section className="min-w-0 overflow-hidden rounded-xl border border-border-default bg-bg-surface">
                    <div className="flex flex-col gap-3 border-b border-border-default p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="font-semibold text-text-primary">
                                Danh sách giá trị
                            </h2>

                            <p className="mt-1 text-xs text-text-muted">
                                Tìm thấy {filteredItems.length} giá trị thuộc tính
                            </p>
                        </div>

                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row xl:w-auto">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                                />

                                <input
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Tìm giá trị, slug..."
                                    className={`${inputClass} pl-9`}
                                />
                            </div>

                            <select
                                value={attributeFilter}
                                onChange={(event) => {
                                    setAttributeFilter(event.target.value);
                                    setPage(1);
                                }}
                                className={`${inputClass} sm:w-48`}
                                aria-label="Lọc theo thuộc tính"
                            >
                                <option value="all">Tất cả thuộc tính</option>

                                {attributeOptions.map((attribute) => (
                                    <option key={attribute.id} value={attribute.id}>
                                        {attribute.name}
                                    </option>
                                ))}
                            </select>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={resetFilters}
                                aria-label="Đặt lại bộ lọc"
                            >
                                <RotateCcw size={15} />
                                Đặt lại
                            </Button>
                        </div>
                    </div>

                    <div className="min-w-0 px-3 pb-2 sm:px-4">
                        {loading ? (
                            <div className="py-12 text-center text-sm text-text-muted">
                                Đang tải dữ liệu...
                            </div>
                        ) : (
                            <AttributeValueTable
                                items={paginatedItems}
                                attributeNames={attributeNames}
                                loading={loading}
                                onEdit={openEdit}
                                onDelete={setDeleteTarget}
                            />
                        )}
                    </div>

                    <div className="px-3 pb-4 sm:px-4">
                        <Pagination
                            page={page}
                            pageSize={PAGE_SIZE}
                            total={filteredItems.length}
                            onPageChange={setPage}
                            onPageSizeChange={() => setPage(1)}
                            pageSizeOptions={[PAGE_SIZE]}
                        />
                    </div>
                </section>
            </div>

            <AttributeValueFormModal
                open={modalOpen}
                loading={saving}
                attributes={attributeOptions}
                editing={editing}
                onClose={closeModal}
                onSubmit={handleSave}
            />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Xóa giá trị thuộc tính?"
                description={`Bạn có chắc muốn xóa "${deleteTarget?.value ?? ''}"? Thao tác này không thể hoàn tác.`}
                confirmText="Xóa giá trị"
                cancelText="Hủy"
                variant="danger"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => {
                    if (!deleting) setDeleteTarget(null);
                }}
            />
        </div>
    );
}