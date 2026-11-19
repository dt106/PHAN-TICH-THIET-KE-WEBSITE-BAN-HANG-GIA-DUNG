/**
 * FILE: FRONT_END/src/services/customerConversation.service.ts
 *
 * DỊCH VỤ GỌI API HỘI THOẠI CSKH DÀNH CHO KHÁCH HÀNG (CUSTOMER)
 */

import { request } from "./http.ts";
import type {
  CustomerConversation,
  ChatMessage,
  CreateConversationPayload,
  SendMessagePayload,
} from "../types/chat.types.ts";

export const customerConversationService = {
  /**
   * 1. Lấy cuộc hội thoại đang mở gần nhất để hiển thị ngay trên widget
   * Endpoint: GET /api/customer/conversations/current
   */
  async getCurrentConversation(): Promise<CustomerConversation | null> {
    const res = await request<CustomerConversation | null>(
      "/api/customer/conversations/current"
    );
    return res.data;
  },

  /**
   * 2. Khách hàng tạo/mở cuộc hội thoại mới với lời chào/câu hỏi đầu tiên
   * Endpoint: POST /api/customer/conversations
   */
  async createConversation(payload: CreateConversationPayload): Promise<{
    conversation: CustomerConversation;
    message: ChatMessage;
  }> {
    const res = await request<{
      conversation: CustomerConversation;
      message: ChatMessage;
    }>("/api/customer/conversations", {
      method: "POST",
      body: payload,
    });
    return res.data;
  },

  /**
   * 3. Lấy toàn bộ lịch sử tin nhắn của cuộc hội thoại
   * Endpoint: GET /api/customer/conversations/:id/messages
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const res = await request<ChatMessage[]>(
      `/api/customer/conversations/${conversationId}/messages`
    );
    return res.data;
  },

  /**
   * 4. Gửi tin nhắn mới vào cuộc hội thoại (tự động re-open nếu ca trước đó đã đóng)
   * Endpoint: POST /api/customer/conversations/:id/messages
   */
  async sendMessage(
    conversationId: string,
    payload: SendMessagePayload
  ): Promise<ChatMessage> {
    const res = await request<ChatMessage>(
      `/api/customer/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: payload,
      }
    );
    return res.data;
  },

  /**
   * 5. Đánh dấu khách hàng đã đọc toàn bộ tin nhắn trong ca chat
   * Endpoint: PATCH /api/customer/conversations/:id/read
   */
  async markRead(conversationId: string): Promise<void> {
    await request<null>(`/api/customer/conversations/${conversationId}/read`, {
      method: "PATCH",
    });
  },
};

export default customerConversationService;
