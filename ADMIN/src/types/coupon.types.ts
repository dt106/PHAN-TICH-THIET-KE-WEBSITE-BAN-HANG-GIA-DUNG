export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  _id?: string;

  code: string;
  name: string;
  description: string | null;

  discountType: CouponDiscountType;
  discountValue: number;

  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;

  usageLimit: number | null;
  usedCount: number;
  perUserLimit: number | null;

  startsAt: string | null;
  expiresAt: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  totalDiscountAmountGiven?: number;
}

export interface CouponPayload {
  code: string;
  name: string;
  description: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export type CouponUpdatePayload = Omit<CouponPayload, 'code'>;

export interface CouponUsage {
  id: string;
  couponId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  } | string;
  orderId: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    status: string;
  } | string;
  discountAmount: number;
  usedAt: string;
}