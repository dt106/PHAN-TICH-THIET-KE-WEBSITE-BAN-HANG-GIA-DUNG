/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-stage5-typing-and-notification.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Kịch bản kiểm thử tích hợp (Integration Test Suite) GIAI ĐOẠN 5:
 *   + Chỉ báo "Đang soạn tin nhắn..." (Typing Indicator: typing_start, typing_stop, user_typing)
 *   + Tính cô lập phòng (Room Isolation): Chỉ các client trong cùng room ca chat mới nhận tin
 *   + Cơ chế phát tán không gửi lại cho chính người gửi (Sender Exclusion: socket.to(room))
 *   + Bộ phát sự kiện tiện ích tầng Service: emitUserTyping
 *
 * CHẠY SCRIPT:
 *   cd BACK_END && npx tsx scripts/test-stage5-typing-and-notification.ts
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
import { emitUserTyping } from "../src/socket/socketEmitter";
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

async function runStage5Tests(): Promise<void> {
  let httpServer: http.Server | null = null;
  let customerSocket: ClientSocket | null = null;
  let adminSocket: ClientSocket | null = null;
  let otherCustomerSocket: ClientSocket | null = null;

  let testCustomerId: mongoose.Types.ObjectId | null = null;
  let testAdminId: mongoose.Types.ObjectId | null = null;
  let otherCustomerId: mongoose.Types.ObjectId | null = null;
  let testConversationId: mongoose.Types.ObjectId | null = null;
  let otherConversationId: mongoose.Types.ObjectId | null = null;

  try {
    console.log("===============================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ TÍCH HỢP GIAI ĐOẠN 5: TYPING INDICATOR");
    console.log("===============================================================\n");

    // 1. Kết nối MongoDB
    await connectDatabase();
    console.log("📦 Đã kết nối cơ sở dữ liệu MongoDB.");

    // 2. Khởi tạo HTTP Server & Socket.IO
    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise<void>((resolve, reject) => {
      httpServer!.listen(0, "127.0.0.1", () => resolve());
      httpServer!.on("error", reject);
    });

    const addr = httpServer.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${addr.port}`;
    console.log(`🌐 Test Server đang chạy tại: ${baseUrl}\n`);

    // 3. Tạo tài khoản mẫu
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const hashedPassword = await bcrypt.hash("Password@123", 10);

    const testCustomer = await User.create({
      name: "Nguyễn Văn Khách",
      email: `customer.typing.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testCustomerId = testCustomer._id;

    const testAdmin = await User.create({
      name: "Trần CSKH Admin",
      email: `admin.typing.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      role: "admin",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testAdminId = testAdmin._id;

    const otherCustomer = await User.create({
      name: "Lê Khách Khác",
      email: `other.customer.${uniqueSuffix}@test.com`,
      password: hashedPassword,
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    otherCustomerId = otherCustomer._id;

    // 4. Tạo ca hội thoại mẫu
    const conv1 = await Conversation.create({
      customerId: testCustomerId,
      assignedAdminId: testAdminId,
      subject: "Tư vấn sofa phòng khách",
      status: "open",
      customerUnreadCount: 0,
      adminUnreadCount: 0,
    });
    testConversationId = conv1._id;

    const conv2 = await Conversation.create({
      customerId: otherCustomerId,
      subject: "Hỏi chính sách bảo hành",
      status: "open",
      customerUnreadCount: 0,
      adminUnreadCount: 0,
    });
    otherConversationId = conv2._id;

    const customerToken = generateToken({
      userId: testCustomer._id.toString(),
      role: "customer",
      name: testCustomer.name,
    });

    const adminToken = generateToken({
      userId: testAdmin._id.toString(),
      role: "admin",
      name: testAdmin.name,
    });

    const otherCustomerToken = generateToken({
      userId: otherCustomer._id.toString(),
      role: "customer",
      name: otherCustomer.name,
    });

    // 5. Kết nối Socket Clients
    console.log("--- BƯỚC 1: KẾT NỐI VÀ GIA NHẬP ROOM HỘI THOẠI ---");
    const [cConn, aConn, oConn] = await Promise.all([
      connectTestClient(baseUrl, customerToken),
      connectTestClient(baseUrl, adminToken),
      connectTestClient(baseUrl, otherCustomerToken),
    ]);
    customerSocket = cConn.client;
    adminSocket = aConn.client;
    otherCustomerSocket = oConn.client;

    assertCase(
      "1a. Socket Khách hàng kết nối",
      Boolean(customerSocket.id),
      `socketId=${customerSocket.id}`
    );
    assertCase(
      "1b. Socket Admin kết nối",
      Boolean(adminSocket.id),
      `socketId=${adminSocket.id}`
    );
    assertCase(
      "1c. Socket Khách hàng khác kết nối",
      Boolean(otherCustomerSocket.id),
      `socketId=${otherCustomerSocket.id}`
    );

    // Gia nhập room hội thoại
    await Promise.all([
      new Promise<void>((resolve) => {
        customerSocket!.emit(
          "join_conversation",
          { conversationId: testConversationId!.toString() },
          () => resolve()
        );
      }),
      new Promise<void>((resolve) => {
        adminSocket!.emit(
          "join_conversation",
          { conversationId: testConversationId!.toString() },
          () => resolve()
        );
      }),
      new Promise<void>((resolve) => {
        otherCustomerSocket!.emit(
          "join_conversation",
          { conversationId: otherConversationId!.toString() },
          () => resolve()
        );
      }),
    ]);

    // =========================================================================
    // KỊCH BẢN 1: Khách hàng bắt đầu gõ phím (typing_start)
    // -> Admin nhận user_typing (isTyping: true)
    // -> Khách hàng gửi không tự nhận lại chính mình
    // =========================================================================
    console.log("\n--- BƯỚC 2: KHÁCH HÀNG GÕ PHÍM (typing_start) ---");
    let customerReceivedOwnTyping = false;
    const ownTypingHandler = () => {
      customerReceivedOwnTyping = true;
    };
    customerSocket.on("user_typing", ownTypingHandler);

    let otherCustomerReceivedTyping = false;
    const otherTypingHandler = () => {
      otherCustomerReceivedTyping = true;
    };
    otherCustomerSocket.on("user_typing", otherTypingHandler);

    const adminTypingStartPromise = waitForSocketEvent(adminSocket, "user_typing");

    customerSocket.emit("typing_start", {
      conversationId: testConversationId!.toString(),
      userName: testCustomer.name,
    });

    const adminTypingStartRes = await adminTypingStartPromise;
    assertCase(
      "2a. Admin nhận sự kiện user_typing với isTyping=true",
      adminTypingStartRes.payload?.isTyping === true &&
        adminTypingStartRes.payload?.conversationId === testConversationId!.toString() &&
        adminTypingStartRes.payload?.userId === testCustomer._id.toString(),
      `isTyping=${adminTypingStartRes.payload?.isTyping}, userName=${adminTypingStartRes.payload?.userName}, elapsed=${adminTypingStartRes.elapsedMs}ms`
    );

    // Đợi 100ms kiểm tra người gửi không nhận lại
    await new Promise((r) => setTimeout(r, 100));
    assertCase(
      "2b. Người gửi không tự nhận lại tín hiệu typing của chính mình",
      customerReceivedOwnTyping === false,
      "socket.to() loại trừ chính socket gửi thành công"
    );

    assertCase(
      "2c. Khách hàng ở phòng khác (conv2) không nhận được tín hiệu typing",
      otherCustomerReceivedTyping === false,
      "Room isolation phân cách hoàn toàn giữa các ca chat"
    );

    // =========================================================================
    // KỊCH BẢN 2: Khách hàng dừng gõ phím sau debounce (typing_stop)
    // -> Admin nhận user_typing (isTyping: false)
    // =========================================================================
    console.log("\n--- BƯỚC 3: KHÁCH HÀNG DỪNG GÕ PHÍM (typing_stop) ---");
    const adminTypingStopPromise = waitForSocketEvent(adminSocket, "user_typing");

    customerSocket.emit("typing_stop", {
      conversationId: testConversationId!.toString(),
      userName: testCustomer.name,
    });

    const adminTypingStopRes = await adminTypingStopPromise;
    assertCase(
      "3. Admin nhận sự kiện user_typing với isTyping=false",
      adminTypingStopRes.payload?.isTyping === false &&
        adminTypingStopRes.payload?.conversationId === testConversationId!.toString(),
      `isTyping=${adminTypingStopRes.payload?.isTyping}, elapsed=${adminTypingStopRes.elapsedMs}ms`
    );

    // =========================================================================
    // KỊCH BẢN 3: Admin gõ phím phản hồi (typing_start & typing_stop)
    // -> Khách hàng nhận user_typing (isTyping: true / false)
    // =========================================================================
    console.log("\n--- BƯỚC 4: ADMIN GÕ PHÍM TRẢ LỜI (typing_start & typing_stop) ---");
    const customerTypingStartPromise = waitForSocketEvent(customerSocket, "user_typing");

    adminSocket.emit("typing_start", {
      conversationId: testConversationId!.toString(),
      userName: testAdmin.name,
    });

    const customerTypingStartRes = await customerTypingStartPromise;
    assertCase(
      "4a. Khách hàng nhận được chỉ báo Admin đang gõ phím",
      customerTypingStartRes.payload?.isTyping === true &&
        customerTypingStartRes.payload?.userName === testAdmin.name &&
        customerTypingStartRes.payload?.role === "admin",
      `isTyping=${customerTypingStartRes.payload?.isTyping}, adminName=${customerTypingStartRes.payload?.userName}`
    );

    const customerTypingStopPromise = waitForSocketEvent(customerSocket, "user_typing");

    adminSocket.emit("typing_stop", {
      conversationId: testConversationId!.toString(),
      userName: testAdmin.name,
    });

    const customerTypingStopRes = await customerTypingStopPromise;
    assertCase(
      "4b. Khách hàng nhận được sự kiện Admin dừng gõ phím",
      customerTypingStopRes.payload?.isTyping === false,
      `isTyping=${customerTypingStopRes.payload?.isTyping}`
    );

    // =========================================================================
    // KỊCH BẢN 4: Kiểm thử helper socketEmitter.emitUserTyping từ Backend
    // =========================================================================
    console.log("\n--- BƯỚC 5: KIỂM THỬ SOCKET EMITTER: emitUserTyping ---");
    const emitterTypingPromise = waitForSocketEvent(customerSocket, "user_typing");

    const emittedSuccess = emitUserTyping(testConversationId!.toString(), {
      userId: testAdmin._id.toString(),
      userName: "Bộ phận Hỗ trợ Furniro",
      isTyping: true,
      role: "admin",
    });

    assertCase(
      "5a. emitUserTyping trả về true khi socket server đã sẵn sàng",
      emittedSuccess === true,
      "emitUserTyping thành công"
    );

    const emitterRes = await emitterTypingPromise;
    assertCase(
      "5b. Client nhận được payload phát từ emitUserTyping",
      emitterRes.payload?.userName === "Bộ phận Hỗ trợ Furniro" &&
        emitterRes.payload?.isTyping === true,
      `userName=${emitterRes.payload?.userName}, isTyping=${emitterRes.payload?.isTyping}`
    );

    // Dọn dẹp listener
    customerSocket.off("user_typing", ownTypingHandler);
    otherCustomerSocket.off("user_typing", otherTypingHandler);
  } catch (error) {
    console.error("❌ Lỗi trong quá trình chạy kiểm thử:", error);
    failedCount += 1;
  } finally {
    // 6. Dọn dẹp dữ liệu và ngắt kết nối
    console.log("\n--- BƯỚC CUỐI: DỌN DẸP DỮ LIỆU & NGẮT KẾT NỐI ---");
    if (customerSocket?.connected) customerSocket.disconnect();
    if (adminSocket?.connected) adminSocket.disconnect();
    if (otherCustomerSocket?.connected) otherCustomerSocket.disconnect();

    if (testConversationId) await Conversation.findByIdAndDelete(testConversationId);
    if (otherConversationId) await Conversation.findByIdAndDelete(otherConversationId);
    if (testCustomerId) await User.findByIdAndDelete(testCustomerId);
    if (testAdminId) await User.findByIdAndDelete(testAdminId);
    if (otherCustomerId) await User.findByIdAndDelete(otherCustomerId);

    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
    }
    await disconnectDatabase();
    console.log("🧹 Đã dọn dẹp tài nguyên và ngắt kết nối cơ sở dữ liệu.\n");

    console.log("===============================================================");
    console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passedCount} PASS, ${failedCount} FAIL`);
    console.log("===============================================================");

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runStage5Tests();
