
/**
 * FILE: ADMIN/src/services/conversations/conversations.service.ts
 *
 * Endpoint cần khớp với module AI chat/conversation trong backend.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export const conversationsService = {
  getConversations(params?: QueryParams) {
    return httpClient.get<unknown>(
      API_ENDPOINTS.conversations.base,
      { params },
    );
  },

  getConversationById(id: string) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}`,
    );
  },

  getConversationMessages(id: string, params?: QueryParams) {
    return httpClient.get<unknown>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/messages`,
      { params },
    );
  },
};
