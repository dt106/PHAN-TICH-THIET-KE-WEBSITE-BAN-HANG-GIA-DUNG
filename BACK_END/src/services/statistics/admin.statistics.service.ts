
import {
  Order,
  OrderItem,
  Payment,
  Product,
  ProductVariant,
  User,
} from "../../models";

export type DashboardPeriod = "7d" | "30d" | "12m";

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const LOW_STOCK_THRESHOLD = 5;

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
  "returned",
] as const;

type DateRange = {
  start: Date;
  end: Date;
  period: DashboardPeriod;
};

const getVietnamDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

const getDateRange = (period: DashboardPeriod): DateRange => {
  const { year, month, day } = getVietnamDateParts();

  // Múi giờ Việt Nam UTC+7.
  const todayStart = new Date(
    Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000
  );

  let start: Date;

  if (period === "7d") {
    start = new Date(todayStart.getTime() - 6 * 86400000);
  } else if (period === "30d") {
    start = new Date(todayStart.getTime() - 29 * 86400000);
  } else {
    start = new Date(
      Date.UTC(year, month - 11, 1) - 7 * 60 * 60 * 1000
    );
  }

  const end = new Date(todayStart.getTime() + 86400000);

  return { start, end, period };
};

const formatNumber = (value: unknown): number =>
  Number(value ?? 0);

const createChartLabels = (
  range: DateRange
): string[] => {
  const labels: string[] = [];

  if (range.period === "12m") {
    const startParts = getVietnamDateParts(range.start);

    for (let i = 0; i < 12; i++) {
      const date = new Date(
        Date.UTC(startParts.year, startParts.month - 1 + i, 1)
      );

      labels.push(
        `${date.getUTCFullYear()}-${String(
          date.getUTCMonth() + 1
        ).padStart(2, "0")}`
      );
    }

    return labels;
  }

  const startParts = getVietnamDateParts(range.start);

  for (let i = 0; i < (range.period === "7d" ? 7 : 30); i++) {
    const date = new Date(
      Date.UTC(
        startParts.year,
        startParts.month - 1,
        startParts.day + i
      )
    );

    labels.push(
      `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(
        date.getUTCDate()
      ).padStart(2, "0")}`
    );
  }

  return labels;
};

/**
 * Thống kê người dùng dành cho trang quản lý khách hàng.
 * Giữ nguyên endpoint cũ.
 */
export const getAdminUserStatisticsService = async () => {
  const now = new Date();
  const { year, month } = getVietnamDateParts(now);

  const startOfMonth = new Date(
    Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000
  );

  const startOfNextMonth = new Date(
    Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000
  );

  const [
    totalCustomers,
    activeCustomers,
    inactiveCustomers,
    blockedCustomers,
    totalAdmins,
    newCustomersThisMonth,
  ] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", status: "active" }),
    User.countDocuments({ role: "customer", status: "inactive" }),
    User.countDocuments({ role: "customer", status: "blocked" }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({
      role: "customer",
      createdAt: {
        $gte: startOfMonth,
        $lt: startOfNextMonth,
      },
    }),
  ]);

  return {
    customers: {
      total: totalCustomers,
      active: activeCustomers,
      inactive: inactiveCustomers,
      blocked: blockedCustomers,
      newThisMonth: newCustomersThisMonth,
    },
    totalAdmins,
    period: {
      month,
      year,
    },
  };
};

/**
 * Thống kê tổng quan dành cho Dashboard Admin.
 */
