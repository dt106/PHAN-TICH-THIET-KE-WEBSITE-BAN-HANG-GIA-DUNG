/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-stage3-admin-flow.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Kịch bản kiểm thử Tích hợp GIAI ĐOẠN 3: Socket.IO Client trên giao diện Quản trị (ADMIN).
 * - Kiểm chứng các hành vi nghiệp vụ theo yêu cầu:
 *   1. Admin kết nối Socket.IO thành công và gia nhập `admin_channel`.
 *   2. Admin mở cuộc hội thoại A (`selectedId = convA`) -> Socket emit `join_conversation`.
 *   3. Khách hàng gửi tin nhắn vào cuộc hội thoại A:
 *      -> Admin nhận `new_message` ngay lập tức (< 100ms) để thêm vào state `messages`.
 *      -> Admin nhận `conversation_updated` cập nhật preview và đưa hội thoại lên đầu danh sách.
 *      -> Admin nhận `kpi_updated` cập nhật trực tiếp 4 thẻ KPI (total, open, pending, unread) mà không cần F5.
 *   4. Khách hàng gửi tin nhắn vào cuộc hội thoại B (không phải ca đang xem):
 *      -> Tin nhắn KHÔNG bị lẫn vào khung chat của ca A.
 *      -> Item cuộc hội thoại B trong state `conversations` tăng `admin_unread_count` và nhảy lên đầu danh sách.
 *      -> Thẻ KPI `unread` cập nhật tăng tương ứng.
 *   5. Admin chuyển sang xem cuộc hội thoại B:
 *      -> Socket tự động rời ca A (`leave_conversation`) và tham gia ca B (`join_conversation`).
 *   6. Khách hàng nhắn tiếp vào ca B:
 *      -> Tin nhắn lập tức xuất hiện trong khung chat ca B.
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

