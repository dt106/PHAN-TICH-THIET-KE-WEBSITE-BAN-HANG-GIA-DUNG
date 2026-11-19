/**
 * ============================================================================
 * FILE: BACK_END/src/socket/index.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Khởi tạo và quản lý Socket.IO Server tập trung cho hệ thống Backend.
 * - Middleware xác thực bảo mật JWT qua Socket Handshake (auth.token / authorization header).
 * - Phân loại role tự động:
 *   + Tài khoản Admin tự động gia nhập phòng `admin_channel`.
 *   + Khách hàng kết nối vào namespace/socket riêng của họ (`user:${userId}`).
 * - Lắng nghe các sự kiện:
 *   + `join_conversation`: Kiểm tra quyền sở hữu ca chat (Khách chỉ vào ca của mình, Admin vào được mọi ca)
 *   + `leave_conversation`: Rời khỏi room `conversation:${conversationId}`
 * ============================================================================
 */

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { Conversation, User } from "../models";

declare module "socket.io" {
  interface SocketData {
    user: JwtPayload;
  }
}

let io: Server | null = null;

/**
 * Lấy danh sách CORS allowed origins từ biến môi trường CLIENT_URL
 * Mặc định hỗ trợ http://localhost:5173 và http://localhost:3000
 */
export const getAllowedOrigins = (): string[] => {
  const defaultOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  const envOrigins = (process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
};

/**
 * Trích xuất JWT token từ socket handshake (auth.token hoặc headers.authorization)
 */
export const extractHandshakeToken = (socket: Socket): string | null => {
  const rawToken: unknown =
    socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  if (typeof rawToken !== "string") {
    return null;
  }

  let tokenStr = rawToken.trim();
  if (!tokenStr) {
    return null;
  }

  if (tokenStr.startsWith("Bearer ")) {
    tokenStr = tokenStr.slice(7).trim();
  }

  return tokenStr || null;
};

/**
 * Khởi tạo Socket.IO Server gắn với HTTP Server
 */
export const initSocket = (httpServer: HttpServer): Server => {
  const allowedOrigins = getAllowedOrigins();

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // ==========================================================================
  // MIDDLEWARE XÁC THỰC BẢO MẬT JWT HANDSHAKE
  // ==========================================================================
  io.use((socket: Socket, next) => {
    try {
      const token = extractHandshakeToken(socket);

      if (!token) {
        return next(
          new Error("Authentication error: Invalid or expired token")
        );
      }

      // Xác thực token bằng hàm verifyToken từ src/utils/jwt.ts
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId || !decoded.role) {
        return next(
          new Error("Authentication error: Invalid or expired token")
        );
      }

      // Lưu thông tin user đã giải mã vào socket.data.user
      socket.data.user = {
        ...decoded,
        name: decoded.name || (decoded.role === "admin" ? "CSKH" : "Khách hàng"),
      };

      // Tự động nạp tên hiển thị từ DB nếu MongoDB sẵn sàng
      if (
        mongoose.connection.readyState === 1 &&
        mongoose.Types.ObjectId.isValid(decoded.userId)
      ) {
        User.findById(decoded.userId)
          .select("name")
          .lean()
          .then((foundUser) => {
            if (foundUser?.name) {
              socket.data.user.name = foundUser.name;
            }
          })
          .catch(() => {});
      }

      return next();
    } catch (_error) {
      return next(
        new Error("Authentication error: Invalid or expired token")
      );
    }
  });

  // ==========================================================================
  // LẮNG NGHE SỰ KIỆN CONNECTION
  // ==========================================================================
  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(
      `🔌 [Socket.IO] Client kết nối thành công: socketId=${socket.id}, userId=${user.userId}, role=${user.role}`
    );

    // Người dùng (khách hoặc admin) tự động tham gia room cá nhân của họ
    socket.join(`user:${user.userId}`);

    // Tài khoản Admin tự động gia nhập phòng admin_channel
    if (user.role === "admin") {
      socket.join("admin_channel");
      console.log(`🛡️ [Socket.IO] Admin ${user.userId} đã gia nhập room admin_channel`);
    }

    // Gửi sự kiện xác nhận kết nối thành công tới client
    socket.emit("connected", {
      success: true,
      message: "Kết nối Socket.IO thành công",
      user: {
        userId: user.userId,
        role: user.role,
      },
    });

    // Sự kiện get_rooms: cho phép client tra cứu các room socket đang tham gia (phục vụ kiểm thử & audit)
    socket.on("get_rooms", (callback?: (rooms: string[]) => void) => {
      const currentRooms = Array.from(socket.rooms);
      if (typeof callback === "function") {
        callback(currentRooms);
      } else {
        socket.emit("my_rooms", currentRooms);
      }
    });

    // ========================================================================
    // SỰ KIỆN: join_conversation
    // Kiểm tra quyền sở hữu ca chat:
    // - Admin vào được mọi ca chat
    // - Khách hàng chỉ được vào ca của chính mình
    // ========================================================================
    socket.on(
      "join_conversation",
      async (
        payload: string | { conversationId: string },
        callback?: (res: { success: boolean; message?: string; conversationId?: string }) => void
      ) => {
        try {
          const conversationId =
            typeof payload === "string" ? payload : payload?.conversationId;

          if (!conversationId) {
            const errRes = {
              success: false,
              message: "conversationId là bắt buộc",
            };
            socket.emit("error_event", errRes);
            if (typeof callback === "function") callback(errRes);
            return;
          }

          // Kiểm tra quyền sở hữu ca chat nếu không phải admin
          if (user.role !== "admin") {
            if (mongoose.connection.readyState === 1) {
              if (!mongoose.Types.ObjectId.isValid(conversationId)) {
                const errRes = {
                  success: false,
                  message: "ID hội thoại không hợp lệ",
                };
                socket.emit("error_event", errRes);
                if (typeof callback === "function") callback(errRes);
                return;
              }

              const conversation = await Conversation.findById(conversationId)
                .select("customerId")
                .lean();

              if (!conversation) {
                const errRes = {
                  success: false,
                  message: "Không tìm thấy cuộc hội thoại",
                };
                socket.emit("error_event", errRes);
                if (typeof callback === "function") callback(errRes);
                return;
              }

              if (conversation.customerId.toString() !== user.userId) {
                const errRes = {
                  success: false,
                  message: "Bạn không có quyền truy cập vào cuộc hội thoại này",
                };
                socket.emit("error_event", errRes);
                if (typeof callback === "function") callback(errRes);
                return;
              }
            }
          }

          const roomName = `conversation:${conversationId}`;
          await socket.join(roomName);
          console.log(
            `💬 [Socket.IO] ${user.role} ${user.userId} đã gia nhập room ${roomName}`
          );

          const successRes = {
            success: true,
            conversationId,
            message: `Gia nhập room ${roomName} thành công`,
          };
          socket.emit("joined_conversation", successRes);
          if (typeof callback === "function") callback(successRes);
        } catch (error: any) {
          console.error("❌ Lỗi join_conversation:", error);
          const errRes = {
            success: false,
            message: error.message || "Lỗi xử lý join_conversation",
          };
          socket.emit("error_event", errRes);
          if (typeof callback === "function") callback(errRes);
        }
      }
    );

    // ========================================================================
    // SỰ KIỆN: leave_conversation
    // ========================================================================
    socket.on(
      "leave_conversation",
      async (
        payload: string | { conversationId: string },
        callback?: (res: { success: boolean; message?: string; conversationId?: string }) => void
      ) => {
        try {
          const conversationId =
            typeof payload === "string" ? payload : payload?.conversationId;

          if (!conversationId) {
            const errRes = {
              success: false,
              message: "conversationId là bắt buộc",
            };
            socket.emit("error_event", errRes);
            if (typeof callback === "function") callback(errRes);
            return;
          }

          const roomName = `conversation:${conversationId}`;
          await socket.leave(roomName);
          console.log(
            `🚪 [Socket.IO] ${user.role} ${user.userId} đã rời khỏi room ${roomName}`
          );

          const successRes = {
            success: true,
            conversationId,
            message: `Rời khỏi room ${roomName} thành công`,
          };
          socket.emit("left_conversation", successRes);
          if (typeof callback === "function") callback(successRes);
        } catch (error: any) {
          console.error("❌ Lỗi leave_conversation:", error);
          const errRes = {
            success: false,
            message: error.message || "Lỗi xử lý leave_conversation",
          };
          socket.emit("error_event", errRes);
          if (typeof callback === "function") callback(errRes);
        }
      }
    );

    // ========================================================================
    // SỰ KIỆN: typing_start
    // Bắt đầu soạn tin nhắn -> Phát tín hiệu user_typing (isTyping: true) tới room ca chat
    // ========================================================================
    socket.on(
      "typing_start",
      (payload: { conversationId?: string; userName?: string } | string) => {
        const conversationId =
          typeof payload === "string" ? payload : payload?.conversationId;
        const customUserName =
          typeof payload === "object" ? payload?.userName : undefined;

        if (!conversationId) return;

        const roomName = `conversation:${conversationId}`;
        const senderName =
          customUserName ||
          socket.data.user?.name ||
          (user.role === "admin" ? "CSKH" : "Khách hàng");

        socket.to(roomName).emit("user_typing", {
          userId: user.userId,
          userName: senderName,
          role: user.role,
          conversationId: String(conversationId),
          isTyping: true,
        });

        console.log(
          `✍️ [Socket.IO] typing_start: ${user.role} ${user.userId} (${senderName}) trong ${roomName}`
        );
      }
    );

    // ========================================================================
    // SỰ KIỆN: typing_stop
    // Dừng soạn tin nhắn -> Phát tín hiệu user_typing (isTyping: false) tới room ca chat
    // ========================================================================
    socket.on(
      "typing_stop",
      (payload: { conversationId?: string; userName?: string } | string) => {
        const conversationId =
          typeof payload === "string" ? payload : payload?.conversationId;
        const customUserName =
          typeof payload === "object" ? payload?.userName : undefined;

        if (!conversationId) return;

        const roomName = `conversation:${conversationId}`;
        const senderName =
          customUserName ||
          socket.data.user?.name ||
          (user.role === "admin" ? "CSKH" : "Khách hàng");

        socket.to(roomName).emit("user_typing", {
          userId: user.userId,
          userName: senderName,
          role: user.role,
          conversationId: String(conversationId),
          isTyping: false,
        });

        console.log(
          `🛑 [Socket.IO] typing_stop: ${user.role} ${user.userId} trong ${roomName}`
        );
      }
    );

    // ========================================================================
    // SỰ KIỆN: disconnect
    // ========================================================================
    socket.on("disconnect", (reason) => {
      console.log(
        `🔌 [Socket.IO] Socket ${socket.id} (user: ${user.userId}) đã ngắt kết nối: ${reason}`
      );
    });
  });

  return io;
};

/**
 * Trả về Socket.IO Server singleton instance
 */
export const getIO = (): Server => {
  if (!io) {
    throw new Error(
      "Socket.IO chưa được khởi tạo! Hãy gọi initSocket(httpServer) trước."
    );
  }
  return io;
};

export * from "./socketEmitter";

export default {
  initSocket,
  getIO,
  getAllowedOrigins,
  extractHandshakeToken,
};
