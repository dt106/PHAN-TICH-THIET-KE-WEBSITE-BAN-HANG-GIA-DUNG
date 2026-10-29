import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Cart from "../models/Cart.model";
import Coupon from "../models/Coupon.model";
import CouponUsage from "../models/CouponUsage.model";
import Order, { IOrder, PaymentMethod } from "../models/Order.model";
import OrderItem, { IOrderItem } from "../models/OrderItem.model";
import ProductVariant from "../models/ProductVariant.model";
import User from "../models/User.model";
import UserAddress from "../models/UserAddress.model";
import { validateAndCalculateCoupon } from "./coupon.service";

export interface CheckoutLineItem {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSku: string | null;
  variantSku: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface CheckoutSummaryResponse {
  items: CheckoutLineItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  coupon: { id: string; code: string; name: string } | null;
  shippingAddress: {
    customerName: string;
    customerPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    province: string | null;
  };
}

export interface CheckoutPayload {
  addressId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  shippingWard?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  selectedCartItemIds?: string[] | null;
  couponCode?: string | null;
  paymentMethod?: PaymentMethod;
  shippingFee?: number | null;
  note?: string | null;
}

const resolveShippingInfo = async (
  userId: string,
  payload: CheckoutPayload
): Promise<CheckoutSummaryResponse["shippingAddress"]> => {
  if (payload.addressId) {
    const address = await UserAddress.findOne({
      _id: new Types.ObjectId(payload.addressId),
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!address) {
      throw new AppError(404, "Địa chỉ giao hàng không tồn tại hoặc không thuộc về bạn.");
    }

    return {
      customerName: address.recipientName,
      customerPhone: address.phone,
      addressLine: address.addressLine,
      ward: address.ward ?? null,
      district: address.district ?? null,
      province: address.province ?? null,
    };
  }

  if (!payload.customerName || !payload.customerPhone || !payload.shippingAddress) {
    throw new AppError(400, 
      "Cần cung cấp addressId hoặc đầy đủ customerName, customerPhone và shippingAddress."
    );
  }

  return {
    customerName: payload.customerName,
    customerPhone: payload.customerPhone,
    addressLine: payload.shippingAddress,
    ward: payload.shippingWard ?? null,
    district: payload.shippingDistrict ?? null,
    province: payload.shippingProvince ?? null,
  };
};

const buildCheckoutSummary = async (
  userId: string,
  payload: CheckoutPayload
): Promise<CheckoutSummaryResponse> => {
  const shipping = await resolveShippingInfo(userId, payload);

  const cartFilter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
  };

  if (payload.selectedCartItemIds && payload.selectedCartItemIds.length > 0) {
    cartFilter._id = {
      $in: payload.selectedCartItemIds.map((id) => new Types.ObjectId(id)),
    };
  }

  const cartRecords = await Cart.find(cartFilter)
    .populate({
      path: "productId",
      select: "name sku basePrice salePrice isActive",
    })
    .populate({
      path: "variantId",
      select: "sku price stockQuantity isActive",
    })
    .lean();

  if (cartRecords.length === 0) {
    throw new AppError(400, "Giỏ hàng trống hoặc không có sản phẩm hợp lệ để đặt hàng.");
  }

  const items: CheckoutLineItem[] = [];
  let subtotal = 0;

  for (const record of cartRecords) {
    const product = record.productId as any;
    const variant = record.variantId as any;

    if (!product || !product.isActive) {
      throw new AppError(400, 
        "Có sản phẩm trong giỏ đã ngừng kinh doanh, vui lòng kiểm tra lại giỏ hàng."
      );
    }

    const unitPrice = variant
      ? variant.price
      : product.salePrice ?? product.basePrice;
    const totalPrice = unitPrice * record.quantity;

    if (variant) {
      if (!variant.isActive) {
        throw new AppError(400, `Biến thể của sản phẩm ${product.name} đã ngừng kinh doanh.`);
      }
      if (variant.stockQuantity < record.quantity) {
        throw new AppError(400, 
          `Sản phẩm ${product.name} chỉ còn ${variant.stockQuantity} sản phẩm trong kho.`
        );
      }
    }

    items.push({
      cartItemId: record._id.toString(),
      productId: product._id.toString(),
      variantId: variant ? variant._id.toString() : null,
      productName: product.name,
      productSku: product.sku ?? null,
      variantSku: variant ? variant.sku : null,
      unitPrice,
      quantity: record.quantity,
      totalPrice,
    });

    subtotal += totalPrice;
  }

  let discountAmount = 0;
  let couponRef: CheckoutSummaryResponse["coupon"] = null;

  if (payload.couponCode) {
    const couponResult = await validateAndCalculateCoupon(
      userId,
      payload.couponCode,
      subtotal
    );
    discountAmount = couponResult.discountAmount;
    couponRef = {
      id: couponResult.coupon.id,
      code: couponResult.coupon.code,
      name: couponResult.coupon.name,
    };
  }

  const shippingFee = payload.shippingFee ?? 0;
  const taxAmount = 0;
  const totalAmount = Math.max(
    0,
    subtotal - discountAmount + shippingFee + taxAmount
  );

  return {
    items,
    subtotal,
    discountAmount,
    shippingFee,
    taxAmount,
    totalAmount,
    coupon: couponRef,
    shippingAddress: shipping,
  };
};

export const reviewCheckout = async (
  userId: string,
  payload: CheckoutPayload
): Promise<CheckoutSummaryResponse> => {
  return buildCheckoutSummary(userId, payload);
};

const generateOrderNumber = async (): Promise<string> => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const candidate = `DH-${datePart}-${randomPart}`;
    const existed = await Order.exists({ orderNumber: candidate });
    if (!existed) {
      return candidate;
    }
  }

  return `DH-${datePart}-${Date.now()}`;
};

