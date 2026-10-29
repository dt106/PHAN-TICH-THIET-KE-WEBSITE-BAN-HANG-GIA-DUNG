import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Coupon, { ICoupon, DiscountType } from "../models/Coupon.model";
import CouponUsage from "../models/CouponUsage.model";

export interface ValidateCouponResult {
  valid: boolean;
  coupon: {
    id: string;
    code: string;
    name: string;
    discountType: DiscountType;
    discountValue: number;
    minimumOrderAmount: number;
    maximumDiscountAmount?: number | null;
  };
  discountAmount: number;
  finalAmount: number;
}

export const getPublicCoupons = async (): Promise<ICoupon[]> => {
  const now = new Date();

  return Coupon.find({
    isActive: true,
    $and: [
      {
        $or: [{ startsAt: null }, { startsAt: { $lte: now } }],
      },
      {
        $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }],
      },
      {
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
        ],
      },
    ],
  })
    .select(
      "code name description discountType discountValue minimumOrderAmount maximumDiscountAmount startsAt expiresAt"
    )
    .sort({ createdAt: -1 })
    .lean();
};

export const validateAndCalculateCoupon = async (
  userId: string,
  code: string,
  orderAmount: number
): Promise<ValidateCouponResult> => {
  const formattedCode = code.trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: formattedCode });

  if (!coupon) {
    throw new AppError(404, "Mã giảm giá không tồn tại.");
  }

  if (!coupon.isActive) {
    throw new AppError(400, "Mã giảm giá hiện đang bị tạm khóa.");
  }

  const now = new Date();

  if (coupon.startsAt && now < coupon.startsAt) {
    throw new AppError(400, "Mã giảm giá chưa đến thời gian áp dụng.");
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new AppError(400, "Mã giảm giá đã hết hạn sử dụng.");
  }

  if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
    if (coupon.usedCount >= coupon.usageLimit) {
      throw new AppError(400, "Mã giảm giá đã hết lượt sử dụng.");
    }
  }

  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined) {
    const userUsedCount = await CouponUsage.countDocuments({
      couponId: coupon._id,
      userId: new Types.ObjectId(userId),
    });

    if (userUsedCount >= coupon.perUserLimit) {
      throw new AppError(400, 
        `Bạn đã sử dụng hết số lần cho phép (${coupon.perUserLimit} lần) của mã này.`
      );
    }
  }

  if (orderAmount < coupon.minimumOrderAmount) {
    throw new AppError(400, 
      `Đơn hàng chưa đạt giá trị tối thiểu ${coupon.minimumOrderAmount.toLocaleString("vi-VN")}đ để sử dụng mã này.`
    );
  }

  let discountAmount = 0;

  if (coupon.discountType === "percentage") {
    const calculated = (orderAmount * coupon.discountValue) / 100;
    discountAmount =
      coupon.maximumDiscountAmount !== null && coupon.maximumDiscountAmount !== undefined
        ? Math.min(calculated, coupon.maximumDiscountAmount)
        : calculated;
  } else {
    discountAmount = Math.min(coupon.discountValue, orderAmount);
  }

  discountAmount = Math.round(discountAmount);
  const finalAmount = Math.max(0, orderAmount - discountAmount);

  return {
    valid: true,
    coupon: {
      id: coupon._id.toString(),
      code: coupon.code,
      name: coupon.name,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minimumOrderAmount: coupon.minimumOrderAmount,
      maximumDiscountAmount: coupon.maximumDiscountAmount,
    },
    discountAmount,
    finalAmount,
  };
};

export const getAllCouponsAdmin = async (query: {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: string;
}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ code: searchRegex }, { name: searchRegex }];
  }

  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === "true";
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  return {
    items: coupons.map((c) => ({ ...c, id: c._id.toString() })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getCouponByIdAdmin = async (id: string) => {
  const coupon = await Coupon.findById(id).lean();
  if (!coupon) {
    throw new AppError(404, "Mã giảm giá không tồn tại.");
  }

  const totalDiscountUsed = await CouponUsage.aggregate([
    { $match: { couponId: new Types.ObjectId(id) } },
    { $group: { _id: null, total: { $sum: "$discountAmount" } } },
  ]);

  return {
    ...coupon,
    id: coupon._id.toString(),
    totalDiscountAmountGiven: totalDiscountUsed[0]?.total ?? 0,
  };
};

export const createCoupon = async (payload: {
  code: string;
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}): Promise<ICoupon> => {
  const code = payload.code.trim().toUpperCase();

  const existing = await Coupon.findOne({ code });
  if (existing) {
    throw new AppError(400, `Mã giảm giá '${code}' đã tồn tại trong hệ thống.`);
  }

  return Coupon.create({
    ...payload,
    code,
    startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
  });
};

export const updateCoupon = async (
  id: string,
  payload: Partial<{
    name: string;
    description: string | null;
    discountType: DiscountType;
    discountValue: number;
    minimumOrderAmount: number;
    maximumDiscountAmount: number | null;
    usageLimit: number | null;
    perUserLimit: number | null;
    startsAt: string | null;
    expiresAt: string | null;
    isActive: boolean;
  }>
): Promise<ICoupon> => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new AppError(404, "Mã giảm giá không tồn tại.");
  }

  if (payload.name !== undefined) coupon.name = payload.name;
  if (payload.description !== undefined) coupon.description = payload.description;
  if (payload.discountType !== undefined) coupon.discountType = payload.discountType;
  if (payload.discountValue !== undefined) coupon.discountValue = payload.discountValue;
  if (payload.minimumOrderAmount !== undefined)
    coupon.minimumOrderAmount = payload.minimumOrderAmount;
  if (payload.maximumDiscountAmount !== undefined)
    coupon.maximumDiscountAmount = payload.maximumDiscountAmount;
  if (payload.usageLimit !== undefined) coupon.usageLimit = payload.usageLimit;
  if (payload.perUserLimit !== undefined) coupon.perUserLimit = payload.perUserLimit;
  if (payload.startsAt !== undefined)
    coupon.startsAt = payload.startsAt ? new Date(payload.startsAt) : null;
  if (payload.expiresAt !== undefined)
    coupon.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (payload.isActive !== undefined) coupon.isActive = payload.isActive;

  await coupon.save();
  return coupon;
};

export const toggleCouponStatus = async (id: string): Promise<ICoupon> => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new AppError(404, "Mã giảm giá không tồn tại.");
  }

  coupon.isActive = !coupon.isActive;
  await coupon.save();
  return coupon;
};

export const deleteCoupon = async (id: string): Promise<{ message: string }> => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new AppError(404, "Mã giảm giá không tồn tại.");
  }

  const usageCount = await CouponUsage.countDocuments({ couponId: id });
  if (usageCount > 0) {
    throw new AppError(400, 
      `Không thể xóa mã giảm giá này vì đã có ${usageCount} đơn hàng áp dụng. Vui lòng chuyển trạng thái sang Không hoạt động.`
    );
  }

  await Coupon.findByIdAndDelete(id);
  return { message: "Đã xóa mã giảm giá thành công." };
};

export const getCouponUsages = async (
  couponId: string,
  query: { page?: number; limit?: number }
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [usages, total] = await Promise.all([
    CouponUsage.find({ couponId: new Types.ObjectId(couponId) })
      .populate("userId", "name email phone")
      .populate("orderId", "orderNumber totalAmount status")
      .sort({ usedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CouponUsage.countDocuments({ couponId: new Types.ObjectId(couponId) }),
  ]);

  return {
    items: usages.map((u: any) => ({ ...u, id: u._id.toString() })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
