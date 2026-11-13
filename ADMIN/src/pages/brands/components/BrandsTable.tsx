import { ImageOff, Pencil, Power, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/buttons/Button';
import DataTable, { type DataTableColumn } from '../../../components/shared/DataTable';
import StatusBadge from '../../../components/shared/StatusBadge';

import type { Brand } from '../../../types/brand.types';

interface BrandsTableProps {
    brands: Brand[];
    loading: boolean;
    onEdit: (brand: Brand) => void;
    onToggleStatus: (brand: Brand) => void;
    onDelete: (brand: Brand) => void;
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

export default function BrandsTable({
    brands,
    loading,
    onEdit,
    onToggleStatus,
    onDelete,
}: BrandsTableProps) {
    const columns: DataTableColumn<Brand>[] = [
        {
            key: 'brand',
            header: 'THƯƠNG HIỆU',
            render: (brand) => (
                <div className="flex min-w-[220px] items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-bg-elevated">
                        {brand.logo ? (
                            <img
                                src={brand.logo}
                                alt={brand.name}
                                className="h-full w-full object-contain p-1"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                }}
                            />
                        ) : (
                            <ImageOff size={18} className="text-text-muted" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="truncate font-medium text-text-primary">
                            {brand.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-text-muted">
                            {brand.slug}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'MÔ TẢ',
            render: (brand) => (
                <p className="max-w-[280px] truncate text-sm text-text-secondary">
                    {brand.description || 'Chưa có mô tả'}
                </p>
            ),
        },
        {
            key: 'status',
            header: 'TRẠNG THÁI',
            render: (brand) => (
                <StatusBadge
                    status={brand.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                    variant={brand.isActive ? 'success' : 'danger'}
                />
            ),
        },
        {
            key: 'createdAt',
            header: 'NGÀY TẠO',
            render: (brand) => (
                <span className="text-sm text-text-secondary">
                    {formatDate(brand.createdAt)}
                </span>
            ),
        },
        {
            key: 'updatedAt',
            header: 'CẬP NHẬT',
            render: (brand) => (
                <span className="text-sm text-text-secondary">
                    {formatDate(brand.updatedAt)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'THAO TÁC',
            render: (brand) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        type="button"
                        variant="icon"
                        className="text-text-secondary hover:text-primary"
                        onClick={() => onEdit(brand)}
                        title="Chỉnh sửa thương hiệu"
                    >
                        <Pencil size={16} />
                    </Button>

                    <Button
                        type="button"
                        variant="icon"
                        className="text-text-secondary hover:text-warning"
                        onClick={() => onToggleStatus(brand)}
                        title={brand.isActive ? 'Ngừng hoạt động' : 'Kích hoạt'}
                    >
                        <Power size={16} />
                    </Button>

                    <Button
                        type="button"
                        variant="icon"
                        className="text-text-secondary hover:text-danger"
                        onClick={() => onDelete(brand)}
                        title="Xóa thương hiệu"
                    >
                        <Trash2 size={16} />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={brands}
            getRowId={(brand) => String(brand.id)} loading={loading}
            emptyTitle="Chưa có thương hiệu"
            emptyDescription="Thương hiệu sẽ xuất hiện tại đây sau khi được tạo."
        />
    )
}