/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-socket-events.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Kịch bản kiểm thử tích hợp (Integration Test Suite) GIAI ĐOẠN 2:
 *   Bộ phát sự kiện thời gian thực (Socket Event Dispatcher) vào tầng Service.
 * - Giả lập đồng thời:
 *   + 1 Socket Client đóng vai Khách hàng (Customer)
 *   + 1 Socket Client đóng vai Quản trị viên (Admin)
 * - Tương tác qua REST API chuẩn và xác nhận các sự kiện Socket.IO được phát tán:
 *   1. new_message: Cả 2 socket cùng nhận được tin nhắn trong < 100ms.
 *   2. conversation_updated: Admin nhận cập nhật preview & badge trên admin_channel.
 *   3. kpi_updated: Admin nhận 4 chỉ số KPI thời gian thực trên admin_channel.
 *   4. conversation_status_changed: Cả 2 nhận sự kiện khi đóng ca hoặc Auto Re-open.
 * - Tuân thủ triệt để DB-First Pattern: Dữ liệu luôn được lưu vào MongoDB trước,
 *   sau đó Socket Server phát sự kiện.
 *
 * CHẠY SCRIPT:
 *   cd BACK_END && npx tsx scripts/test-socket-events.ts
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

// Nạp cấu hình môi trường
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

/**
 * Helper kết nối Socket client và trả về promise kết nối
 */
function connectTestClient(
  url: string,
  token: string
): Promise<{ client: ClientSocket; connectedPayload: any }> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 5000,
      auth: { token },
    });

    const timer = setTimeout(() => {
      reject(new Error("Timeout kết nối Socket Client sau 5000ms"));
    }, 5000);

    client.on("connected", (data) => {
      clearTimeout(timer);
      resolve({ client, connectedPayload: data });
    });

    client.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Helper lắng nghe 1 sự kiện Socket.IO với Timeout
 */
function waitForSocketEvent<T = any>(
  socket: ClientSocket,
  eventName: string,
  timeoutMs: number = 3000
): Promise<{ payload: T; elapsedMs: number }> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(
        new Error(
          `Hết thời gian chờ (${timeoutMs}ms) sự kiện "${eventName}" trên socket ${socket.id}`
        )
      );
    }, timeoutMs);

    const handler = (payload: T) => {
      const elapsedMs = Date.now() - startTime;
      clearTimeout(timer);
      socket.off(eventName, handler);
      resolve({ payload, elapsedMs });
    };

    socket.on(eventName, handler);
  });
}

/**
 * Helper gọi REST API
 */
