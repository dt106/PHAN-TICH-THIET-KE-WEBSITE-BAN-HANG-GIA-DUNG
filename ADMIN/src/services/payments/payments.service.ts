
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';

import type { QueryParams } from '../api/api.types';

import type {
  PaymentListParams,
  PaymentListResponse,
  PaymentRefundPayload,
  PaymentRefundResponse,
} from '../../types/payment.types';

export const paymentsService = {
  /**
   * GET /api/admin/payments
   * Lấy danh sách thanh toán, bộ lọc, phân trang và thống kê.
   */
  getPayments(
    params?: PaymentListParams,
  ): Promise<PaymentListResponse> {
    return httpClient.get<PaymentListResponse>(
      API_ENDPOINTS.payments.base,
      {
        params: params as QueryParams | undefined,
      },
    );
  },

  /**
   * POST /api/admin/payments/:id/refund
   * Hoàn tiền giao dịch.
   */
  refundPayment(
    id: string,
    payload?: PaymentRefundPayload,
  ): Promise<PaymentRefundResponse> {
    return httpClient.post<PaymentRefundResponse>(
      `${API_ENDPOINTS.payments.base}/${encodeURIComponent(id)}/refund`,
      payload,
    );
  },
};
