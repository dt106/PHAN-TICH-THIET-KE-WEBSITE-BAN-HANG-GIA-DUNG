import { Package, ShoppingBag } from 'lucide-react';

import type { OrderItem } from '../../../types/order-item.types';

interface OrderItemsTableProps {
    items: OrderItem[];
    loading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
});

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

export default function OrderItemsTable({
    items,
    loading = false,
}: OrderItemsTableProps) {
    const totalQuantity = items.reduce(
        (total, item) => total + item.quantity,
        0,
    );

    const subtotal = items.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
    );

    const totalDiscount = items.reduce(
        (total, item) => total + item.discountAmount,
        0,
    );

    const totalAfterDiscount = items.reduce(
        (total, item) => total + item.totalPrice,
        0,
    );

    return (
        <section className="min-w-0 overflow-hidden rounded-card border border-border-default bg-bg-surface">
            <div className="flex flex-col gap-3 border-b border-border-default p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-accent-primary">
                        <ShoppingBag size={19} />
                    </div>

                    <div className="min-w-0">
                        <h2 className="font-semibold text-text-primary">
                            Sản phẩm trong đơn hàng
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                            Sản phẩm, phân loại và giá trị từng dòng
                        </p>
                    </div>
                </div>

                {!loading && (
                    <span className="w-fit rounded-lg bg-bg-elevated px-3 py-2 text-sm text-text-secondary">
                        {items.length} dòng · {totalQuantity} sản phẩm
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-4 p-5">
                    <div className="h-5 w-1/3 animate-pulse rounded bg-bg-elevated" />
                    <div className="h-14 animate-pulse rounded bg-bg-elevated" />
                    <div className="h-14 animate-pulse rounded bg-bg-elevated" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                    <ShoppingBag size={30} className="mb-3 text-text-muted" />
                    <p className="font-medium text-text-primary">
                        Đơn hàng chưa có sản phẩm
                    </p>
                    <p className="mt-1 text-sm text-text-muted">
                        API chưa trả về sản phẩm thuộc đơn hàng này.
                    </p>
                </div>
            ) : (
                <>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[700px] text-sm">
                            <thead className="bg-bg-app text-text-muted">
                                <tr>
                                    <th className="px-5 py-3 text-left font-medium">
                                        Sản phẩm
                                    </th>
                                    <th className="px-3 py-3 text-center font-medium">
                                        SL
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        Đơn giá
                                    </th>
                                    <th className="px-3 py-3 text-right font-medium">
                                        Giảm giá
                                    </th>
                                    <th className="px-5 py-3 text-right font-medium">
                                        Thành tiền
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border-default">
                                {items.map((item) => (
                                    <tr
                                        key={item._id}
                                        className="transition-colors hover:bg-bg-hover/50"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex min-w-[220px] items-start gap-3">
                                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-app text-accent-primary">
                                                    <Package size={18} />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="wrap-break-word font-medium text-text-primary">
                                                        {item.productName}
                                                    </p>

                                                    {item.productSku && (
                                                        <p className="mt-1 text-xs text-text-muted">
                                                            SKU: {item.productSku}
                                                        </p>
                                                    )}

                                                    {item.variantSku && (
                                                        <p className="mt-1 text-xs text-text-muted">
                                                            SKU biến thể: {item.variantSku}
                                                        </p>
                                                    )}

                                                    {item.variantAttributes && (
                                                        <p className="mt-1 wrap-break-word text-xs leading-5 text-text-secondary">
                                                            {item.variantAttributes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-4 text-center text-text-primary">
                                            {item.quantity}
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-4 text-right text-text-secondary">
                                            {formatCurrency(item.unitPrice)}
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-4 text-right">
                                            {item.discountAmount > 0 ? (
                                                <span className="text-status-success">
                                                    −{formatCurrency(item.discountAmount)}
                                                </span>
                                            ) : (
                                                <span className="text-text-muted">—</span>
                                            )}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-text-primary">
                                            {formatCurrency(item.totalPrice)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="divide-y divide-border-default md:hidden">
                        {items.map((item) => (
                            <article key={item._id} className="space-y-4 p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border-default bg-bg-app text-accent-primary">
                                        <Package size={18} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="wrap-break-word font-medium text-text-primary">
                                            {item.productName}
                                        </p>

                                        {item.productSku && (
                                            <p className="mt-1 text-xs text-text-muted">
                                                SKU: {item.productSku}
                                            </p>
                                        )}

                                        {item.variantSku && (
                                            <p className="mt-1 text-xs text-text-muted">
                                                SKU biến thể: {item.variantSku}
                                            </p>
                                        )}

                                        {item.variantAttributes && (
                                            <p className="mt-1 wrap-break-word text-xs leading-5 text-text-secondary">
                                                {item.variantAttributes}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-text-muted">Đơn giá</p>
                                        <p className="mt-1 text-sm text-text-secondary">
                                            {formatCurrency(item.unitPrice)}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-text-muted">Số lượng</p>
                                        <p className="mt-1 text-sm text-text-primary">
                                            {item.quantity}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-text-muted">Giảm giá</p>
                                        <p className="mt-1 text-sm text-status-success">
                                            {item.discountAmount > 0
                                                ? `−${formatCurrency(item.discountAmount)}`
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs text-text-muted">Thành tiền</p>
                                        <p className="mt-1 wrap-break-word text-sm font-semibold text-text-primary">
                                            {formatCurrency(item.totalPrice)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="border-t border-border-default bg-bg-app p-4 sm:p-5">
                        <div className="ml-auto max-w-sm space-y-3">
                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-text-muted">
                                    Tiền hàng trước giảm giá
                                </span>
                                <span className="text-right font-medium text-text-primary">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>

                            <div className="flex justify-between gap-4 text-sm">
                                <span className="text-text-muted">
                                    Giảm giá sản phẩm
                                </span>
                                <span className="text-right font-medium text-status-success">
                                    −{formatCurrency(totalDiscount)}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-4 border-t border-border-default pt-3">
                                <span className="text-sm font-semibold text-text-primary">
                                    Thành tiền sản phẩm
                                </span>
                                <span className="text-right text-lg font-bold text-accent-primary">
                                    {formatCurrency(totalAfterDiscount)}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}