export const getAdminOverviewStatisticsService = async (
  period: DashboardPeriod = "30d"
) => {
  const range = getDateRange(period);
  const { start, end } = range;

  const todayParts = getVietnamDateParts();

  const todayStart = new Date(
    Date.UTC(
      todayParts.year,
      todayParts.month - 1,
      todayParts.day
    ) - 7 * 60 * 60 * 1000
  );

  const todayEnd = new Date(
    todayStart.getTime() + 86400000
  );

  const chartLabels = createChartLabels(range);

  const chartGroupFormat =
    period === "12m" ? "%Y-%m" : "%Y-%m-%d";

  const chartGroup = {
    $dateToString: {
      format: chartGroupFormat,
      date: "$paidAt",
      timezone: TIME_ZONE,
    },
  };

  const refundChartGroup = {
    $dateToString: {
      format: chartGroupFormat,
      date: "$refundedAt",
      timezone: TIME_ZONE,
    },
  };

  const [
    revenueCollectedResult,
    revenueRefundedResult,
    collectedChartResult,
    refundedChartResult,
    orderStatusResult,
    todayOrders,
    totalCustomers,
    newCustomers,
    totalProducts,
    activeProducts,
    inventorySummaryResult,
    lowStockVariantsResult,
    topProductsResult,
    recentOrdersResult,
  ] = await Promise.all([
    // Tổng tiền thực thu trong khoảng thời gian.
    Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "refunded"] },
          paidAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          transactions: { $sum: 1 },
        },
      },
    ]),

    // Tiền hoàn phát sinh trong khoảng thời gian.
    Payment.aggregate([
      {
        $match: {
          status: "refunded",
          refundedAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$refundAmount" },
          transactions: { $sum: 1 },
        },
      },
    ]),

    // Biểu đồ tiền thu theo ngày/tháng.
    Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "refunded"] },
          paidAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: chartGroup,
          total: { $sum: "$amount" },
        },
      },
    ]),

    // Biểu đồ tiền hoàn theo ngày/tháng.
    Payment.aggregate([
      {
        $match: {
          status: "refunded",
          refundedAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: refundChartGroup,
          total: { $sum: "$refundAmount" },
        },
      },
    ]),

    // Thống kê trạng thái đơn theo ngày tạo đơn.
    Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Order.countDocuments({
      createdAt: { $gte: todayStart, $lt: todayEnd },
    }),

    User.countDocuments({ role: "customer" }),

    User.countDocuments({
      role: "customer",
      createdAt: { $gte: start, $lt: end },
    }),

    Product.countDocuments(),

    Product.countDocuments({ isActive: true }),

    // Tổng tồn kho và số biến thể hết/sắp hết hàng.
    ProductVariant.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$stockQuantity" },
          totalVariants: { $sum: 1 },
          outOfStock: {
            $sum: {
              $cond: [
                { $lte: ["$stockQuantity", 0] },
                1,
                0,
              ],
            },
          },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$stockQuantity", 0] },
                    {
                      $lte: [
                        "$stockQuantity",
                        LOW_STOCK_THRESHOLD,
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),

    // Danh sách biến thể sắp hết hàng.
    ProductVariant.aggregate([
      {
        $match: {
          isActive: true,
          stockQuantity: {
            $gt: 0,
            $lte: LOW_STOCK_THRESHOLD,
          },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: "$product",
      },
      {
        $project: {
          _id: 1,
          productId: 1,
          productName: "$product.name",
          productSku: "$product.sku",
          variantSku: "$sku",
          price: 1,
          stockQuantity: 1,
        },
      },
      {
        $sort: { stockQuantity: 1 },
      },
      { $limit: 8 },
    ]),

    // Top sản phẩm bán chạy trong kỳ.
    // Chỉ tính đơn đã giao hoặc hoàn thành.
    OrderItem.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "orderId",
          foreignField: "_id",
          as: "order",
        },
      },
      {
        $unwind: "$order",
      },
      {
        $match: {
          "order.status": {
            $in: ["delivered", "completed"],
          },
          "order.createdAt": {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $group: {
          _id: {
            productId: "$productId",
            productName: "$productName",
          },
          totalQuantity: { $sum: "$quantity" },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productName: "$_id.productName",
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
      {
        $sort: {
          totalQuantity: -1,
          totalRevenue: -1,
        },
      },
      { $limit: 5 },
    ]),

    // 8 đơn hàng mới nhất.
    Order.find()
      .select(
        "orderNumber customerName customerEmail customerPhone totalAmount paymentMethod paymentStatus status createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  // Tổng hợp doanh thu.
  const totalCollected = formatNumber(
    revenueCollectedResult[0]?.total
  );

  const totalRefunded = formatNumber(
    revenueRefundedResult[0]?.total
  );

  const netRevenue = totalCollected - totalRefunded;

  // Chuyển dữ liệu biểu đồ thành Map để bổ sung ngày không có giao dịch.
  const collectedMap = new Map<string, number>(
    collectedChartResult.map(
      (item: any): [string, number] => [
        item._id,
        formatNumber(item.total),
      ]
    )
  );

  const refundedMap = new Map<string, number>(
    refundedChartResult.map(
      (item: any): [string, number] => [
        item._id,
        formatNumber(item.total),
      ]
    )
  );

  const revenueChart = chartLabels.map((date) => {
    const collected = collectedMap.get(date) ?? 0;
    const refunded = refundedMap.get(date) ?? 0;

    return {
      date,
      collected,
      refunded,
      netRevenue: collected - refunded,
    };
  });

  // Chuẩn hóa thống kê trạng thái đơn hàng.
  const orderStatusCounts: Record<string, number> = {};

  for (const status of ORDER_STATUSES) {
    orderStatusCounts[status] = 0;
  }

  for (const item of orderStatusResult) {
    if (item._id in orderStatusCounts) {
      orderStatusCounts[item._id] = formatNumber(item.count);
    }
  }

  const totalOrders = Object.values(
    orderStatusCounts
  ).reduce((sum, value) => sum + value, 0);

  const inventory = inventorySummaryResult[0] ?? {};

  return {
    period: {
      key: period,
      start,
      end,
      timeZone: TIME_ZONE,
    },

    summary: {
      revenue: {
        totalCollected,
        totalRefunded,
        netRevenue,
        currency: "VND",
      },

      orders: {
        total: totalOrders,
        today: todayOrders,
        byStatus: orderStatusCounts,
      },

      customers: {
        total: totalCustomers,
        newInPeriod: newCustomers,
      },

      products: {
        total: totalProducts,
        active: activeProducts,
        inactive: totalProducts - activeProducts,
      },

      inventory: {
        totalStock: formatNumber(inventory.totalStock),
        totalVariants: formatNumber(inventory.totalVariants),
        lowStockVariants: formatNumber(inventory.lowStock),
        outOfStockVariants: formatNumber(inventory.outOfStock),
        lowStockThreshold: LOW_STOCK_THRESHOLD,
      },
    },

    revenueChart,

    orderStatusChart: Object.entries(
      orderStatusCounts
    ).map(([status, count]) => ({
      status,
      count,
    })),

    topProducts: topProductsResult,

    recentOrders: recentOrdersResult,

    lowStockProducts: lowStockVariantsResult,
  };
};
