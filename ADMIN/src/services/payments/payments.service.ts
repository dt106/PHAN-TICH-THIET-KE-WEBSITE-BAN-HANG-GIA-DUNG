
/**
 * FILE: ADMIN/src/services/payments/payments.service.ts
 *
 * API hoàn tiền/đối soát chỉ sử dụng nếu backend có route tương ứng.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export const paymentsService = {
  getPayments(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.payments.base,
      { params },
    );
  },

  getPaymentById(id: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.payments.base}/${encodeURIComponent(id)}`,
    );
  },

  reconcilePayment(id: string) {
    return httpClient.post<unknown>(
      `${API_ENDPOINTS.payments.base}/${encodeURIComponent(id)}/reconcile`,
    );
  },

  refundPayment(id: string, payload?: { amount?: number; reason?: string }) {
    return httpClient.post<unknown>(
      `${API_ENDPOINTS.payments.base}/${encodeURIComponent(id)}/refund`,
      payload,
    );
  },
};
