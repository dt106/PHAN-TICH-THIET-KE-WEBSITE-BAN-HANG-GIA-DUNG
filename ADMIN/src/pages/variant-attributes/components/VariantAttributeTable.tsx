import { Pencil, Trash2 } from 'lucide-react';

import DataTable from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/buttons/Button';

import type { VariantAttribute } from '../../../types/variant-attribute.types';

interface VariantAttributeTableProps {
    data: VariantAttribute[];
    onEdit: (item: VariantAttribute) => void;
    onDelete: (item: VariantAttribute) => void;
}

export function VariantAttributeTable({
    data,
    onEdit,
    onDelete,
}: VariantAttributeTableProps) {
    const columns = [
        {
            key: 'product',
            header: 'SẢN PHẨM',
            className: 'min-w-[220px]',
            render: (item: VariantAttribute) => (
                <div className="min-w-0">
                    <p className="truncate font-medium text-text-primary">
                        {item.productName || 'Sản phẩm không xác định'}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                        Biến thể: {item.variantSku || '—'}
                    </p>
                </div>
            ),
        },
        {
            key: 'attribute',
            header: 'THUỘC TÍNH',
            className: 'min-w-[170px]',
            render: (item: VariantAttribute) => (
                <span className="inline-flex rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-sm text-text-secondary">
                    {item.attributeName || 'Không xác định'}
                </span>
            ),
        },
        {
            key: 'value',
            header: 'GIÁ TRỊ',
            className: 'min-w-[160px]',
            render: (item: VariantAttribute) => (
                <span className="font-medium text-accent-primary">
                    {item.attributeValue || 'Không xác định'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'THAO TÁC',
            headerClassName: 'text-right',
            className: 'w-[120px] text-right',
            render: (item: VariantAttribute) => (
                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="icon"
                        onClick={() => onEdit(item)}
                        title="Chỉnh sửa thuộc tính"
                        aria-label="Chỉnh sửa thuộc tính"
                    >
                        <Pencil size={16} />
                    </Button>

                    <Button
                        type="button"
                        variant="icon"
                        onClick={() => onDelete(item)}
                        title="Xóa thuộc tính"
                        aria-label="Xóa thuộc tính"
                    >
                        <Trash2 size={16} className="text-status-danger" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={data}
            getRowId={(item) => item.id}
        />
    );
}