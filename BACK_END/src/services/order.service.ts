import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Coupon from "../models/Coupon.model";
import CouponUsage from "../models/CouponUsage.model";
import Order, { IOrder, OrderStatus } from "../models/Order.model";
import OrderItem from "../models/OrderItem.model";
import ProductVariant from "../models/ProductVariant.model";
import { recordCodPayment, refundPaidPaymentForOrder } from "./payment.service";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["delivered", "completed", "cancelled"],
  delivered: ["completed", "returned"],
  completed: ["returned"],
  cancelled: [],
  returned: [],
};

export interface OrderPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const createHttpError = (statusCode: number, message: string): Error =>
  new AppError(statusCode, message);

const buildPaginationMeta = (
  page: number,
  limit: number,
  total: number
): OrderPaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});

export const getMyOrders = async (
  userId: string,
  query: { status?: string; page?: number; limit?: number }
): Promise<{ orders: IOrder[]; meta: OrderPaginationMeta }> => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;

  const filter: any = {
    userId: new Types.ObjectId(userId),
  };
  if (query.status) {
    filter.status = query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, meta: buildPaginationMeta(page, limit, total) };
};

export const getOrderDetailForUser = async (
  userId: string,
  orderId: string
): Promise<IOrder> => {
  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(userId),
  });

  if (!order) {
    throw createHttpError(404, "Đơn hàng không tồn tại hoặc không thuộc về bạn.");
  }

  return order;
};

const restockOrderItems = async (orderId: Types.ObjectId): Promise<void> => {
  const items = await OrderItem.find({ orderId }).select("variantId quantity");

  for (const item of items) {
    if (item.variantId) {
      await ProductVariant.updateOne(
        { _id: item.variantId },
        { $inc: { stockQuantity: item.quantity } }
      );
    }
  }
};

const rollbackCouponUsage = async (order: IOrder): Promise<void> => {
  if (!order.couponId) {
    return;
  }

  const deleted = await CouponUsage.deleteMany({ orderId: order._id });

  if (deleted.deletedCount > 0) {
    await Coupon.updateOne(
      { _id: order.couponId },
      { $inc: { usedCount: -deleted.deletedCount } }
    );
  }
};

export const cancelMyOrder = async (
  userId: string,
  orderId: string
): Promise<IOrder> => {
  const order = await getOrderDetailForUser(userId, orderId);

  if (!["pending", "confirmed"].includes(order.status)) {
    throw createHttpError(
      400,
      "Đơn hàng đã vào quy trình xử lý, không thể hủy. Vui lòng liên hệ tổng đài."
    );
  }

  if (order.paymentStatus === "paid") {
    throw createHttpError(
      400,
      "Đơn hàng đã được thanh toán, không thể hủy trực tiếp."
    );
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  await order.save();

  await restockOrderItems(order._id);
  await rollbackCouponUsage(order);

  return order;
};

export const getAllOrdersAdmin = async (query: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ orders: IOrder[]; meta: OrderPaginationMeta }> => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;

  const filter: any = {};

  if (query.search) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { orderNumber: { $regex: escaped, $options: "i" } },
      { customerName: { $regex: escaped, $options: "i" } },
      { customerEmail: { $regex: escaped, $options: "i" } },
    ];
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus;
  }
  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }
  if (query.userId) {
    filter.userId = new Types.ObjectId(query.userId);
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

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);

  return { orders, meta: buildPaginationMeta(page, limit, total) };
};

export const getOrderByIdAdmin = async (
  orderId: string
): Promise<{ order: IOrder; itemCount: number }> => {
  const order = await Order.findById(new Types.ObjectId(orderId));

  if (!order) {
    throw createHttpError(404, "Đơn hàng không tồn tại.");
  }

  const itemCount = await OrderItem.countDocuments({ orderId: order._id });

  return { order, itemCount };
};

export const updateOrderStatusAdmin = async (
  orderId: string,
  nextStatus: OrderStatus
): Promise<IOrder> => {
  const order = await Order.findById(new Types.ObjectId(orderId));

  if (!order) {
    throw createHttpError(404, "Đơn hàng không tồn tại.");
  }

  const allowedTargets = ORDER_STATUS_TRANSITIONS[order.status];

  if (!allowedTargets.includes(nextStatus)) {
    throw createHttpError(
      400,
      `Không thể chuyển đơn hàng từ trạng thái '${order.status}' sang '${nextStatus}'.`
    );
  }

  if (order.status === "pending" && nextStatus === "confirmed") {
    order.confirmedAt = new Date();
  }
  if (nextStatus === "shipping") {
    order.shippedAt = new Date();
  }
  if (nextStatus === "delivered") {
    order.deliveredAt = new Date();
  }
  if (nextStatus === "completed") {
    order.completedAt = new Date();
  }

  order.status = nextStatus;

  // COD: ghi nhận tiền ngay khi giao hàng (delivered) — "completed" chỉ là
  // khách xác nhận không có vấn đề. Giữ nhánh completed cho đường rút ngắn
  // shipping -> completed; recordCodPayment tự chống ghi trùng (idempotent).
  if (
    (nextStatus === "delivered" || nextStatus === "completed") &&
    order.paymentMethod === "COD"
  ) {
    await recordCodPayment(order);
  }

  if (nextStatus === "cancelled") {
    order.cancelledAt = new Date();
    await order.save();
    await restockOrderItems(order._id);
    await rollbackCouponUsage(order);
    // Admin hủy đơn đã thanh toán → tự hoàn tiền đầy đủ (Payment + Order).
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      await order.save();
      await refundPaidPaymentForOrder(order._id, "Đơn hàng bị hủy bởi quản trị viên.");
    }
    return order;
  }

  if (nextStatus === "returned") {
    await order.save();
    await restockOrderItems(order._id);
    await rollbackCouponUsage(order);
    if (order.paymentStatus === "paid") {
      order.paymentStatus = "refunded";
      await order.save();
      // Ghi bản ghi hoàn tiền trên Payment (trước đây chỉ sửa Order).
      await refundPaidPaymentForOrder(order._id, "Đơn hàng bị hoàn trả.");
    }
    return order;
  }

  await order.save();
  return order;
};
