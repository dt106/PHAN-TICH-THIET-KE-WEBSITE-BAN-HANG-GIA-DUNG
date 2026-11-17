
export type ConversationStatus = 'open' | 'pending' | 'closed';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export type ConversationSenderRole = 'customer' | 'admin';

export interface Conversation {
  id: string | number;
  customer_id: string | number;
  assigned_admin_id: string | number | null;
  subject: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  last_message_preview: string | null;
  customer_unread_count: number;
  admin_unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string | number;
  conversation_id: string | number;
  sender_id: string | number;
  message_type: MessageType;
  content: string | null;
  attachments: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Model giao diện danh sách hội thoại.
 * Các trường tên, email, avatar được ghép từ users
 * hoặc mock data, không phải cột trong conversations.
 */
export interface ConversationListItem extends Conversation {
  customer_name: string;
  customer_email: string;
  customer_avatar: string | null;
  assigned_admin_name: string | null;
}

/**
 * Model giao diện tin nhắn.
 * sender_name và sender_role được ghép để hiển thị
 * người gửi trong khung chat.
 */
export interface MessageView extends Message {
  sender_name: string;
  sender_role: ConversationSenderRole;
}

export interface ConversationFormValues {
  status: ConversationStatus;
  assigned_admin_id: number | null;
}
