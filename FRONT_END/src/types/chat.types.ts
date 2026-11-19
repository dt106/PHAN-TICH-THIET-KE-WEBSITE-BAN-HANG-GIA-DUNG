/**
 * FILE: FRONT_END/src/types/chat.types.ts
 *
 * ĐỊNH NGHĨA TYPES CHO REAL-TIME CHAT CSKH PHÍA KHÁCH HÀNG
 */

export type ConversationStatus = "pending" | "open" | "closed";

export type MessageType = "text" | "image" | "order" | "product" | "system";

export type SenderRole = "customer" | "admin" | "system";

export interface CustomerConversation {
  id: string;
  _id?: string;
  subject: string;
  status: ConversationStatus;
  assignedAdminName: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  customerUnreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  _id?: string;
  conversationId: string;
  conversation_id?: string;
  senderId: string;
  sender_id?: string;
  senderName: string;
  sender_name?: string;
  senderRole: SenderRole;
  sender_role?: string;
  messageType: MessageType;
  message_type?: string;
  content: string | null;
  attachments?: string[] | null;
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
}

export interface CreateConversationPayload {
  subject?: string;
  firstMessage: string;
}

export interface SendMessagePayload {
  content: string;
  messageType?: MessageType;
  attachments?: string[];
}
