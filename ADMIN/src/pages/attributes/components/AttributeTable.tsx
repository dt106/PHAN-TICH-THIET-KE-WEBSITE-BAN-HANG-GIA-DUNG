
import { Pencil, Trash2 } from 'lucide-react';

import DataTable, {
    type DataTableColumn,
} from '../../../components/shared/DataTable';

import { Button } from '../../../components/ui/buttons/Button';

import type { ProductAttribute } from '../../../types/attribute.types';

interface AttributeTableProps {
    attributes: ProductAttribute[];
    loading?: boolean;
    onEdit: (attribute: ProductAttribute) => void;
    onDelete: (attribute: ProductAttribute) => void;
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

export default function AttributeTable({
    attributes,
    loading = false,
    onEdit,
    onDelete,
}: AttributeTableProps) {
    const columns: DataTableColumn<ProductAttribute>[] = [
        {
            key: 'name',
            header: 'Thuộc tính',
            render: (attribute) => (
                <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-medium text-text-primary">
                        {attribute.name}
                    </span>
                    <span className="text-xs text-text-muted">
                        {attribute.slug}
                    </span>
                </div>
            ),
        },
        {
            key: 'values',
            header: 'Giá trị thuộc tính',
            render: (attribute) => (
                <div className="flex max-w-md flex-wrap gap-1.5">
                    {attribute.values?.length ? (
                        <>
                            {attribute.values.slice(0, 4).map((value) => (
                                <span
                                    key={value.id}
                                    className="rounded-md border border-border-default bg-bg-elevated px-2 py-1 text-xs text-text-secondary"
                                >
                                    {value.value}
                                </span>
                            ))}

                            {attribute.values.length > 4 && (
                                <span className="rounded-md bg-bg-hover px-2 py-1 text-xs text-text-muted">
                                    +{attribute.values.length - 4}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-sm text-text-muted">
                            Chưa có giá trị
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'valueCount',
            header: 'Số giá trị',
            render: (attribute) => (
                <span className="font-medium tabular-nums text-text-primary">
                    {attribute.values?.length ?? 0}
                </span>
            ),
        },
        {
            key: 'updatedAt',
            header: 'Cập nhật lần cuối',
            render: (attribute) => (
                <span className="text-sm text-text-secondary">
                    {formatDate(attribute.updatedAt)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (attribute) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="icon"
                        onClick={() => onEdit(attribute)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="icon"
                        onClick={() => onDelete(attribute)}
                    >
                        <Trash2 className="h-4 w-4 text-status-danger" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={attributes}
            getRowId={(attribute) => attribute.id}
            loading={loading}
            emptyTitle="Chưa có thuộc tính"
            emptyDescription="Hãy thêm thuộc tính đầu tiên cho sản phẩm."
        />
    );
}
