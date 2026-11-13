
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';

import type { ApiResponse } from '../api/api.types';
import type {
  DashboardOverview,
  DashboardPeriod,
} from '../../types/dashboard.types';

export const dashboardService = {
  getOverview(
    period: DashboardPeriod = '30d',
    signal?: AbortSignal,
  ) {
    return httpClient.get<ApiResponse<DashboardOverview>>(
      API_ENDPOINTS.dashboard.overview,
      {
        params: { period },
        signal,
      },
    );
  },
};
