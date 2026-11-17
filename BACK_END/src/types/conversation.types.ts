/**
 * FILE: BACK_END/src/types/conversation.types.ts
 *
 * Định nghĩa các kiểu dữ liệu cho phân hệ Hội thoại CSKH.
 */

export type ConversationStatus = "open" | "pending" | "closed";

export type MessageType = "text" | "image" | "file" | "system";

export type ConversationSenderRole = "customer" | "admin";
