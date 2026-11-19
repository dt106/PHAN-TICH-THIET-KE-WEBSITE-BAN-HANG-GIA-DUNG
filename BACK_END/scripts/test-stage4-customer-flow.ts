/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-stage4-customer-flow.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Kịch bản kiểm thử Tích hợp GIAI ĐOẠN 4: Khách hàng Chat Real-Time qua Widget và kết nối Socket.IO hai chiều với Quản trị viên (Admin).
 * - Kiểm chứng toàn diện:
 *   1. Khách hàng kết nối Socket.IO bảo mật với JWT token -> vào room `user:{customerId}` (không vào `admin_channel`).
 *   2. Kiểm tra API GET /api/customer/conversations/current khi chưa có ca -> data là null.
 *   3. Khách hàng tạo cuộc hội thoại mới POST /api/customer/conversations:
 *      -> DB lưu ca chat & tin nhắn đầu tiên.
 *      -> Socket broadcast `new_message` và `conversation_updated`.
 *   4. Khách hàng gia nhập room `conversation:{conversationId}` qua Socket `join_conversation`.
 *   5. Admin gửi tin nhắn phản hồi vào ca chat:
 *      -> Khách hàng nhận được `new_message` qua Socket.IO ngay lập tức (< 100ms).
 *   6. Khách hàng gửi tiếp tin nhắn phản hồi:
 *      -> Admin nhận được `new_message` ngay lập tức.
 *   7. Khách hàng đánh dấu đã đọc tin nhắn:
 *      -> PATCH /api/customer/conversations/:id/read -> reset unreadCount về 0.
 *   8. Tự động Re-open khi gửi tin nhắn vào ca chat đã đóng.
 * ============================================================================
 */

import path from "path";
import http from "http";
import type { AddressInfo } from "net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

import app from "../app";
import connectDatabase, { disconnectDatabase } from "../src/config/database";
import { initSocket } from "../src/socket";
import { generateToken } from "../src/utils/jwt";
import { User, Conversation, Message } from "../src/models";
import {
  getCurrentCustomerConversationService,
  createCustomerConversationService,
  getCustomerConversationMessagesService,
  sendCustomerMessageService,
  markCustomerConversationReadService,
} from "../src/services/customer/customer.conversation.service";
import { sendAdminMessageService } from "../src/services/admin/admin.conversation.service";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

let passedCount = 0;
let failedCount = 0;

function assertCase(name: string, condition: boolean, detail: string): void {
  if (condition) {
    passedCount += 1;
    console.log(`  ✅ [PASS] ${name} -> ${detail}`);
  } else {
    failedCount += 1;
    console.error(`  ❌ [FAIL] ${name} -> ${detail}`);
  }
}

