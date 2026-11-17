/**
 * FILE: ADMIN/src/services/conversations/conversations.service.ts
 *
 * Quản lý API hội thoại chăm sóc khách hàng (CSKH) phía Admin.
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';
import type {
  ConversationListItem,
  ConversationStatus,
  MessageView,
} from '../../types/conversation.types';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ConversationStatistics {
  total: number;
  open: number;
  pending: number;
  unread: number;
}

export interface AdminAssignee {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

export const conversationsService = {
  /**
   * Lấy danh sách cuộc hội thoại có tìm kiếm, lọc theo trạng thái và phân trang
   */
  getConversations(params?: QueryParams) {
    return httpClient.get<ApiResponse<ConversationListItem[]>>(
      API_ENDPOINTS.conversations.base,
      { params },
    );
  },

  /**
   * Lấy 4 chỉ số thống kê (total, open, pending, unread)
   */
  getStatistics() {
    return httpClient.get<ApiResponse<ConversationStatistics>>(
      `${API_ENDPOINTS.conversations.base}/statistics`,
    );
  },

  /**
   * Lấy danh sách nhân viên CSKH / Admin phục vụ dropdown phân công
   */
  getAssignees() {
    return httpClient.get<ApiResponse<AdminAssignee[]>>(
      `${API_ENDPOINTS.conversations.base}/assignees`,
    );
  },

  /**
   * Lấy chi tiết một cuộc hội thoại
   */
  getConversationById(id: string | number) {
    return httpClient.get<ApiResponse<ConversationListItem>>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}`,
    );
  },

  /**
   * Lấy danh sách tin nhắn của cuộc hội thoại
   */
  getConversationMessages(id: string | number, params?: QueryParams) {
    return httpClient.get<ApiResponse<MessageView[]>>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/messages`,
      { params },
    );
  },

  /**
   * Admin gửi tin nhắn trả lời khách hàng
   */
  sendMessage(
    id: string | number,
    payload: {
      content: string;
      messageType?: 'text' | 'image' | 'file';
      attachments?: string[];
    },
  ) {
    return httpClient.post<ApiResponse<MessageView>>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/messages`,
      payload,
    );
  },

  /**
   * Phân công hoặc bàn giao nhân viên phụ trách
   */
  assignAdmin(id: string | number, assignedAdminId: string | number | null) {
    return httpClient.patch<
      ApiResponse<{
        conversation: ConversationListItem;
        systemMessage: MessageView;
      }>
    >(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/assign`,
      { assignedAdminId: assignedAdminId ? String(assignedAdminId) : null },
    );
  },

  /**
   * Cập nhật trạng thái hội thoại (đóng / mở lại)
   */
  updateStatus(id: string | number, status: ConversationStatus) {
    return httpClient.patch<
      ApiResponse<{
        conversation: ConversationListItem;
        systemMessage: MessageView;
      }>
    >(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/status`,
      { status },
    );
  },

  /**
   * Đánh dấu Admin đã đọc tin nhắn trong cuộc hội thoại
   */
  markRead(id: string | number) {
    return httpClient.patch<ApiResponse<unknown>>(
      `${API_ENDPOINTS.conversations.base}/${encodeURIComponent(id)}/read`,
    );
  },
};