async function callApi(
  baseUrl: string,
  method: string,
  endpoint: string,
  token?: string,
  body?: Record<string, unknown>
): Promise<{ status: number; json: any }> {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function runSocketEventsTests(): Promise<void> {
  let httpServer: http.Server | null = null;
  let customerSocket: ClientSocket | null = null;
  let adminSocket: ClientSocket | null = null;

  let testCustomerId: mongoose.Types.ObjectId | null = null;
  let testAdminId1: mongoose.Types.ObjectId | null = null;
  let testAdminId2: mongoose.Types.ObjectId | null = null;
  const createdConversationIds: mongoose.Types.ObjectId[] = [];

  try {
    console.log("===============================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP SOCKET EVENT DISPATCHER (GIAI ĐOẠN 2)");
    console.log("===============================================================\n");

    // 1. Kết nối MongoDB
    await connectDatabase();
    console.log("📦 Đã kết nối cơ sở dữ liệu MongoDB.");

    // 2. Khởi chạy HTTP Server gắn Socket.IO Server
    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise<void>((resolve, reject) => {
      httpServer!.listen(0, "127.0.0.1", () => resolve());
      httpServer!.on("error", reject);
    });

    const addr = httpServer.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    console.log(`🌐 Test Server đang chạy tại: ${baseUrl}\n`);

    // 3. Khởi tạo người dùng thử nghiệm
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const hashedPassword = await bcrypt.hash("Test@123456", 10);

    const testCustomer = await User.create({
      name: "Khách Hàng Socket Test",
      email: `customer.socket.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      phone: "0911111111",
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testCustomerId = testCustomer._id;

    const testAdmin1 = await User.create({
      name: "Admin Socket Test 1",
      email: `admin1.socket.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      phone: "0922222222",
      role: "admin",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testAdminId1 = testAdmin1._id;

    const testAdmin2 = await User.create({
      name: "Admin Socket Test 2",
      email: `admin2.socket.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      phone: "0933333333",
      role: "admin",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testAdminId2 = testAdmin2._id;

    const customerToken = generateToken({
      userId: testCustomer._id.toString(),
      role: "customer",
    });

    const adminToken1 = generateToken({
      userId: testAdmin1._id.toString(),
      role: "admin",
    });

    // 4. Kết nối 2 Socket Clients
    console.log("--- BƯỚC 1: KẾT NỐI SOCKET CLIENTS (KHÁCH HÀNG & ADMIN) ---");
    const [customerConn, adminConn] = await Promise.all([
      connectTestClient(baseUrl, customerToken),
      connectTestClient(baseUrl, adminToken1),
    ]);
    customerSocket = customerConn.client;
    adminSocket = adminConn.client;

    assertCase(
      "1a. Khách hàng kết nối Socket.IO thành công",
      Boolean(customerSocket.id && customerConn.connectedPayload.success),
      `socketId=${customerSocket.id}, userId=${customerConn.connectedPayload.user?.userId}`
    );

    assertCase(
      "1b. Admin kết nối Socket.IO thành công",
      Boolean(adminSocket.id && adminConn.connectedPayload.success),
      `socketId=${adminSocket.id}, role=${adminConn.connectedPayload.user?.role}`
    );

    // =========================================================================
    // KỊCH BẢN 1: Khách hàng tạo hội thoại mới qua REST API
    // -> Admin nhận conversation_updated và kpi_updated trên admin_channel
    // =========================================================================
    console.log("\n--- BƯỚC 2: KHÁCH HÀNG TẠO HỘI THOẠI MỚI QUA REST API ---");
    const adminConvUpdatedPromise = waitForSocketEvent(adminSocket, "conversation_updated");
    const adminKpiUpdatedPromise = waitForSocketEvent(adminSocket, "kpi_updated");

    const firstMsgText = "Chào shop, tôi muốn hỏi mua máy sấy chén bát khử khuẩn";
    const createConvRes = await callApi(baseUrl, "POST", "/api/customer/conversations", customerToken, {
      subject: "Tư vấn máy sấy chén bát",
      firstMessage: firstMsgText,
    });

    const createdConvId = createConvRes.json?.data?.conversation?.id;
    if (createdConvId) {
      createdConversationIds.push(new mongoose.Types.ObjectId(createdConvId));
    }

    const [convUpdatedResult, kpiUpdatedResult] = await Promise.all([
      adminConvUpdatedPromise,
      adminKpiUpdatedPromise,
    ]);

    assertCase(
      "2a. REST API tạo cuộc hội thoại trả về 201 Created",
      createConvRes.status === 201 && Boolean(createdConvId),
      `HTTP=${createConvRes.status}, convId=${createdConvId}`
    );

    assertCase(
      "2b. Admin nhận sự kiện conversation_updated qua admin_channel",
      convUpdatedResult.payload?.id === createdConvId &&
        convUpdatedResult.payload?.status === "pending" &&
        convUpdatedResult.payload?.last_message_preview === firstMsgText,
      `receivedId=${convUpdatedResult.payload?.id}, status=${convUpdatedResult.payload?.status}, elapsed=${convUpdatedResult.elapsedMs}ms`
    );

    assertCase(
      "2c. Admin nhận sự kiện kpi_updated qua admin_channel với pending >= 1",
      typeof kpiUpdatedResult.payload?.pending === "number" &&
        kpiUpdatedResult.payload.pending >= 1 &&
        kpiUpdatedResult.payload.unread >= 1,
      `kpi={total: ${kpiUpdatedResult.payload?.total}, pending: ${kpiUpdatedResult.payload?.pending}, unread: ${kpiUpdatedResult.payload?.unread}}, elapsed=${kpiUpdatedResult.elapsedMs}ms`
    );

    // =========================================================================
    // KỊCH BẢN 2: Cả 2 socket gia nhập room ca chat & Khách gửi tin nhắn qua REST API
    // -> Kiểm tra độ trễ < 100ms trên cả 2 socket
    // =========================================================================
    console.log("\n--- BƯỚC 3: GIA NHẬP ROOM & KHÁCH GỬI TIN NHẮN (ĐỘ TRỄ < 100ms) ---");
    // Cả 2 client join vào room ca chat
    await Promise.all([
      new Promise<void>((resolve) => {
        customerSocket!.emit("join_conversation", createdConvId, () => resolve());
      }),
      new Promise<void>((resolve) => {
        adminSocket!.emit("join_conversation", createdConvId, () => resolve());
      }),
    ]);

    const secondMsgText = "Shop có sẵn hàng giao trong ngày tại TP.HCM không?";

    // Lắng nghe sự kiện new_message trên cả 2 socket
    const customerNewMsgPromise = waitForSocketEvent(customerSocket, "new_message");
    const adminNewMsgPromise = waitForSocketEvent(adminSocket, "new_message");
    const adminConvUpdatedStep3Promise = waitForSocketEvent(adminSocket, "conversation_updated");

    const sendMsgStartTime = Date.now();
    const sendMsgRes = await callApi(
      baseUrl,
      "POST",
      `/api/customer/conversations/${createdConvId}/messages`,
      customerToken,
      {
        content: secondMsgText,
        messageType: "text",
      }
    );

    const [customerMsgEvent, adminMsgEvent, convUpdatedStep3] = await Promise.all([
      customerNewMsgPromise,
      adminNewMsgPromise,
      adminConvUpdatedStep3Promise,
    ]);
    const sendMsgTotalTime = Date.now() - sendMsgStartTime;

    assertCase(
      "3a. REST API gửi tin nhắn trả về 201 Created",
      sendMsgRes.status === 201 && sendMsgRes.json?.data?.content === secondMsgText,
      `HTTP=${sendMsgRes.status}, totalTime=${sendMsgTotalTime}ms`
    );

    assertCase(
      "3b. Khách hàng nhận sự kiện new_message trong < 100ms",
      customerMsgEvent.elapsedMs < 100 &&
        customerMsgEvent.payload?.content === secondMsgText &&
        customerMsgEvent.payload?.senderRole === "customer",
      `elapsed=${customerMsgEvent.elapsedMs}ms (< 100ms), content="${customerMsgEvent.payload?.content}"`
    );

    assertCase(
      "3c. Admin nhận sự kiện new_message trong < 100ms",
      adminMsgEvent.elapsedMs < 100 &&
        adminMsgEvent.payload?.content === secondMsgText &&
        adminMsgEvent.payload?.senderRole === "customer",
      `elapsed=${adminMsgEvent.elapsedMs}ms (< 100ms), content="${adminMsgEvent.payload?.content}"`
    );

    assertCase(
      "3d. Admin nhận conversation_updated với admin_unread_count tăng",
      convUpdatedStep3.payload?.admin_unread_count >= 2 &&
        convUpdatedStep3.payload?.last_message_preview === secondMsgText,
      `unreadCount=${convUpdatedStep3.payload?.admin_unread_count}, preview="${convUpdatedStep3.payload?.last_message_preview}"`
    );

    // =========================================================================
    // KỊCH BẢN 3: Admin gửi tin nhắn trả lời qua REST API
    // -> Khách hàng nhận new_message trong < 100ms với role: admin
    // =========================================================================
    console.log("\n--- BƯỚC 4: ADMIN TRẢ LỜI TIN NHẮN QUA REST API ---");
    const adminReplyText = "Dạ bên em còn sẵn hàng và có hỗ trợ giao hỏa tốc 2 giờ ạ!";
    const customerMsgStep4Promise = waitForSocketEvent(customerSocket, "new_message");
    const adminMsgStep4Promise = waitForSocketEvent(adminSocket, "new_message");

    const adminReplyRes = await callApi(
      baseUrl,
      "POST",
      `/api/admin/conversations/${createdConvId}/messages`,
      adminToken1,
      {
        content: adminReplyText,
        messageType: "text",
      }
    );

    const [customerStep4Event, adminStep4Event] = await Promise.all([
      customerMsgStep4Promise,
      adminMsgStep4Promise,
    ]);

    assertCase(
      "4a. REST API Admin trả lời trả về 201 Created",
      adminReplyRes.status === 201 && adminReplyRes.json?.data?.content === adminReplyText,
      `HTTP=${adminReplyRes.status}`
    );

    assertCase(
      "4b. Khách hàng nhận phản hồi của Admin trong < 100ms với senderRole='admin'",
      customerStep4Event.elapsedMs < 100 &&
        customerStep4Event.payload?.content === adminReplyText &&
        customerStep4Event.payload?.senderRole === "admin",
      `elapsed=${customerStep4Event.elapsedMs}ms, role=${customerStep4Event.payload?.senderRole}`
    );

    assertCase(
      "4c. Admin socket cũng nhận được bản sao new_message",
      adminStep4Event.payload?.content === adminReplyText,
      `adminEchoMessageId=${adminStep4Event.payload?.id}`
    );

    // =========================================================================
    // KỊCH BẢN 4: Admin bàn giao ca chat qua REST API
    // -> Cả 2 nhận new_message (tin nhắn hệ thống bàn giao) & Admin nhận conversation_updated
    // =========================================================================
    console.log("\n--- BƯỚC 5: ADMIN BÀN GIAO CA CHAT QUA REST API ---");
    const customerAssignMsgPromise = waitForSocketEvent(customerSocket, "new_message");
    const adminAssignConvPromise = waitForSocketEvent(adminSocket, "conversation_updated");

    const assignRes = await callApi(
      baseUrl,
      "PATCH",
      `/api/admin/conversations/${createdConvId}/assign`,
      adminToken1,
      {
        assignedAdminId: testAdminId2.toString(),
      }
    );

    const [assignMsgEvent, assignConvEvent] = await Promise.all([
      customerAssignMsgPromise,
      adminAssignConvPromise,
    ]);

    assertCase(
      "5a. REST API bàn giao ca chat thành công trả về 200 OK",
      assignRes.status === 200 &&
        assignRes.json?.data?.conversation?.assigned_admin_name === "Admin Socket Test 2",
      `HTTP=${assignRes.status}, assignee=${assignRes.json?.data?.conversation?.assigned_admin_name}`
    );

    assertCase(
      "5b. Khách nhận được tin nhắn hệ thống ghi nhận bàn giao (messageType='system')",
      assignMsgEvent.payload?.messageType === "system" &&
        assignMsgEvent.payload?.content.includes("bàn giao"),
      `type=${assignMsgEvent.payload?.messageType}, content="${assignMsgEvent.payload?.content}"`
    );

    assertCase(
      "5c. Admin nhận conversation_updated phản ánh nhân viên mới được phân công",
      assignConvEvent.payload?.assigned_admin_name === "Admin Socket Test 2",
      `newAssignee=${assignConvEvent.payload?.assigned_admin_name}`
    );

    // =========================================================================
    // KỊCH BẢN 5: Admin đóng cuộc hội thoại qua REST API
    // -> Cả 2 nhận conversation_status_changed (closed), tin nhắn hệ thống, và kpi_updated
    // =========================================================================
    console.log("\n--- BƯỚC 6: ADMIN ĐÓNG CUỘC HỘI THOẠI QUA REST API ---");
    const customerStatusClosePromise = waitForSocketEvent(customerSocket, "conversation_status_changed");
    const customerCloseMsgPromise = waitForSocketEvent(customerSocket, "new_message");
    const adminKpiClosePromise = waitForSocketEvent(adminSocket, "kpi_updated");

    const closeRes = await callApi(
      baseUrl,
      "PATCH",
      `/api/admin/conversations/${createdConvId}/status`,
      adminToken1,
      {
        status: "closed",
      }
    );

    const [statusCloseEvent, closeMsgEvent, kpiCloseEvent] = await Promise.all([
      customerStatusClosePromise,
      customerCloseMsgPromise,
      adminKpiClosePromise,
    ]);

    assertCase(
      "6a. REST API đóng hội thoại thành công trả về 200 OK",
      closeRes.status === 200 && closeRes.json?.data?.conversation?.status === "closed",
      `HTTP=${closeRes.status}, status=${closeRes.json?.data?.conversation?.status}`
    );

    assertCase(
      "6b. Khách hàng nhận sự kiện conversation_status_changed ('closed')",
      statusCloseEvent.payload?.conversationId === createdConvId &&
        statusCloseEvent.payload?.status === "closed",
      `convId=${statusCloseEvent.payload?.conversationId}, status=${statusCloseEvent.payload?.status}`
    );

    assertCase(
      "6c. Khách hàng nhận tin nhắn hệ thống đóng hội thoại",
      closeMsgEvent.payload?.messageType === "system" &&
        closeMsgEvent.payload?.content.includes("đã được đóng"),
      `msgType=${closeMsgEvent.payload?.messageType}, content="${closeMsgEvent.payload?.content}"`
    );

    assertCase(
      "6d. Admin nhận kpi_updated cập nhật lại số lượng ca open",
      typeof kpiCloseEvent.payload?.open === "number",
      `openCount=${kpiCloseEvent.payload?.open}`
    );

    // =========================================================================
    // KỊCH BẢN 6: Auto Re-open: Khách gửi tin nhắn vào hội thoại đã đóng
    // -> Tự động mở lại hội thoại, bắn conversation_status_changed (open) & new_message
    // =========================================================================
    console.log("\n--- BƯỚC 7: CƠ CHẾ AUTO RE-OPEN KHI KHÁCH NHẮN VÀO CA ĐÃ ĐÓNG ---");
    const reopenMsgText = "Shop ơi cho mình hỏi thêm dung tích máy có mấy loại?";

    const customerReopenStatusPromise = waitForSocketEvent(customerSocket, "conversation_status_changed");
    const customerReopenMsgPromise = waitForSocketEvent(customerSocket, "new_message");
    const adminReopenConvPromise = waitForSocketEvent(adminSocket, "conversation_updated");
    const adminReopenKpiPromise = waitForSocketEvent(adminSocket, "kpi_updated");

    const reopenSendRes = await callApi(
      baseUrl,
      "POST",
      `/api/customer/conversations/${createdConvId}/messages`,
      customerToken,
      {
        content: reopenMsgText,
        messageType: "text",
      }
    );

    const [reopenStatusEvent, reopenMsgEvent, reopenConvEvent, reopenKpiEvent] = await Promise.all([
      customerReopenStatusPromise,
      customerReopenMsgPromise,
      adminReopenConvPromise,
      adminReopenKpiPromise,
    ]);

    assertCase(
      "7a. Khách gửi tin nhắn kích hoạt Auto Re-open trả về 201 Created",
      reopenSendRes.status === 201 && reopenSendRes.json?.data?.content === reopenMsgText,
      `HTTP=${reopenSendRes.status}`
    );

    assertCase(
      "7b. Nhận sự kiện conversation_status_changed mở lại ca chat",
      reopenStatusEvent.payload?.conversationId === createdConvId &&
        (reopenStatusEvent.payload?.status === "open" ||
          reopenStatusEvent.payload?.status === "pending"),
      `convId=${reopenStatusEvent.payload?.conversationId}, newStatus=${reopenStatusEvent.payload?.status}`
    );

    assertCase(
      "7c. Nhận sự kiện new_message cho tin nhắn mới của khách",
      reopenMsgEvent.payload?.content === reopenMsgText,
      `content="${reopenMsgEvent.payload?.content}"`
    );

    assertCase(
      "7d. Admin nhận conversation_updated phản ánh trạng thái tái mở",
      reopenConvEvent.payload?.status === "open" || reopenConvEvent.payload?.status === "pending",
      `status=${reopenConvEvent.payload?.status}`
    );

    assertCase(
      "7e. Admin nhận kpi_updated cập nhật chỉ số",
      typeof reopenKpiEvent.payload?.unread === "number" && reopenKpiEvent.payload?.unread >= 1,
      `unread=${reopenKpiEvent.payload?.unread}`
    );

    // =========================================================================
    // KỊCH BẢN 7: Admin đánh dấu đã đọc qua REST API
    // -> Admin nhận conversation_updated với admin_unread_count = 0 và kpi_updated
    // =========================================================================
    console.log("\n--- BƯỚC 8: ADMIN ĐÁNH DẤU ĐÃ ĐỌC QUA REST API ---");
    const adminReadConvPromise = waitForSocketEvent(adminSocket, "conversation_updated");
    const adminReadKpiPromise = waitForSocketEvent(adminSocket, "kpi_updated");

    const readRes = await callApi(
      baseUrl,
      "PATCH",
      `/api/admin/conversations/${createdConvId}/read`,
      adminToken1
    );

    const [readConvEvent, readKpiEvent] = await Promise.all([
      adminReadConvPromise,
      adminReadKpiPromise,
    ]);

    assertCase(
      "8a. REST API đánh dấu đã đọc trả về 200 OK",
      readRes.status === 200 && readRes.json?.success === true,
      `HTTP=${readRes.status}`
    );

    assertCase(
      "8b. Admin nhận conversation_updated với admin_unread_count = 0",
      readConvEvent.payload?.admin_unread_count === 0,
      `admin_unread_count=${readConvEvent.payload?.admin_unread_count}`
    );

    assertCase(
      "8c. Admin nhận kpi_updated sau khi đọc",
      typeof readKpiEvent.payload?.unread === "number",
      `unreadKPI=${readKpiEvent.payload?.unread}`
    );

    console.log("\n===============================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedCount} PASS | ${failedCount} FAIL`);
    console.log("===============================================================\n");

    if (failedCount > 0) {
      process.exitCode = 1;
    } else {
      console.log("🎉 TẤT CẢ CÁC KỊCH BẢN KIỂM THỬ GIAI ĐOẠN 2 ĐÃ ĐẠT 100% PASS!\n");
    }
  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng khi thực thi kịch bản kiểm thử:", error);
    process.exitCode = 1;
  } finally {
    // 5. Dọn dẹp kết nối và dữ liệu kiểm thử
    console.log("--- BƯỚC DỌN DẸP HỆ THỐNG KIỂM THỬ ---");
    if (customerSocket) {
      customerSocket.disconnect();
    }
    if (adminSocket) {
      adminSocket.disconnect();
    }

    try {
      if (createdConversationIds.length > 0) {
        await Message.deleteMany({ conversationId: { $in: createdConversationIds } });
        await Conversation.deleteMany({ _id: { $in: createdConversationIds } });
      }

      const tempUserIds = [testCustomerId, testAdminId1, testAdminId2].filter(
        (id): id is mongoose.Types.ObjectId => id !== null
      );
      if (tempUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: tempUserIds } });
      }
      console.log("🧹 Đã dọn dẹp sạch sẽ dữ liệu kiểm thử khỏi MongoDB.");
    } catch (cleanupError) {
      console.error("⚠️ Lỗi khi dọn dẹp dữ liệu:", cleanupError);
    }

    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
      console.log("🛑 Đã đóng HTTP test server an toàn.");
    }

    await disconnectDatabase();
  }
}

void runSocketEventsTests();
