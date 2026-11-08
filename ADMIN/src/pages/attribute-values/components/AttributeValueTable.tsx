import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '../../../components/ui/buttons/Button';
import DataTable, {
    type DataTableColumn,
} from '../../../components/shared/DataTable';

import type { AttributeValue } from '../../../types/attribute-value.types';

interface AttributeValueTableProps {
    items: AttributeValue[];
    attributeNames: Record<string, string>;
    loading: boolean;
    onEdit: (item: AttributeValue) => void;
    onDelete: (item: AttributeValue) => void;
}

export default function AttributeValueTable({
    items,
    attributeNames,
    loading,
    onEdit,
    onDelete,
}: AttributeValueTableProps) {
    const columns: DataTableColumn<AttributeValue>[] = [
        {
            key: 'value',
            header: 'Giá trị',
            render: (item) => (
                <div className="min-w-0">
                    <p className="font-medium text-text-primary">{item.value}</p>
                    <p className="mt-0.5 text-xs text-text-muted">
                        ID: {item.id}
                    </p>
                </div>
            ),
        },
        {
            key: 'attribute',
            header: 'Thuộc tính',
            render: (item) => (
                <span className="inline-flex rounded-md border border-border-default bg-bg-elevated px-2.5 py-1 text-xs text-text-secondary">
                    {attributeNames[item.attributeId] ?? 'Không xác định'}
                </span>
            ),
        },
        {
            key: 'slug',
            header: 'Slug',
            render: (item) => (
                <span className="break-all font-mono text-xs text-text-secondary">
                    {item.slug}
                </span>
            ),
        },
        {
            key: 'updatedAt',
            header: 'Cập nhật',
            render: (item) => (
                <span className="text-sm text-text-secondary">
                    {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleDateString('vi-VN')
                        : '—'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (item) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-9! w-9! p-0!"
                        onClick={() => onEdit(item)}
                        aria-label={`Sửa ${item.value}`}
                    >
                        <Pencil size={16} />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        className="h-9! w-9! p-0! text-status-danger"
                        onClick={() => onDelete(item)}
                        aria-label={`Xóa ${item.value}`}
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
            data={items}
            getRowId={(item) => item.id}
            emptyTitle={loading ? 'Đang tải dữ liệu...' : 'Chưa có giá trị thuộc tính'}
            emptyDescription="Thêm giá trị mới hoặc thay đổi bộ lọc tìm kiếm."
        />
    );
}