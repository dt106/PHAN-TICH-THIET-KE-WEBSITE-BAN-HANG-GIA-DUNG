/**
 * FILE: FRONT_END/src/services/socket/socketClient.ts
 *
 * QUẢN LÝ KẾT NỐI SOCKET.IO CLIENT CHO GIAO DIỆN KHÁCH HÀNG (CUSTOMER)
 */

import { io, type Socket } from "socket.io-client";
import { readToken } from "../session.ts";

let socketInstance: Socket | null = null;

/**
 * Xác định URL kết nối Socket.IO
 */
export function resolveSocketUrl(): string {
  // 1. Biến cấu hình socket chuyên biệt
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (envSocketUrl && typeof envSocketUrl === "string") {
    return envSocketUrl.replace(/\/+$/, "");
  }

  // 2. Biến URL API
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === "string" && envApiUrl.startsWith("http")) {
    try {
      const parsed = new URL(envApiUrl);
      return parsed.origin;
    } catch {
      return envApiUrl.replace(/\/+$/, "");
    }
  }

  // 3. Fallback cho trình duyệt khi chạy localhost:3000
  if (typeof window !== "undefined" && window.location?.origin) {
    if (window.location.port === "3000") {
      return "http://localhost:5000";
    }
    return window.location.origin;
  }

  return "http://localhost:5000";
}

/**
 * Lấy hoặc khởi tạo singleton instance Socket.IO
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = resolveSocketUrl();

    socketInstance = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        const token = readToken() || "";
        cb({ token });
      },
    });

    socketInstance.on("connect", () => {
      console.log(
        `💬 [CustomerSocket] Kết nối thành công (id=${socketInstance?.id}) tới ${socketUrl}`
      );
    });

    socketInstance.on("connect_error", (error) => {
      console.warn("⚠️ [CustomerSocket] Lỗi kết nối Socket:", error.message);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("💬 [CustomerSocket] Đã ngắt kết nối Socket:", reason);
    });

    if (typeof window !== "undefined") {
      (window as any).__customerSocket = socketInstance;
    }
  }

  return socketInstance;
}

/**
 * Kích hoạt kết nối Socket với token hiện tại
 */
export function connectSocket(): Socket {
  const socket = getSocket();
  const token = readToken();

  if (token) {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/**
 * Ngắt kết nối Socket
 */
export function disconnectSocket(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
}

/**
 * Gửi yêu cầu gia nhập room cuộc trò chuyện
 */
export function joinConversation(conversationId: string): void {
  const socket = getSocket();
  if (socket && conversationId) {
    socket.emit("join_conversation", { conversationId });
  }
}

/**
 * Rời khỏi room cuộc trò chuyện
 */
export function leaveConversation(conversationId: string): void {
  const socket = getSocket();
  if (socket && conversationId) {
    socket.emit("leave_conversation", { conversationId });
  }
}

export default {
  resolveSocketUrl,
  getSocket,
  connectSocket,
  disconnectSocket,
  joinConversation,
  leaveConversation,
};