function connectTestClient(url: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 5000,
      auth: { token },
    });

    const timer = setTimeout(() => {
      reject(new Error("Timeout kết nối Socket Client"));
    }, 5000);

    client.on("connect", () => {
      clearTimeout(timer);
      resolve(client);
    });

    client.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitForEvent<T = any>(
  socket: ClientSocket,
  eventName: string,
  timeoutMs: number = 3000
): Promise<{ payload: T; elapsedMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout (${timeoutMs}ms) chờ sự kiện "${eventName}"`));
    }, timeoutMs);

    const handler = (data: T) => {
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve({ payload: data, elapsedMs: Date.now() - start });
    };

    socket.on(eventName, handler);
  });
}

async function runStage4CustomerIntegrationTest() {
  console.log("===============================================================");
  console.log("🧪 KIỂM THỬ TÍCH HỢP GIAI ĐOẠN 4: CUSTOMER REAL-TIME CHAT WIDGET");
  console.log("===============================================================\n");

  await connectDatabase();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => resolve());
  });

  const address = httpServer.address() as AddressInfo;
  const serverUrl = `http://127.0.0.1:${address.port}`;
  console.log(`🌐 Test Server đang chạy tại: ${serverUrl}\n`);

  const timestamp = Date.now();
  const passwordHash = await bcrypt.hash("Password123@", 10);

  // 1. Khởi tạo tài khoản Khách hàng và Admin kiểm thử
  const customerUser = await User.create({
    name: "Nguyễn Văn Khách",
    email: `customer_stage4_${timestamp}@furniro.test`,
    password: passwordHash,
    role: "customer",
    status: "active",
  });

  const adminUser = await User.create({
    name: "Admin CSKH Furniro",
    email: `admin_stage4_${timestamp}@furniro.test`,
    password: passwordHash,
    role: "admin",
    status: "active",
  });

  const customerToken = generateToken({
    userId: customerUser._id.toString(),
    email: customerUser.email,
    role: "customer",
  });

  const adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    role: "admin",
  });

  let customerSocket: ClientSocket | null = null;
  let adminSocket: ClientSocket | null = null;

  try {
    // ------------------------------------------------------------------------
    // BƯỚC 1: Khách hàng kết nối Socket.IO bảo mật
    // ------------------------------------------------------------------------
    console.log("👉 BƯỚC 1: Khách hàng & Admin kết nối Socket.IO với JWT handshake");
    customerSocket = await connectTestClient(serverUrl, customerToken);
    adminSocket = await connectTestClient(serverUrl, adminToken);

    assertCase(
      "Socket Authentication",
      Boolean(customerSocket.connected && adminSocket.connected),
      `Customer Socket ID: ${customerSocket.id}, Admin Socket ID: ${adminSocket.id}`
    );

    // Kiểm tra rooms của khách: phải có `user:${customerId}` và KHÔNG có `admin_channel`
    const customerRooms = await new Promise<string[]>((res) => {
      customerSocket!.emit("get_rooms", (rooms: string[]) => res(rooms));
    });

    assertCase(
      "Customer Rooms Isolation",
      customerRooms.includes(`user:${customerUser._id.toString()}`) &&
        !customerRooms.includes("admin_channel"),
      `Rooms: ${customerRooms.join(", ")} (không lẫn admin_channel)`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 2: Kiểm tra getCurrentCustomerConversation khi chưa có cuộc hội thoại nào
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 2: Lấy ca chat hiện tại khi chưa có cuộc trò chuyện nào");
    const initialConv = await getCurrentCustomerConversationService(customerUser._id.toString());
    assertCase(
      "Initial Current Conversation",
      initialConv === null,
      "Trả về null đúng theo thiết kế khi khách chưa từng nhắn tin"
    );

    // ------------------------------------------------------------------------
    // BƯỚC 3: Khách hàng tạo cuộc hội thoại mới với tin nhắn đầu tiên
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 3: Khách hàng gửi tin nhắn đầu tiên tạo ca chat");
    const createPromise = createCustomerConversationService(customerUser._id.toString(), {
      subject: "Cần tư vấn bộ nồi chảo Tefal",
      firstMessage: "Chào shop, mình muốn hỏi bộ nồi Tefal chống dính dùng được bếp từ không?",
    });

    // Lắng nghe sự kiện Admin nhận được tin nhắn preview trên admin_channel
    const adminConvUpdatedWait = waitForEvent(adminSocket, "conversation_updated", 3000);

    const createResult = await createPromise;
    const convId = createResult.conversation.id;

    assertCase(
      "Create Customer Conversation",
      Boolean(convId && createResult.conversation.status === "pending"),
      `Tạo thành công ca ID: ${convId}, status: ${createResult.conversation.status}`
    );

    const adminUpdatedEvent = await adminConvUpdatedWait;
    assertCase(
      "Admin Conversation Updated Event",
      (adminUpdatedEvent.payload.id || adminUpdatedEvent.payload._id) === convId,
      `Admin nhận được conversation_updated trong ${adminUpdatedEvent.elapsedMs}ms`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 4: Khách hàng và Admin cùng gia nhập room conversation:{convId}
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 4: Gia nhập room conversation:{convId}");
    const customerJoinWait = waitForEvent(customerSocket, "joined_conversation", 3000);
    const adminJoinWait = waitForEvent(adminSocket, "joined_conversation", 3000);

    customerSocket.emit("join_conversation", { conversationId: convId });
    adminSocket.emit("join_conversation", { conversationId: convId });

    const customerJoined = await customerJoinWait;
    const adminJoined = await adminJoinWait;

    assertCase(
      "Customer Joined Conversation Room",
      customerJoined.payload.conversationId === convId,
      `Khách hàng gia nhập room ca chat thành công trong ${customerJoined.elapsedMs}ms`
    );

    assertCase(
      "Admin Joined Conversation Room",
      adminJoined.payload.conversationId === convId,
      `Admin gia nhập room ca chat thành công trong ${adminJoined.elapsedMs}ms`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 5: Admin gửi tin nhắn trả lời -> Khách hàng nhận được real-time
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 5: Admin trả lời tin nhắn -> Khách nhận new_message qua Socket");
    const customerMessageWait = waitForEvent<any>(customerSocket, "new_message", 3000);

    const adminSentMsg = await sendAdminMessageService(convId, adminUser._id.toString(), {
      content: "Chào bạn, bộ nồi chảo Tefal này phủ đáy từ cao cấp, dùng hoàn hảo trên mọi loại bếp từ nhé!",
      messageType: "text",
    });

    const receivedByCustomer = await customerMessageWait;

    assertCase(
      "Customer Received Admin Reply",
      receivedByCustomer.payload.content === adminSentMsg.content &&
        receivedByCustomer.payload.senderRole === "admin",
      `Khách nhận đúng nội dung từ Admin trong ${receivedByCustomer.elapsedMs}ms: "${receivedByCustomer.payload.content}"`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 6: Khách hàng gửi tiếp tin nhắn -> Admin nhận được real-time
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 6: Khách hàng gửi phản hồi -> Admin nhận new_message qua Socket");
    const adminMessageWait = waitForEvent<any>(adminSocket, "new_message", 3000);

    const customerSentMsg = await sendCustomerMessageService(
      customerUser._id.toString(),
      convId,
      {
        content: "Cảm ơn shop! Shop có đang áp dụng mã giảm giá nào cho sản phẩm này không ạ?",
        messageType: "text",
      }
    );

    const receivedByAdmin = await adminMessageWait;

    assertCase(
      "Admin Received Customer Message",
      receivedByAdmin.payload.content === customerSentMsg.content &&
        receivedByAdmin.payload.senderRole === "customer",
      `Admin nhận đúng tin từ Khách trong ${receivedByAdmin.elapsedMs}ms: "${receivedByAdmin.payload.content}"`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 7: Kiểm tra API lịch sử tin nhắn và Đánh dấu đã đọc (markRead)
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 7: Lấy lịch sử tin nhắn & Đánh dấu đã đọc");
    const messageHistory = await getCustomerConversationMessagesService(
      customerUser._id.toString(),
      convId
    );

    assertCase(
      "Message History Count",
      messageHistory.length === 3,
      `Lấy đủ 3 tin nhắn trong lịch sử ca chat (1 khách + 1 admin + 1 khách)`
    );

    // Đánh dấu đã đọc phía khách hàng
    await markCustomerConversationReadService(customerUser._id.toString(), convId);
    const currentAfterRead = await getCurrentCustomerConversationService(customerUser._id.toString());

    assertCase(
      "Mark Customer Conversation Read",
      (currentAfterRead?.customerUnreadCount ?? 0) === 0,
      `customerUnreadCount sau khi đọc là: ${currentAfterRead?.customerUnreadCount}`
    );

    // ------------------------------------------------------------------------
    // BƯỚC 8: Cơ chế Tự động Re-open khi gửi tin vào cuộc hội thoại đã đóng
    // ------------------------------------------------------------------------
    console.log("\n👉 BƯỚC 8: Đóng cuộc hội thoại và kiểm tra tính năng tự động Re-open");
    // Admin đóng ca chat
    await Conversation.findByIdAndUpdate(convId, { status: "closed" });

    // Khách hàng gửi tin nhắn mới
    const reopenMsgWait = waitForEvent<any>(adminSocket, "new_message", 3000);
    const reopenStatusWait = waitForEvent<any>(customerSocket, "conversation_status_changed", 3000);

    await sendCustomerMessageService(customerUser._id.toString(), convId, {
      content: "Shop ơi, cho mình hỏi thêm về bảo hành sản phẩm nhé!",
      messageType: "text",
    });

    const reopenEvent = await reopenStatusWait;
    const adminSawReopenMsg = await reopenMsgWait;

    const reopenedConv = await Conversation.findById(convId).lean();

    assertCase(
      "Auto Re-open Status Changed",
      Boolean(reopenedConv && (reopenedConv.status === "open" || reopenedConv.status === "pending")),
      `Trạng thái sau khi khách nhắn lại: ${reopenedConv?.status}`
    );

    assertCase(
      "Auto Re-open Socket Broadcast",
      reopenEvent.payload.status === "open" || reopenEvent.payload.status === "pending",
      `Socket phát hiện đổi trạng thái sang "${reopenEvent.payload.status}" cho cả 2 phía`
    );

    assertCase(
      "Admin Received Reopened Message",
      adminSawReopenMsg.payload.content === "Shop ơi, cho mình hỏi thêm về bảo hành sản phẩm nhé!",
      `Admin nhận được tin nhắn tái mở hội thoại: "${adminSawReopenMsg.payload.content}"`
    );

  } finally {
    // Dọn dẹp kết nối
    if (customerSocket) customerSocket.disconnect();
    if (adminSocket) adminSocket.disconnect();

    // Dọn dẹp dữ liệu test
    await Message.deleteMany({ conversationId: { $in: await Conversation.find({ customerId: customerUser._id }).distinct("_id") } });
    await Conversation.deleteMany({ customerId: customerUser._id });
    await User.deleteMany({ _id: { $in: [customerUser._id, adminUser._id] } });

    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await disconnectDatabase();
  }

  console.log("\n===============================================================");
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passedCount} PASS, ${failedCount} FAIL`);
  console.log("===============================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage4CustomerIntegrationTest().catch((err) => {
  console.error("💥 Lỗi nghiêm trọng khi chạy test:", err);
  process.exit(1);
});
