
/**
 * FILE: ADMIN/src/services/dashboard/dashboard.service.ts
 *
 * Các đường dẫn dashboard hiện là cấu hình dự kiến.
 * Đối chiếu với admin.statistics.routes.ts trước khi gọi.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export const dashboardService = {
  getOverview(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.dashboard.overview,
      { params },
    );
  },

  getRevenue(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.dashboard.revenue,
      { params },
    );
  },

  getOrderStatistics(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.dashboard.orders,
      { params },
    );
  },

  getProductStatistics(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.dashboard.products,
      { params },
    );
  },

  getCustomerStatistics(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.dashboard.customers,
      { params },
    );
  },
};