export const placeOrder = async (
  userId: string,
  payload: CheckoutPayload
): Promise<{ order: IOrder; items: IOrderItem[] }> => {
  if (!payload.paymentMethod) {
    throw new AppError(400, "Phương thức thanh toán là bắt buộc.");
  }

  const user = await User.findById(new Types.ObjectId(userId)).select("email");
  if (!user) {
    throw new AppError(404, "Tài khoản không tồn tại.");
  }

  const summary = await buildCheckoutSummary(userId, payload);
  const orderNumber = await generateOrderNumber();

  const createdOrder = await Order.create({
    orderNumber,
    userId: new Types.ObjectId(userId),
    couponId: summary.coupon ? new Types.ObjectId(summary.coupon.id) : null,
    customerName: summary.shippingAddress.customerName,
    customerEmail: user.email,
    customerPhone: summary.shippingAddress.customerPhone,
    shippingAddress: summary.shippingAddress.addressLine,
    shippingWard: summary.shippingAddress.ward,
    shippingDistrict: summary.shippingAddress.district,
    shippingProvince: summary.shippingAddress.province,
    subtotal: summary.subtotal,
    discountAmount: summary.discountAmount,
    shippingFee: summary.shippingFee,
    taxAmount: summary.taxAmount,
    totalAmount: summary.totalAmount,
    paymentMethod: payload.paymentMethod,
    paymentStatus: "pending",
    status: "pending",
    note: payload.note ?? null,
  });

  const createdItems = await OrderItem.insertMany(
    summary.items.map((item) => ({
      orderId: createdOrder._id,
      productId: new Types.ObjectId(item.productId),
      variantId: item.variantId ? new Types.ObjectId(item.variantId) : null,
      productName: item.productName,
      productSku: item.productSku,
      variantSku: item.variantSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: 0,
      totalPrice: item.totalPrice,
    }))
  );

  for (const item of summary.items) {
    if (item.variantId) {
      const decremented = await ProductVariant.updateOne(
        { _id: new Types.ObjectId(item.variantId), stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } }
      );
      if (decremented.modifiedCount === 0) {
        throw new AppError(
          400,
          `Sản phẩm ${item.productName} không đủ tồn kho (yêu cầu ${item.quantity}).`
        );
      }
    }
  }

  if (summary.coupon) {
    await Coupon.updateOne(
      { _id: new Types.ObjectId(summary.coupon.id) },
      { $inc: { usedCount: 1 } }
    );
    await CouponUsage.create({
      couponId: new Types.ObjectId(summary.coupon.id),
      userId: new Types.ObjectId(userId),
      orderId: createdOrder._id,
      discountAmount: summary.discountAmount,
    });
  }

  await Cart.deleteMany({
    userId: new Types.ObjectId(userId),
    _id: { $in: summary.items.map((item) => new Types.ObjectId(item.cartItemId)) },
  });

  return { order: createdOrder, items: createdItems };
};