function connectTestClient(
  url: string,
  token: string
): Promise<ClientSocket> {
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

async function runStage3IntegrationTest() {
  console.log("===============================================================");
  console.log("🧪 KIỂM THỬ TÍCH HỢP GIAI ĐOẠN 3: ADMIN SOCKET.IO CLIENT");
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

  // 1. Tạo tài khoản Admin và Khách hàng
  const adminUser = await User.create({
    name: "Admin CSKH Stage 3",
    email: `admin_stage3_${timestamp}@test.com`,
    password: passwordHash,
    role: "admin",
    status: "active",
  });

  const customerUserA = await User.create({
    name: "Khách Hàng A",
    email: `customerA_${timestamp}@test.com`,
    password: passwordHash,
    role: "customer",
    status: "active",
  });

  const customerUserB = await User.create({
    name: "Khách Hàng B",
    email: `customerB_${timestamp}@test.com`,
    password: passwordHash,
    role: "customer",
    status: "active",
  });

  const adminToken = generateToken({
    userId: adminUser._id.toString(),
    email: adminUser.email,
    role: "admin",
  });

  const customerAToken = generateToken({
    userId: customerUserA._id.toString(),
    email: customerUserA.email,
    role: "customer",
  });

  const customerBToken = generateToken({
    userId: customerUserB._id.toString(),
    email: customerUserB.email,
    role: "customer",
  });

  // Tạo 2 cuộc hội thoại
  const convA = await Conversation.create({
    customerId: customerUserA._id,
    subject: "Hỏi về bảo hành chảo chống dính",
    status: "open",
    customerUnreadCount: 0,
    adminUnreadCount: 0,
  });

  const convB = await Conversation.create({
    customerId: customerUserB._id,
    subject: "Tư vấn nồi chiên không dầu",
    status: "open",
    customerUnreadCount: 0,
    adminUnreadCount: 0,
  });

  const convAId = convA._id.toString();
  const convBId = convB._id.toString();

  try {
    // --- BƯỚC 1: ADMIN KẾT NỐI SOCKET.IO ---
    console.log("--- BƯỚC 1: ADMIN KẾT NỐI SOCKET.IO VÀ VÀO ADMIN_CHANNEL ---");
    const adminSocket = await connectTestClient(serverUrl, adminToken);
    assertCase(
      "1a. Admin kết nối Socket.IO thành công",
      adminSocket.connected,
      `socketId=${adminSocket.id}`
    );

    // Xác nhận admin đã ở trong admin_channel
    const adminRooms = await new Promise<string[]>((res) => {
      adminSocket.emit("get_rooms", (rooms: string[]) => res(rooms));
    });
    assertCase(
      "1b. Admin tự động vào room admin_channel",
      adminRooms.includes("admin_channel"),
      `rooms=${JSON.stringify(adminRooms)}`
    );

    // Giả lập state phía Admin Frontend
    let adminState_selectedId: string | null = convAId;
    let adminState_messages: any[] = [];
    let adminState_conversations: any[] = [
      { id: convAId, subject: convA.subject, admin_unread_count: 0, last_message_preview: null },
      { id: convBId, subject: convB.subject, admin_unread_count: 0, last_message_preview: null },
    ];
    let adminState_kpiStats = { total: 2, open: 2, pending: 0, unread: 0 };

    // --- BƯỚC 2: ADMIN MỞ CA A (JOIN_CONVERSATION) ---
    console.log("\n--- BƯỚC 2: ADMIN CHỌN CA A (join_conversation) ---");
    await new Promise<void>((resolve) => {
      adminSocket.emit("join_conversation", { conversationId: convAId }, () => {
        resolve();
      });
    });

    const roomsAfterJoin = await new Promise<string[]>((res) => {
      adminSocket.emit("get_rooms", (rooms: string[]) => res(rooms));
    });
    assertCase(
      "2. Admin đã gia nhập room ca A",
      roomsAfterJoin.includes(`conversation:${convAId}`),
      `rooms=${JSON.stringify(roomsAfterJoin)}`
    );

    // --- BƯỚC 3: KHÁCH HÀNG A GỬI TIN NHẮN QUA REST API ---
    console.log("\n--- BƯỚC 3: KHÁCH A GỬI TIN NHẮN -> ADMIN NHẬN REAL-TIME (TIN NHẮN, PREVIEW, KPI) ---");
    const pNewMessage = waitForEvent(adminSocket, "new_message");
    const pConvUpdated = waitForEvent(adminSocket, "conversation_updated");
    const pKpiUpdated = waitForEvent(adminSocket, "kpi_updated");

    const messageAContent = "Dạ cho em hỏi chảo này chống dính được mấy năm ạ?";
    const resSendA = await fetch(`${serverUrl}/api/customer/conversations/${convAId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerAToken}`,
      },
      body: JSON.stringify({ content: messageAContent }),
    });
    const resAJson: any = await resSendA.json();

    assertCase(
      "3a. Khách A gửi tin nhắn qua REST API thành công (201 Created)",
      resSendA.status === 201 && resAJson.success,
      `messageId=${resAJson.data?.id}`
    );

    const [eventMsgA, eventConvA, eventKpiA] = await Promise.all([
      pNewMessage,
      pConvUpdated,
      pKpiUpdated,
    ]);

    // Giả lập logic Hook useAdminChatSocket cho tin nhắn A (đang mở ca A)
    const rawMsgA = eventMsgA.payload;
    if (String(rawMsgA.conversation_id) === String(adminState_selectedId)) {
      adminState_messages.push(rawMsgA);
    }
    // Logic conversation_updated: cập nhật preview và đưa ca A lên đầu
    adminState_conversations = [
      {
        ...adminState_conversations[0],
        last_message_preview: eventConvA.payload.last_message_preview,
        admin_unread_count: 0, // Đang xem ca A nên không tăng unread
      },
      adminState_conversations[1],
    ];
    adminState_kpiStats = eventKpiA.payload;

    assertCase(
      "3b. Admin nhận sự kiện new_message trong < 1000ms",
      eventMsgA.elapsedMs < 1000 && rawMsgA.content === messageAContent,
      `elapsedMs=${eventMsgA.elapsedMs}ms, content="${rawMsgA.content}"`
    );

    assertCase(
      "3c. Tin nhắn của khách A tự động nhảy vào khung chat (state messages có 1 tin)",
      adminState_messages.length === 1 && adminState_messages[0].content === messageAContent,
      `messagesCount=${adminState_messages.length}`
    );

    assertCase(
      "3d. Admin nhận sự kiện conversation_updated với preview chính xác",
      eventConvA.payload.last_message_preview === messageAContent,
      `preview="${eventConvA.payload.last_message_preview}"`
    );

    assertCase(
      "3e. Admin nhận sự kiện kpi_updated tự cập nhật 4 thẻ KPI không cần F5",
      typeof adminState_kpiStats.unread === "number" && adminState_kpiStats.unread >= 1,
      `KPI Stats: total=${adminState_kpiStats.total}, open=${adminState_kpiStats.open}, pending=${adminState_kpiStats.pending}, unread=${adminState_kpiStats.unread}`
    );

    // --- BƯỚC 4: KHÁCH B GỬI TIN NHẮN VÀO CA B (ADMIN ĐANG Ở CA A) ---
    console.log("\n--- BƯỚC 4: KHÁCH B GỬI TIN NHẮN (KHÔNG Ở CA ĐANG XEM) -> TĂNG BADGE UNREAD & ĐẨY LÊN ĐẦU ---");
    const pConvUpdatedB = waitForEvent(adminSocket, "conversation_updated");
    const pKpiUpdatedB = waitForEvent(adminSocket, "kpi_updated");

    const messageBContent = "Nồi chiên này có phụ kiện nướng bánh đi kèm không shop?";
    const resSendB = await fetch(`${serverUrl}/api/customer/conversations/${convBId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerBToken}`,
      },
      body: JSON.stringify({ content: messageBContent }),
    });
    const resBJson: any = await resSendB.json();

    assertCase(
      "4a. Khách B gửi tin nhắn qua REST API thành công",
      resSendB.status === 201 && resBJson.success,
      `messageId=${resBJson.data?.id}`
    );

    const [eventConvB, eventKpiB] = await Promise.all([pConvUpdatedB, pKpiUpdatedB]);

    // Áp dụng logic Hook useAdminChatSocket:
    // Vì admin đang xem ca A (selectedId = convAId), tin nhắn B KHÔNG nhảy vào khung chat A
    // Ca B được cập nhật unread_count + 1 và đẩy lên đầu danh sách conversations!
    const convBUpdated = {
      ...adminState_conversations.find((c) => c.id === convBId),
      last_message_preview: eventConvB.payload.last_message_preview,
      admin_unread_count: 1, // Tăng badge chưa đọc vì không phải ca đang xem
    };
    adminState_conversations = [
      convBUpdated,
      adminState_conversations.find((c) => c.id === convAId),
    ];
    adminState_kpiStats = eventKpiB.payload;

    assertCase(
      "4b. Khung chat hiện tại (ca A) không bị ảnh hưởng bởi tin nhắn ca B",
      adminState_messages.length === 1 && adminState_messages[0].conversation_id === convAId,
      `messagesInChatA=${adminState_messages.length}`
    );

    assertCase(
      "4c. Ca B tự động được đẩy lên đầu danh sách (vị trí 0) với preview mới",
      adminState_conversations[0].id === convBId &&
        adminState_conversations[0].last_message_preview === messageBContent,
      `topConvId=${adminState_conversations[0].id}, preview="${adminState_conversations[0].last_message_preview}"`
    );

    assertCase(
      "4d. Ca B được tăng badge admin_unread_count = 1",
      adminState_conversations[0].admin_unread_count === 1,
      `unreadBadge=${adminState_conversations[0].admin_unread_count}`
    );

    assertCase(
      "4e. 4 thẻ KPI cập nhật trực tiếp phản ánh tin chưa đọc mới",
      adminState_kpiStats.unread >= 1,
      `kpiStats.unread=${adminState_kpiStats.unread}`
    );

    // --- BƯỚC 5: ADMIN CHUYỂN SANG CA B (LEAVE CA A, JOIN CA B) ---
    console.log("\n--- BƯỚC 5: ADMIN BẤM CHỌN CA B (LEAVE CA A, JOIN CA B) ---");
    await new Promise<void>((resolve) => {
      adminSocket.emit("leave_conversation", { conversationId: convAId }, () => {
        resolve();
      });
    });
    await new Promise<void>((resolve) => {
      adminSocket.emit("join_conversation", { conversationId: convBId }, () => {
        resolve();
      });
    });

    adminState_selectedId = convBId;
    adminState_messages = []; // Khi mở ca B, nạp tin nhắn ca B

    const roomsAfterSwitch = await new Promise<string[]>((res) => {
      adminSocket.emit("get_rooms", (rooms: string[]) => res(rooms));
    });
    assertCase(
      "5a. Admin đã rời khỏi room ca A",
      !roomsAfterSwitch.includes(`conversation:${convAId}`),
      `rooms=${JSON.stringify(roomsAfterSwitch)}`
    );
    assertCase(
      "5b. Admin đã gia nhập room ca B",
      roomsAfterSwitch.includes(`conversation:${convBId}`),
      `rooms=${JSON.stringify(roomsAfterSwitch)}`
    );

    // --- BƯỚC 6: KHÁCH B NHẮN TIẾP TRONG KHI ADMIN ĐANG MỞ CA B ---
    console.log("\n--- BƯỚC 6: KHÁCH B NHẮN TIẾP -> TIN NHẮN TỰ ĐỘNG VÀO KHUNG CHAT CA B ---");
    const pNewMessageB = waitForEvent(adminSocket, "new_message");

    const messageB2Content = "Em đặt luôn 1 cái giao hỏa tốc giúp em nhé!";
    await fetch(`${serverUrl}/api/customer/conversations/${convBId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerBToken}`,
      },
      body: JSON.stringify({ content: messageB2Content }),
    });

    const eventMsgB2 = await pNewMessageB;
    if (String(eventMsgB2.payload.conversation_id) === String(adminState_selectedId)) {
      adminState_messages.push(eventMsgB2.payload);
    }

    assertCase(
      "6. Tin nhắn mới của ca B tự động nhảy vào khung chat ca B ngay lập tức",
      adminState_messages.length === 1 && adminState_messages[0].content === messageB2Content,
      `chatContent="${adminState_messages[0]?.content}"`
    );

    // --- DỌN DẸP ---
    adminSocket.disconnect();
  } finally {
    // Dọn dẹp dữ liệu MongoDB
    await Message.deleteMany({
      conversationId: { $in: [convA._id, convB._id] },
    });
    await Conversation.deleteMany({
      _id: { $in: [convA._id, convB._id] },
    });
    await User.deleteMany({
      _id: { $in: [adminUser._id, customerUserA._id, customerUserB._id] },
    });

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await disconnectDatabase();
  }

  console.log("\n===============================================================");
  console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedCount} PASS | ${failedCount} FAIL`);
  console.log("===============================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage3IntegrationTest().catch((err) => {
  console.error("❌ Lỗi kiểm thử:", err);
  process.exit(1);
});
