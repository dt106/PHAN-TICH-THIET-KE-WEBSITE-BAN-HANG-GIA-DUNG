/**
 * ============================================================================
 * FILE: BACK_END/src/socket/socketEmitter.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Module phát sự kiện Socket.IO toàn cục cho toàn bộ Backend Services.
 * - Giải quyết triệt để vấn đề phụ thuộc vòng (circular dependency):
 *   Services -> SocketEmitter -> Socket Server Hub (getIO).
 * - Cung cấp các hàm tiện ích phát sự kiện chuẩn hóa theo thiết kế:
 *   1. emitNewMessage: Gửi tin nhắn mới tới room ca chat (conversation:{id})
 *   2. emitConversationUpdated: Gửi thông tin cập nhật hội thoại tới admin_channel và room ca chat
 *   3. emitKpiUpdated: Gửi 4 chỉ số thống kê hội thoại tới admin_channel
 *   4. emitConversationStatusChanged: Gửi sự kiện đổi trạng thái ca tới room ca chat & admin_channel
 * - Thiết kế an toàn (Fail-safe): Không ném ngoại lệ làm crash service nếu Socket.IO
 *   chưa khởi tạo (ví dụ khi chạy test REST API cô lập, script CLI, migrate dữ liệu).
 * ============================================================================
 */

import type { Server } from "socket.io";
import { getIO } from "./index";

/**
 * Lấy singleton instance Socket.IO Server một cách an toàn.
 * Trả về null nếu Socket Server chưa được initSocket(httpServer).
 */
export const getSafeIO = (): Server | null => {
  try {
    return getIO();
  } catch (_error) {
    return null;
  }
};

/**
 * 1. Phát sự kiện có tin nhắn mới (new_message)
 * Gửi tới room cuộc trò chuyện: conversation:${conversationId}
 * 
 * @param conversationId ID của cuộc hội thoại
 * @param message Đối tượng tin nhắn đã format chuẩn hiển thị
 * @returns boolean true nếu đã phát thành công, false nếu socket chưa sẵn sàng
 */
export const emitNewMessage = (conversationId: string, message: any): boolean => {
  const io = getSafeIO();
  if (!io || !conversationId) {
    return false;
  }

  const room = `conversation:${conversationId}`;
  io.to(room).emit("new_message", message);
  console.log(
    `📡 [SocketEmitter] emitNewMessage -> ${room}: messageId=${message?.id || message?._id || "unknown"}`
  );
  return true;
};

/**
 * 2. Phát sự kiện cập nhật thông tin hội thoại (conversation_updated)
 * Gửi tới room admin_channel và room cuộc trò chuyện conversation:${conversationId}
 * Giúp Admin Portal cập nhật tin nhắn preview, badge tin chưa đọc và đưa hội thoại lên đầu danh sách.
 * 
 * @param conversation Đối tượng hội thoại đã format chuẩn
 * @returns boolean true nếu đã phát thành công, false nếu socket chưa sẵn sàng
 */
export const emitConversationUpdated = (conversation: any): boolean => {
  const io = getSafeIO();
  if (!io || !conversation) {
    return false;
  }

  const convId = conversation.id || conversation._id || conversation.conversationId;
  const conversationRoom = convId ? `conversation:${convId}` : null;

  // Gửi tới kênh tổng đài Admin
  io.to("admin_channel").emit("conversation_updated", conversation);

  // Gửi tới room riêng của ca trò chuyện
  if (conversationRoom) {
    io.to(conversationRoom).emit("conversation_updated", conversation);
  }

  console.log(
    `📡 [SocketEmitter] emitConversationUpdated -> admin_channel ${
      conversationRoom ? `& ${conversationRoom}` : ""
    }`
  );
  return true;
};

/**
 * 3. Phát sự kiện cập nhật 4 chỉ số KPI Dashboard (kpi_updated)
 * Gửi tới room admin_channel
 * 
 * @param kpiStats { total: number, open: number, pending: number, unread: number }
 * @returns boolean true nếu đã phát thành công, false nếu socket chưa sẵn sàng
 */
export const emitKpiUpdated = (kpiStats: {
  total: number;
  open: number;
  pending: number;
  unread: number;
  [key: string]: any;
}): boolean => {
  const io = getSafeIO();
  if (!io || !kpiStats) {
    return false;
  }

  io.to("admin_channel").emit("kpi_updated", kpiStats);
  console.log(
    `📡 [SocketEmitter] emitKpiUpdated -> admin_channel: total=${kpiStats.total}, open=${kpiStats.open}, pending=${kpiStats.pending}, unread=${kpiStats.unread}`
  );
  return true;
};

/**
 * 4. Phát sự kiện thay đổi trạng thái hội thoại (conversation_status_changed)
 * Gửi tới room conversation:${conversationId} và admin_channel
 * 
 * @param conversationId ID của cuộc hội thoại
 * @param status Trạng thái mới: "pending" | "open" | "closed"
 * @returns boolean true nếu đã phát thành công, false nếu socket chưa sẵn sàng
 */
export const emitConversationStatusChanged = (
  conversationId: string,
  status: string
): boolean => {
  const io = getSafeIO();
  if (!io || !conversationId) {
    return false;
  }

  const payload = {
    conversationId: conversationId.toString(),
    status,
    timestamp: new Date().toISOString(),
  };

  const room = `conversation:${conversationId}`;
  io.to(room).emit("conversation_status_changed", payload);
  io.to("admin_channel").emit("conversation_status_changed", payload);

  console.log(
    `📡 [SocketEmitter] emitConversationStatusChanged -> ${room} & admin_channel: status=${status}`
  );
  return true;
};

/**
 * 5. Phát sự kiện người dùng đang soạn tin nhắn (user_typing)
 * Gửi tới room conversation:${conversationId}
 *
 * @param conversationId ID của cuộc hội thoại
 * @param payload { userId, userName, isTyping, role }
 * @returns boolean true nếu đã phát thành công, false nếu socket chưa sẵn sàng
 */
export const emitUserTyping = (
  conversationId: string,
  payload: {
    userId: string;
    userName: string;
    isTyping: boolean;
    role?: string;
  }
): boolean => {
  const io = getSafeIO();
  if (!io || !conversationId) {
    return false;
  }

  const room = `conversation:${conversationId}`;
  io.to(room).emit("user_typing", {
    ...payload,
    conversationId: conversationId.toString(),
  });

  console.log(
    `📡 [SocketEmitter] emitUserTyping -> ${room}: user=${payload.userName}, isTyping=${payload.isTyping}`
  );
  return true;
};

export default {
  getSafeIO,
  emitNewMessage,
  emitConversationUpdated,
  emitKpiUpdated,
  emitConversationStatusChanged,
  emitUserTyping,
};
