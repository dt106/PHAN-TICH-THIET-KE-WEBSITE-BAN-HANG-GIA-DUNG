import {
    CheckCircle2,
    Circle,
    Clock3,
    PackageCheck,
    Truck,
    XCircle,
} from 'lucide-react';

import type { Order } from '../../../types/order.types';

interface OrderStatusTimelineProps {
    order: Order;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatDate(value: string | null): string {
    if (!value) return '';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : DATE_FORMATTER.format(date);
}

export default function OrderStatusTimeline({
    order,
}: OrderStatusTimelineProps) {
    const timeline = [
        {
            label: 'Đặt hàng',
            date: order.createdAt,
            icon: ShoppingCartIcon,
        },
        {
            label: 'Xác nhận đơn',
            date: order.confirmedAt,
            icon: CheckCircle2,
        },
        {
            label: 'Bắt đầu giao hàng',
            date: order.shippedAt,
            icon: Truck,
        },
        {
            label: 'Đã giao hàng',
            date: order.deliveredAt,
            icon: PackageCheck,
        },
        {
            label: 'Hoàn thành đơn',
            date: order.completedAt,
            icon: CheckCircle2,
        },
        {
            label: 'Hủy đơn',
            date: order.cancelledAt,
            icon: XCircle,
        },
    ].filter((item) => Boolean(item.date));

    return (
        <section className="rounded-card border border-border-default bg-bg-surface p-4 sm:p-5">
            <div className="mb-5 flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-accent-primary">
                    <Clock3 size={19} />
                </div>

                <div>
                    <h2 className="font-semibold text-text-primary">
                        Lịch sử đơn hàng
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                        Các mốc thời gian được ghi nhận từ hệ thống
                    </p>
                </div>
            </div>

            {timeline.length === 0 ? (
                <p className="text-sm text-text-muted">
                    Chưa có lịch sử đơn hàng.
                </p>
            ) : (
                <div>
                    {timeline.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <div key={`${item.label}-${item.date}`} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-app text-accent-primary">
                                        <Icon size={15} />
                                    </div>

                                    {index < timeline.length - 1 && (
                                        <div className="my-1 min-h-7 w-px flex-1 bg-border-default" />
                                    )}
                                </div>

                                <div className="min-w-0 pb-5">
                                    <p className="text-sm font-medium text-text-primary">
                                        {item.label}
                                    </p>

                                    <p className="mt-1 text-xs text-text-muted">
                                        {formatDate(item.date)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function ShoppingCartIcon() {
    return <Circle size={15} />;
}