
import { useState } from 'react';
import {
    AlertCircle,
    CheckCircle2,
    CircleOff,
    Edit,
    Image as ImageIcon,
    Layers3,
    Package,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';

import type { ProductVariant } from '../../../types/product-variant.types';

import { Button } from '../../../components/ui/buttons/Button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../../components/ui/data-display/Table';
import { Input } from '../../../components/ui/forms/Input';
import { Select } from '../../../components/ui/forms/Select';
import { Switch } from '../../../components/ui/forms/Switch';
import Badge from '../../../components/ui/data-display/Badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/data-display/Card';

import PageHeader from '../../../components/shared/PageHeader';
import StatCard from '../../../components/shared/StatCard';
import FilterBar from '../../../components/shared/FilterBar';
import SearchBar from '../../../components/shared/SearchBar';
import StatusBadge from '../../../components/shared/StatusBadge';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import Modal from '../../../components/ui/overlays/Modal';

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

interface Props {
    variants: ProductVariant[];
    products: ProductOption[];
    productNameMap: Map<string, string>;

    stats: {
        total: number;
        active: number;
        inactive: number;
        lowStock: number;
        outOfStock: number;
    };

    loading: boolean;
    submitting: boolean;
    actionId: string | null;
    error: string;

    search: string;
    productFilter: string;
    statusFilter: string;
    stockFilter: string;

    page: number;
    totalPages: number;
    totalItems: number;

    modalOpen: boolean;
    editingVariant: ProductVariant | null;
    formValues: VariantFormValues;
    deleteTarget: ProductVariant | null;

    onSearchChange: (value: string) => void;
    onProductFilterChange: (value: string) => void;
    onStatusFilterChange: (value: string) => void;
    onStockFilterChange: (value: string) => void;
    onResetFilters: () => void;

    onPageChange: (page: number) => void;
    onRefresh: () => void;

    onCreate: () => void;
    onEdit: (variant: ProductVariant) => void;
    onToggleStatus: (variant: ProductVariant) => void;
    onUpdateStock: (variant: ProductVariant, stock: number) => void;

    onDeleteRequest: (variant: ProductVariant) => void;
    onDeleteCancel: () => void;
    onDeleteConfirm: () => void;

    onFormChange: (values: VariantFormValues) => void;
    onFormSubmit: () => void;
    onModalClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCurrency(value: number): string {
    if (!Number.isFinite(value)) {
        return '0 ₫';
    }

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

function parseCurrencyInput(value: string): string {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
        return '';
    }

    return digits.replace(/^0+(?=\d)/, '');
}

function formatCurrencyInput(value: string): string {
    const digits = parseCurrencyInput(value);

    if (!digits) {
        return '';
    }

    const number = Number(digits);

    if (!Number.isFinite(number)) {
        return '';
    }

    return new Intl.NumberFormat('vi-VN', {
        maximumFractionDigits: 0,
    }).format(number);
}

function getStockInfo(stock: number) {
    if (stock <= 0) {
        return {
            label: 'Hết hàng',
            variant: 'danger' as const,
        };
    }

    if (stock <= 10) {
        return {
            label: 'Sắp hết',
            variant: 'warning' as const,
        };
    }

    return {
        label: 'Còn hàng',
        variant: 'success' as const,
    };
}

/* -------------------------------------------------------------------------- */
/* Variant image                                                              */
/* -------------------------------------------------------------------------- */

function VariantImage({
    src,
    alt,
    size = 'table',
}: {
    src?: string | null;
    alt: string;
    size?: 'table' | 'preview';
}) {
    const [imageError, setImageError] = useState(false);

    const sizeClass =
        size === 'preview'
            ? 'h-28 w-28'
            : 'h-12 w-12';

    const hasImage = Boolean(src?.trim()) && !imageError;

    return (
        <div
            className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-bg-elevated`}
        >
            {hasImage ? (
                <img
                    src={src!.trim()}
                    alt={alt}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-text-muted">
                    <ImageIcon
                        size={size === 'preview' ? 27 : 19}
                        strokeWidth={1.5}
                    />

                    {size === 'preview' && (
                        <span className="text-[10px]">
                            Chưa có ảnh
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function VariantManagement(props: Props) {
    const {
        variants,
        products,
        productNameMap,
        stats,
        loading,
        submitting,
        actionId,
        error,
        search,
        productFilter,
        statusFilter,
        stockFilter,
        page,
        totalPages,
        totalItems,
        modalOpen,
        editingVariant,
        formValues,
        deleteTarget,
        onSearchChange,
        onProductFilterChange,
        onStatusFilterChange,
        onStockFilterChange,
        onResetFilters,
        onPageChange,
        onRefresh,
        onCreate,
        onEdit,
        onToggleStatus,
        onDeleteRequest,
        onDeleteCancel,
        onDeleteConfirm,
        onFormChange,
        onFormSubmit,
        onModalClose,
    } = props;

    const hasFilters =
        search.trim() !== '' ||
        productFilter !== 'all' ||
        statusFilter !== 'all' ||
        stockFilter !== 'all';

    function updateField<K extends keyof VariantFormValues>(
        key: K,
        value: VariantFormValues[K],
    ) {
        onFormChange({
            ...formValues,
            [key]: value,
        });
    }

    const imageUrl = formValues.image.trim();

    function handleCurrencyChange(
        key: 'price' | 'compareAtPrice',
        value: string,
    ) {
        updateField(key, parseCurrencyInput(value));
    }

    const productFilterOptions = [
        { value: 'all', label: 'Tất cả sản phẩm' },
        ...products.map((product) => ({
            value: product.id,
            label: product.name,
        })),
    ];

    const statusFilterOptions = [
        { value: 'all', label: 'Tất cả trạng thái' },
        { value: 'active', label: 'Đang hoạt động' },
        { value: 'inactive', label: 'Ngừng hoạt động' },
    ];

    const stockFilterOptions = [
        { value: 'all', label: 'Tất cả tồn kho' },
        { value: 'available', label: 'Còn hàng' },
        { value: 'low', label: 'Sắp hết hàng' },
        { value: 'out', label: 'Hết hàng' },
    ];

    const productOptions = [
        { value: '', label: 'Chọn sản phẩm' },
        ...products.map((product) => ({
            value: product.id,
            label: product.name,
        })),
    ];

    return (
        <div className="min-w-0 space-y-6 p-4 sm:p-6 lg:p-8">
            <PageHeader
                title="Quản lý biến thể sản phẩm"
                description="Quản lý SKU, hình ảnh, giá bán và số lượng tồn kho của từng biến thể."
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={onRefresh}
                            loading={loading}
                            disabled={submitting}
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? 'animate-spin' : ''}
                            />
                            <span className="ml-2">Làm mới</span>
                        </Button>

                        <Button
                            variant="primary"
                            onClick={onCreate}
                            disabled={products.length === 0 || submitting}
                        >
                            <Plus size={17} />
                            <span className="ml-2">Thêm biến thể</span>
                        </Button>
                    </div>
                }
            />

            {error && !modalOpen && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-4"
                >
                    <AlertCircle
                        size={19}
                        className="mt-0.5 shrink-0 text-status-danger"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-status-danger">
                            Không thể hoàn tất thao tác
                        </p>

                        <p className="mt-1 break-words text-sm text-text-secondary">
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Tổng biến thể"
                    value={String(stats.total)}
                    icon={Layers3}
                    accent="primary"
                />

                <StatCard
                    label="Đang hoạt động"
                    value={String(stats.active)}
                    icon={CheckCircle2}
                    accent="cyan"
                />

                <StatCard
                    label="Sắp hết hàng"
                    value={String(stats.lowStock)}
                    icon={Package}
                    accent="warning"
                />

                <StatCard
                    label="Ngừng hoạt động"
                    value={String(stats.inactive)}
                    icon={CircleOff}
                    accent="purple"
                />
            </div>

            {/* Variant table */}
            <Card className="overflow-hidden">
                <CardHeader>
                    <div className="mb-4 flex flex-col gap-1">
                        <h2 className="font-semibold text-text-primary">
                            Danh sách biến thể
                        </h2>

                        <p className="text-sm text-text-secondary">
                            Có {totalItems} biến thể phù hợp với bộ lọc hiện tại.
                        </p>
                    </div>

                    <FilterBar
                        onReset={onResetFilters}
                        showReset={hasFilters}
                    >
                        <div className="w-full min-w-0 flex-1 sm:min-w-64">
                            <SearchBar
                                value={search}
                                onChange={onSearchChange}
                                placeholder="Tìm theo SKU hoặc tên sản phẩm..."
                            />
                        </div>

                        <div className="w-full sm:w-52">
                            <Select
                                value={productFilter}
                                onChange={(event) =>
                                    onProductFilterChange(event.target.value)
                                }
                                options={productFilterOptions}
                                aria-label="Lọc theo sản phẩm"
                            />
                        </div>

                        <div className="w-full sm:w-44">
                            <Select
                                value={statusFilter}
                                onChange={(event) =>
                                    onStatusFilterChange(event.target.value)
                                }
                                options={statusFilterOptions}
                                aria-label="Lọc trạng thái"
                            />
                        </div>

                        <div className="w-full sm:w-40">
                            <Select
                                value={stockFilter}
                                onChange={(event) =>
                                    onStockFilterChange(event.target.value)
                                }
                                options={stockFilterOptions}
                                aria-label="Lọc tồn kho"
                            />
                        </div>
                    </FilterBar>
                </CardHeader>

                <CardBody className="p-0">
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-20">Ảnh</TableHead>
                                    <TableHead className="min-w-40">SKU</TableHead>
                                    <TableHead className="min-w-52">Sản phẩm</TableHead>
                                    <TableHead className="min-w-36">Giá bán</TableHead>
                                    <TableHead className="min-w-32">Tồn kho</TableHead>
                                    <TableHead className="min-w-40">Trạng thái</TableHead>
                                    <TableHead className="min-w-36 text-right">
                                        Thao tác
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-text-secondary">
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
                                                Đang tải danh sách biến thể...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : variants.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7}>
                                            <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
                                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-bg-elevated text-text-muted">
                                                    <Search size={22} />
                                                </div>

                                                <p className="font-medium text-text-primary">
                                                    {hasFilters
                                                        ? 'Không tìm thấy biến thể'
                                                        : 'Chưa có biến thể sản phẩm'}
                                                </p>

                                                <p className="mt-1 max-w-md text-sm text-text-secondary">
                                                    {hasFilters
                                                        ? 'Thử thay đổi từ khóa hoặc bộ lọc để xem kết quả khác.'
                                                        : 'Hãy thêm biến thể đầu tiên để quản lý SKU, giá và tồn kho.'}
                                                </p>

                                                {hasFilters && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={onResetFilters}
                                                        className="mt-3"
                                                    >
                                                        Xóa bộ lọc
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    variants.map((variant) => {
                                        const stock = Number(
                                            variant.stockQuantity ?? 0,
                                        );

                                        const stockInfo = getStockInfo(stock);
                                        const busy = actionId === variant._id;

                                        return (
                                            <TableRow key={variant._id}>
                                                <TableCell>
                                                    <VariantImage
                                                        key={`${variant._id}-${variant.image ?? ''}`}
                                                        src={variant.image}
                                                        alt={variant.sku}
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <span className="font-mono text-sm font-semibold text-text-primary">
                                                        {variant.sku || '—'}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="max-w-64">
                                                        <p className="truncate text-sm font-medium text-text-primary">
                                                            {productNameMap.get(
                                                                String(variant.productId),
                                                            ) ?? 'Sản phẩm không xác định'}
                                                        </p>

                                                        <p className="mt-1 text-xs text-text-muted">
                                                            ID: {String(variant.productId).slice(-8)}
                                                        </p>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm font-semibold tabular-nums text-text-primary">
                                                            {formatCurrency(
                                                                Number(variant.price ?? 0),
                                                            )}
                                                        </p>

                                                        {variant.compareAtPrice != null && (
                                                            <p className="mt-0.5 text-xs tabular-nums text-text-muted line-through">
                                                                {formatCurrency(
                                                                    Number(variant.compareAtPrice),
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        <span className="text-sm font-semibold tabular-nums text-text-primary">
                                                            {stock.toLocaleString('vi-VN')}
                                                        </span>

                                                        <Badge
                                                            variant={stockInfo.variant}
                                                            dot
                                                        >
                                                            {stockInfo.label}
                                                        </Badge>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <StatusBadge
                                                        status={
                                                            variant.isActive
                                                                ? 'Active'
                                                                : 'Inactive'
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="icon"
                                                            onClick={() => onEdit(variant)}
                                                            disabled={busy || submitting}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit size={16} />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="icon"
                                                            onClick={() => onToggleStatus(variant)}
                                                            disabled={busy || submitting}
                                                            title={
                                                                variant.isActive
                                                                    ? 'Ngừng hoạt động'
                                                                    : 'Kích hoạt'
                                                            }
                                                            className={
                                                                variant.isActive
                                                                    ? 'text-status-danger hover:bg-status-danger/10'
                                                                    : 'text-status-success hover:bg-status-success/10'
                                                            }
                                                        >
                                                            {busy ? (
                                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
                                                            ) : variant.isActive ? (
                                                                <CircleOff size={16} />
                                                            ) : (
                                                                <CheckCircle2 size={17} />
                                                            )}
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="icon"
                                                            onClick={() => onDeleteRequest(variant)}
                                                            disabled={busy || submitting}
                                                            title="Xóa biến thể"
                                                            className="text-status-danger hover:bg-status-danger/10"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardBody>

                {!loading && totalItems > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-border-default p-4 sm:flex-row">
                        <p className="text-sm text-text-secondary">
                            Trang{' '}
                            <span className="font-semibold text-text-primary">
                                {page}
                            </span>
                            {' / '}
                            <span className="font-semibold text-text-primary">
                                {Math.max(totalPages, 1)}
                            </span>
                            {' · '}
                            {totalItems} biến thể
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onPageChange(page - 1)}
                                disabled={page <= 1}
                            >
                                Trước
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => onPageChange(page + 1)}
                                disabled={page >= totalPages}
                            >
                                Sau
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Create / Update modal */}
            <Modal
                open={modalOpen}
                onClose={onModalClose}
                title={
                    editingVariant
                        ? 'Cập nhật biến thể'
                        : 'Thêm biến thể'
                }
                maxWidth="lg"
            >
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        onFormSubmit();
                    }}
                    className="flex max-h-[calc(100dvh-8rem)] min-h-0 flex-col"
                >
                    {/* Scrollable content */}
                    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-2 pb-4">
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-status-danger/30 bg-status-danger/10 p-3"
                            >
                                <AlertCircle
                                    size={18}
                                    className="mt-0.5 shrink-0 text-status-danger"
                                />

                                <p className="break-words text-sm text-status-danger">
                                    {error}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {!editingVariant && (
                                <div className="sm:col-span-2">
                                    <Select
                                        label="Sản phẩm"
                                        options={productOptions}
                                        value={formValues.productId}
                                        onChange={(event) =>
                                            updateField('productId', event.target.value)
                                        }
                                        required
                                        disabled={submitting}
                                    />
                                </div>
                            )}

                            <Input
                                label="SKU"
                                value={formValues.sku}
                                onChange={(event) =>
                                    updateField(
                                        'sku',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="VD: AO-THUN-RED-M"
                                required
                                maxLength={100}
                                disabled={submitting}
                            />

                            <Input
                                label="Giá bán"
                                hint="Đơn vị: VNĐ. Ví dụ: 1.500.000"
                                type="text"
                                inputMode="numeric"
                                value={formatCurrencyInput(formValues.price)}
                                onChange={(event) =>
                                    handleCurrencyChange(
                                        'price',
                                        event.target.value,
                                    )
                                }
                                rightElement={
                                    <span className="text-xs font-semibold text-text-muted">
                                        VNĐ
                                    </span>
                                }
                                className="text-right font-semibold tabular-nums"
                                placeholder="0"
                                required
                                disabled={submitting}
                                autoComplete="off"
                            />

                            <Input
                                label="Giá so sánh"
                                hint="Không bắt buộc. Dùng để hiển thị giá gốc."
                                type="text"
                                inputMode="numeric"
                                value={formatCurrencyInput(formValues.compareAtPrice)}
                                onChange={(event) =>
                                    handleCurrencyChange(
                                        'compareAtPrice',
                                        event.target.value,
                                    )
                                }
                                rightElement={
                                    <span className="text-xs font-semibold text-text-muted">
                                        VNĐ
                                    </span>
                                }
                                className="text-right tabular-nums"
                                placeholder="0"
                                disabled={submitting}
                                autoComplete="off"
                            />

                            <Input
                                label="Số lượng tồn kho"
                                type="number"
                                min="0"
                                step="1"
                                value={formValues.stockQuantity}
                                onChange={(event) =>
                                    updateField('stockQuantity', event.target.value)
                                }
                                required
                                disabled={submitting}
                            />

                            <Input
                                label="Khối lượng"
                                hint="Đơn vị: gram. Không bắt buộc."
                                type="number"
                                min="0"
                                step="any"
                                value={formValues.weight}
                                onChange={(event) =>
                                    updateField('weight', event.target.value)
                                }
                                rightElement={
                                    <span className="text-xs font-semibold text-text-muted">
                                        Gram
                                    </span>
                                }
                                placeholder="0"
                                disabled={submitting}
                            />

                            {/* Image URL */}
                            <div className="sm:col-span-2">
                                <Input
                                    label="URL hình ảnh"
                                    hint="Nhập đường dẫn ảnh công khai (https://...). Backend hiện lưu URL ảnh dạng chuỗi, không upload file trực tiếp."
                                    type="url"
                                    value={formValues.image}
                                    onChange={(event) =>
                                        updateField('image', event.target.value)
                                    }
                                    placeholder="https://example.com/image.jpg"
                                    maxLength={500}
                                    disabled={submitting}
                                />
                            </div>

                            {/* Image preview */}
                            <div className="sm:col-span-2">
                                <Card variant="elevated">
                                    <CardBody>
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">
                                                    Xem trước hình ảnh
                                                </p>

                                                <p className="mt-1 text-xs text-text-muted">
                                                    Ảnh sẽ được hiển thị trong danh sách biến thể.
                                                </p>
                                            </div>

                                            {imageUrl && (
                                                <Badge variant="info">
                                                    Đã nhập URL
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                                            <VariantImage
                                                key={imageUrl}
                                                src={imageUrl}
                                                alt="Xem trước hình ảnh biến thể"
                                                size="preview"
                                            />

                                            <div className="min-w-0 flex-1">
                                                {imageUrl ? (
                                                    <>
                                                        <p className="text-sm font-medium text-text-primary">
                                                            Đường dẫn ảnh
                                                        </p>

                                                        <p className="mt-1 break-all text-xs leading-5 text-text-secondary">
                                                            {imageUrl}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-text-muted">
                                                        Chưa có hình ảnh. Nhập URL để xem trước ảnh tại đây.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </div>

                            {/* Active status */}
                            <div className="sm:col-span-2">
                                <div
                                    className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-all duration-200 ${formValues.isActive
                                            ? 'border-status-success/30 bg-status-success/5'
                                            : 'border-status-danger/30 bg-status-danger/5'
                                        }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-text-primary">
                                                Trạng thái biến thể
                                            </p>

                                            <StatusBadge
                                                status={
                                                    formValues.isActive
                                                        ? 'Active'
                                                        : 'Inactive'
                                                }
                                            />
                                        </div>

                                        <p className="mt-1 text-xs leading-5 text-text-secondary">
                                            {formValues.isActive
                                                ? 'Biến thể đang hoạt động và có thể được hiển thị, kinh doanh.'
                                                : 'Biến thể đang tạm ngừng và không được hiển thị để kinh doanh.'}
                                        </p>
                                    </div>

                                    <Switch
                                        checked={formValues.isActive}
                                        onChange={(event) =>
                                            updateField(
                                                'isActive',
                                                event.target.checked,
                                            )
                                        }
                                        disabled={submitting}
                                        aria-label="Kích hoạt biến thể"
                                        className={
                                            formValues.isActive
                                                ? '[&>div>div:first-child]:!bg-status-success'
                                                : '[&>div>div:first-child]:!bg-status-danger'
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fixed footer */}
                    <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-border-default bg-bg-surface pt-4 sm:flex-row">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onModalClose}
                            disabled={submitting}
                        >
                            Hủy
                        </Button>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={submitting}
                            disabled={submitting}
                        >
                            {editingVariant
                                ? 'Lưu thay đổi'
                                : 'Tạo biến thể'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Xóa biến thể"
                description={
                    deleteTarget
                        ? `Bạn có chắc chắn muốn xóa biến thể "${deleteTarget.sku}"? Thao tác này không thể hoàn tác.`
                        : ''
                }
                confirmText="Xóa biến thể"
                cancelText="Hủy"
                onConfirm={onDeleteConfirm}
                onCancel={onDeleteCancel}
                loading={actionId === deleteTarget?._id}
                variant="danger"
            />
        </div>
    );
}
