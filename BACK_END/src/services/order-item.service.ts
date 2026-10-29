import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Order from "../models/Order.model";
import OrderItem, { IOrderItem } from "../models/OrderItem.model";

export interface RequesterContext {
  userId: string;
  role: string;
}

export interface OrderItemsSummary {
  totalQuantity: number;
  totalRevenue: number;
}

export interface AdminOrderItemsResult {
  items: IOrderItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: OrderItemsSummary;
}

const createHttpError = (statusCode: number, message: string): Error =>
  new AppError(statusCode, message);

export const getOrderItems = async (
  requester: RequesterContext,
  orderId: string
): Promise<IOrderItem[]> => {
  const order = await Order.findById(new Types.ObjectId(orderId)).select("userId");

  if (!order) {
    throw createHttpError(404, "Đơn hàng không tồn tại.");
  }

  const isOwner = order.userId?.toString() === requester.userId;
  const isAdmin = requester.role === "admin";

  if (!isOwner && !isAdmin) {
    throw createHttpError(404, "Đơn hàng không tồn tại hoặc không thuộc về bạn.");
  }

  return OrderItem.find({ orderId: order._id }).sort({ createdAt: 1 });
};

export const getAllOrderItemsAdmin = async (query: {
  orderId?: string;
  productId?: string;
  variantId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrderItemsResult> => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;

  const filter: any = {};

  if (query.orderId) {
    filter.orderId = new Types.ObjectId(query.orderId);
  }
  if (query.productId) {
    filter.productId = new Types.ObjectId(query.productId);
  }
  if (query.variantId) {
    filter.variantId = new Types.ObjectId(query.variantId);
  }
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      filter.createdAt.$gte = new Date(query.from);
    }
    if (query.to) {
      filter.createdAt.$lte = new Date(query.to);
    }
  }

  const [items, total, aggregated] = await Promise.all([
    OrderItem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    OrderItem.countDocuments(filter),
    OrderItem.aggregate<{ _id: null; totalQuantity: number; totalRevenue: number }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]),
  ]);

  const summary: OrderItemsSummary = aggregated[0] ?? {
    totalQuantity: 0,
    totalRevenue: 0,
  };

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary,
  };
};
