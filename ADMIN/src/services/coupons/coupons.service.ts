
/**
 * FILE: ADMIN/src/services/coupons/coupons.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';
import type { QueryParams } from '../api/api.types';
import { httpClient } from '../api/httpClient';

export interface Coupon {
  _id: string;
  code: string;
  discountType?: string;
  discountValue?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export type CouponPayload = Omit<Coupon, '_id'>;

const resource = createResourceService<
  Coupon,
  CouponPayload,
  Partial<CouponPayload>
>({
  base: API_ENDPOINTS.coupons.base,
});

export const couponsService = {
  ...resource,

  getCoupons(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.coupons.base,
      { params },
    );
  },

  getCouponUsage(id: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.coupons.base}/${encodeURIComponent(id)}/usage`,
    );
  },
};
