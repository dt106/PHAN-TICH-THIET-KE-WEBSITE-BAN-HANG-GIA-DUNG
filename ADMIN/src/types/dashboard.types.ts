
export type DashboardPeriod = '7d' | '30d' | '12m';

export interface DashboardOverview {
    period: {
        key: DashboardPeriod;
        start: string;
        end: string;
        timeZone: string;
    };

    summary: {
        revenue: {
            totalCollected: number;
            totalRefunded: number;
            netRevenue: number;
            currency: 'VND';
        };

        orders: {
            total: number;
            today: number;
            byStatus: Record<string, number>;
        };

        customers: {
            total: number;
            newInPeriod: number;
        };

        products: {
            total: number;
            active: number;
            inactive: number;
        };

        inventory: {
            totalStock: number;
            totalVariants: number;
            lowStockVariants: number;
            outOfStockVariants: number;
            lowStockThreshold: number;
        };
    };

    revenueChart: Array<{
        date: string;
        collected: number;
        refunded: number;
        netRevenue: number;
    }>;

    orderStatusChart: Array<{
        status: string;
        count: number;
    }>;

    topProducts: Array<{
        productId: string;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
    }>;

    recentOrders: Array<{
        _id: string;
        orderNumber: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        totalAmount: number;
        paymentMethod: string;
        paymentStatus: string;
        status: string;
        createdAt: string;
    }>;

    lowStockProducts: Array<{
        _id: string;
        productId: string;
        productName: string;
        productSku: string;
        variantSku: string;
        price: number;
        stockQuantity: number;
    }>;
}
