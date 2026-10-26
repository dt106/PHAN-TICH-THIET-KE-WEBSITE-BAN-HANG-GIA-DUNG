
/**
 * FILE: ADMIN/src/services/notifications/notifications.service.ts
 *
 * Route thông báo cần xác nhận với backend.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export const notificationsService = {
  getNotifications(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.notifications.base,
      { params },
    );
  },

  markAsRead(id: string) {
    return httpClient.patch<unknown>(
      `${API_ENDPOINTS.notifications.base}/${encodeURIComponent(id)}/read`,
    );
  },

  markAllAsRead() {
    return httpClient.patch<unknown>(
      `${API_ENDPOINTS.notifications.base}/read-all`,
    );
  },
};
