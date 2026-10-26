
/**
 * FILE: ADMIN/src/services/reviews/reviews.service.ts
 *
 * Cần xác nhận backend có route quản lý đánh giá tại /admin/reviews.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export interface UpdateReviewStatusPayload {
  status: string;
}

export const reviewsService = {
  getReviews(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.reviews.base,
      { params },
    );
  },

  getReviewById(id: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(id)}`,
    );
  },

  updateReviewStatus(
    id: string,
    payload: UpdateReviewStatusPayload,
  ) {
    return httpClient.patch<unknown>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(id)}/status`,
      payload,
    );
  },

  deleteReview(id: string) {
    return httpClient.delete<unknown>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(id)}`,
    );
  },
};
