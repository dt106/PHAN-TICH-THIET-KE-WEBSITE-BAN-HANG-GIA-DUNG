import { request } from "./http.ts";
import type { Coupon } from "../types/api.ts";

const getPublicCoupons = () => {
  return request<Coupon[]>("/api/coupons/public", { auth: false });
};

const checkCoupon = (code: string, orderAmount: number) => {
  return request<{
    valid: boolean;
    coupon: Coupon;
    discountAmount: number;
    finalAmount: number;
  }>("/api/coupons/check", { method: "POST", body: { code, orderAmount } });
};

export const couponService = {
  getPublicCoupons,
  checkCoupon,
};
