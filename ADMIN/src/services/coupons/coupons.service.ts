/**
 * FILE: ADMIN/src/services/coupons/coupons.service.ts
 *
 * API quản lý mã giảm giá dành cho Admin.
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { httpClient } from '../api/httpClient';

import type {
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
  QueryParams,
} from '../api/api.types';

import type {
  Coupon,
  CouponPayload,
  CouponUpdatePayload,
  CouponUsage,
} from '../../types/coupon.types';

const BASE_URL = API_ENDPOINTS.coupons.base;

const PAGE_LIMIT = 100;

type CouponApiItem = Omit<Coupon, 'id'> & {
  id?: string;
  _id: string;
};

export interface CouponListResult {
  items: Coupon[];
  pagination: PaginationMeta;
}

const normalizeCoupon = (item: CouponApiItem | Coupon): Coupon => {
  const raw = item as CouponApiItem;

  return {
    ...raw,
    id: raw.id || raw._id,
  };
};

export const couponsService = {
  /**
   * Lấy một trang mã giảm giá.
   */
  async getCoupons(params?: QueryParams) {
    const response = await httpClient.get<PaginatedResponse<CouponApiItem>>(
      BASE_URL,
      { params },
    );

    return {
      ...response,
      data: response.data.map(normalizeCoupon),
    };
  },

  /**
   * Lấy toàn bộ mã giảm giá.
   *
   * Backend giới hạn limit tối đa 100.
   * Hàm này tự lấy các trang còn lại để frontend
   * có đủ dữ liệu thống kê và lọc.
   */
  async getAllCoupons(): Promise<CouponListResult> {
    const firstResponse = await couponsService.getCoupons({
      page: 1,
      limit: PAGE_LIMIT,
    });

    const pagination = firstResponse.pagination ?? {
      page: 1,
      limit: PAGE_LIMIT,
      total: firstResponse.data.length,
      totalPages: 1,
    };

    const totalPages = Math.max(1, pagination.totalPages);

    if (totalPages === 1) {
      return {
        items: firstResponse.data,
        pagination,
      };
    }

    const remainingPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        couponsService.getCoupons({
          page: index + 2,
          limit: PAGE_LIMIT,
        }),
      ),
    );

    return {
      items: [
        ...firstResponse.data,
        ...remainingPages.flatMap((response) => response.data),
      ],
      pagination,
    };
  },

  /**
   * Lấy chi tiết một mã giảm giá.
   */
  async getCouponById(id: string): Promise<Coupon> {
    const response = await httpClient.get<ApiResponse<CouponApiItem>>(
      API_ENDPOINTS.coupons.detail(id),
    );

    return normalizeCoupon(response.data);
  },

  /**
   * Tạo mã giảm giá.
   */
  async createCoupon(payload: CouponPayload): Promise<Coupon> {
    const response = await httpClient.post<ApiResponse<CouponApiItem>>(
      BASE_URL,
      payload,
    );

    return normalizeCoupon(response.data);
  },

  /**
   * Cập nhật mã giảm giá.
   *
   * Backend không cho phép cập nhật code.
   */
  async updateCoupon(
    id: string,
    payload: CouponUpdatePayload,
  ): Promise<Coupon> {
    const response = await httpClient.put<ApiResponse<CouponApiItem>>(
      API_ENDPOINTS.coupons.detail(id),
      payload,
    );

    return normalizeCoupon(response.data);
  },

  /**
   * Bật / tắt mã giảm giá.
   */
  async toggleCouponStatus(id: string): Promise<Coupon> {
    const response = await httpClient.patch<ApiResponse<CouponApiItem>>(
      API_ENDPOINTS.coupons.status(id),
    );

    return normalizeCoupon(response.data);
  },

  /**
   * Xóa mã giảm giá.
   */
  async deleteCoupon(id: string): Promise<void> {
    await httpClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.coupons.detail(id),
    );
  },

  /**
   * Lấy lịch sử sử dụng mã giảm giá.
   */
  async getCouponUsages(
    id: string,
    params?: QueryParams,
  ): Promise<PaginatedResponse<CouponUsage>> {
    return httpClient.get<PaginatedResponse<CouponUsage>>(
      API_ENDPOINTS.coupons.usages(id),
      { params },
    );
  },
};