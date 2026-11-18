/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-socket-auth.ts
 * ============================================================================
 *
 * MỤC TIÊU:
 * - Kịch bản kiểm thử tự động độc lập xác nhận Socket.IO Server và Middleware
 *   xác thực bảo mật JWT Handshake (Giai đoạn 1).
 *
 * CÁC TRƯỜNG HỢP KIỂM THỬ:
 * 1. a) Kết nối không có token -> Bị từ chối (Authentication error).
 *    b) Kết nối với token rỗng -> Bị từ chối.
 * 2. a) Kết nối với token giả mạo -> Bị từ chối.
 *    b) Kết nối với token đã hết hạn -> Bị từ chối.
 * 3. Kết nối với token Admin thật (qua auth.token) -> Thành công và đã ở trong room `admin_channel`.
 * 4. Kết nối với token Admin thật (qua headers.authorization) -> Thành công.
 * 5. Kết nối với token Khách hàng thật -> Thành công, vào room user:${customerId}, KHÔNG vào admin_channel.
 * 6. Khách hàng tham gia cuộc hội thoại của chính mình (join_conversation) -> Thành công.
 * 7. Khách hàng cố tình tham gia cuộc hội thoại của người khác -> Bị từ chối truy cập.
 * 8. Admin tham gia cuộc hội thoại bất kỳ -> Thành công.
 * 9. Rời khỏi cuộc hội thoại (leave_conversation) -> Thành công.
 * 10. Kiểm tra REST API Express trên cùng HTTP server vẫn hoạt động bình thường (GET /).
 *
 * CHẠY SCRIPT:
 *   cd BACK_END && npx tsx scripts/test-socket-auth.ts
 * ============================================================================
 */

import path from "path";
import http from "http";
import type { AddressInfo } from "net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";

import app from "../app";
import connectDatabase, { disconnectDatabase } from "../src/config/database";
import { initSocket, getIO } from "../src/socket";
import { generateToken } from "../src/utils/jwt";
import { User, Conversation } from "../src/models";

// Nạp biến môi trường
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
 * Helper kết nối Socket client và trả về kết quả
 */
function connectTestClient(
  url: string,
  options: {
    auth?: { token?: string };
    extraHeaders?: Record<string, string>;
  } = {}
): Promise<{ client: ClientSocket | null; error: Error | null }> {
  return new Promise((resolve) => {
    const client = ioClient(url, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 5000,
      auth: options.auth,
      extraHeaders: options.extraHeaders,
    });

    client.on("connect", () => {
      resolve({ client, error: null });
    });

    client.on("connect_error", (err) => {
      resolve({ client: null, error: err });
    });
  });
}

async function runSocketAuthTests(): Promise<void> {
  let httpServer: http.Server | null = null;
  const activeClients: ClientSocket[] = [];
  let testAdminUser: any = null;
  let testCustomerUser1: any = null;
  let testCustomerUser2: any = null;
  let testConversation1: any = null;
  let testConversation2: any = null;

  try {
    console.log("===============================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ SOCKET.IO SERVER & JWT HANDSHAKE AUTH (GIAI ĐOẠN 1)");
    console.log("===============================================================");

    // 1. Kết nối MongoDB
    try {
      await connectDatabase();
      console.log("📦 Đã kết nối cơ sở dữ liệu MongoDB.");
    } catch (dbErr) {
      console.warn("⚠️ Không thể kết nối MongoDB cục bộ, tiếp tục kiểm thử logic.");
    }

    // 2. Khởi tạo HTTP Server và Socket.IO
    httpServer = http.createServer(app);
    const ioServer = initSocket(httpServer);

    // Lắng nghe trên cổng ngẫu nhiên 0 để tránh xung đột cổng
    await new Promise<void>((resolve, reject) => {
      httpServer!.listen(0, "127.0.0.1", () => resolve());
      httpServer!.on("error", reject);
    });

    const addr = httpServer.address() as AddressInfo;
    const serverUrl = `http://127.0.0.1:${addr.port}`;
    console.log(`🌐 Test Server đang chạy tại: ${serverUrl}\n`);

    // 3. Chuẩn bị dữ liệu tài khoản và token kiểm thử
    const jwtSecret =
      process.env.JWT_SECRET ||
      "super_secret_jwt_key_furniro_household_goods_2026_dev_env";

    const adminUserId = new mongoose.Types.ObjectId().toString();
    const customer1UserId = new mongoose.Types.ObjectId().toString();
    const customer2UserId = new mongoose.Types.ObjectId().toString();

    const validAdminToken = generateToken({
      userId: adminUserId,
      role: "admin",
    });

    const validCustomer1Token = generateToken({
      userId: customer1UserId,
      role: "customer",
    });

    const validCustomer2Token = generateToken({
      userId: customer2UserId,
      role: "customer",
    });

    // Tạo expired token (hết hạn trong quá khứ)
    const expiredToken = jwt.sign(
      { userId: adminUserId, role: "admin" },
      jwtSecret,
      { expiresIn: "-10s" }
    );

    const fakeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.fake_signature";

    // Tạo dữ liệu test trên DB nếu DB đang kết nối
    if (mongoose.connection.readyState === 1) {
      testCustomerUser1 = await User.create({
        _id: new mongoose.Types.ObjectId(customer1UserId),
        name: "Test Customer 1",
        email: `test_customer_1_${Date.now()}@example.com`,
        password: "hashedPassword123",
        role: "customer",
        isActive: true,
      });

      testCustomerUser2 = await User.create({
        _id: new mongoose.Types.ObjectId(customer2UserId),
        name: "Test Customer 2",
        email: `test_customer_2_${Date.now()}@example.com`,
        password: "hashedPassword123",
        role: "customer",
        isActive: true,
      });

      testAdminUser = await User.create({
        _id: new mongoose.Types.ObjectId(adminUserId),
        name: "Test Admin",
        email: `test_admin_${Date.now()}@example.com`,
        password: "hashedPassword123",
        role: "admin",
        isActive: true,
      });

      testConversation1 = await Conversation.create({
        customerId: testCustomerUser1._id,
        subject: "Hỗ trợ bảo hành sản phẩm Test 1",
        status: "open",
      });

      testConversation2 = await Conversation.create({
        customerId: testCustomerUser2._id,
        subject: "Tư vấn chọn nồi chiên không dầu Test 2",
        status: "open",
      });
    }

    console.log("--- BẮT ĐẦU CÁC KỊCH BẢN TEST CHI TIẾT ---");

    // ========================================================================
    // TEST CASE 1: KẾT NỐI KHÔNG CÓ TOKEN
    // ========================================================================
    console.log("\n▶ TEST CASE 1: Kết nối không truyền token");
    {
      const { client, error } = await connectTestClient(serverUrl);
      if (client) activeClients.push(client);

      assertCase(
        "1a. Không có auth token",
        client === null && !!error && error.message.includes("Authentication error"),
        `Bị từ chối kết nối chính xác. Lỗi: "${error?.message}"`
      );
    }

    {
      const { client, error } = await connectTestClient(serverUrl, {
        auth: { token: "" },
      });
      if (client) activeClients.push(client);

      assertCase(
        "1b. Token là chuỗi rỗng",
        client === null && !!error && error.message.includes("Authentication error"),
        `Bị từ chối kết nối chính xác. Lỗi: "${error?.message}"`
      );
    }

    // ========================================================================
    // TEST CASE 2: KẾT NỐI VỚI TOKEN GIẢ HOẶC HẾT HẠN
    // ========================================================================
    console.log("\n▶ TEST CASE 2: Kết nối với token giả mạo hoặc hết hạn");
    {
      const { client, error } = await connectTestClient(serverUrl, {
        auth: { token: fakeToken },
      });
      if (client) activeClients.push(client);

      assertCase(
        "2a. Token giả mạo/chữ ký sai",
        client === null && !!error && error.message === "Authentication error: Invalid or expired token",
        `Bị từ chối kết nối chuẩn thông điệp. Lỗi: "${error?.message}"`
      );
    }

    {
      const { client, error } = await connectTestClient(serverUrl, {
        auth: { token: expiredToken },
      });
      if (client) activeClients.push(client);

      assertCase(
        "2b. Token đã hết hạn",
        client === null && !!error && error.message === "Authentication error: Invalid or expired token",
        `Bị từ chối kết nối chuẩn thông điệp. Lỗi: "${error?.message}"`
      );
    }

    // ========================================================================
    // TEST CASE 3: KẾT NỐI VỚI TOKEN ADMIN THẬT (auth.token)
    // Tự động gia nhập phòng `admin_channel`
    // ========================================================================
    console.log("\n▶ TEST CASE 3: Kết nối với token Admin thật (qua auth.token)");
    let adminClient: ClientSocket | null = null;
    {
      const { client, error } = await connectTestClient(serverUrl, {
        auth: { token: validAdminToken },
      });

      if (client) {
        activeClients.push(client);
        adminClient = client;
      }

      assertCase(
        "3a. Admin kết nối thành công",
        client !== null && error === null,
        `Admin socket kết nối thành công: socketId=${client?.id}`
      );

      // Kiểm tra room admin_channel phía Server
      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(adminClient!.id!);
      const inAdminChannelServer = serverSocket?.rooms.has("admin_channel") ?? false;

      assertCase(
        "3b. Server tự động đưa Admin vào room admin_channel",
        inAdminChannelServer === true,
        `Admin socket ${adminClient?.id} đã có mặt trong room "admin_channel"`
      );

      // Kiểm tra Client nhận tin nhắn broadcast gửi đến admin_channel
      const broadcastPromise = new Promise<boolean>((resolve) => {
        adminClient!.on("admin_broadcast_test", (data: any) => {
          if (data && data.text === "ping_admin_team") {
            resolve(true);
          }
        });
        setTimeout(() => resolve(false), 2000);
      });

      ioInstance.to("admin_channel").emit("admin_broadcast_test", {
        text: "ping_admin_team",
      });

      const broadcastReceived = await broadcastPromise;
      assertCase(
        "3c. Admin nhận được broadcast gửi vào room admin_channel",
        broadcastReceived === true,
        "Sự kiện broadcast tới admin_channel đã được client nhận chính xác"
      );

      // Tra cứu danh sách rooms từ client thông qua sự kiện get_rooms
      const clientRooms = await new Promise<string[]>((resolve) => {
        adminClient!.emit("get_rooms", (rooms: string[]) => resolve(rooms));
      });

      assertCase(
        "3d. Client xác nhận danh sách rooms bao gồm admin_channel",
        clientRooms.includes("admin_channel") && clientRooms.includes(`user:${adminUserId}`),
        `Danh sách rooms của Admin: [${clientRooms.join(", ")}]`
      );
    }

    // ========================================================================
    // TEST CASE 4: KẾT NỐI QUA HEADERS AUTHORIZATION
    // ========================================================================
    console.log("\n▶ TEST CASE 4: Kết nối token qua Headers Authorization (Bearer)");
    {
      const { client, error } = await connectTestClient(serverUrl, {
        extraHeaders: {
          authorization: `Bearer ${validAdminToken}`,
        },
      });

      if (client) activeClients.push(client);

      assertCase(
        "4. Xác thực qua Headers Authorization",
        client !== null && error === null,
        `Kết nối qua header thành công: socketId=${client?.id}`
      );
    }

    // ========================================================================
    // TEST CASE 5: KẾT NỐI VỚI TOKEN KHÁCH HÀNG THẬT
    // Vào room riêng user:${customerId}, KHÔNG vào admin_channel
    // ========================================================================
    console.log("\n▶ TEST CASE 5: Kết nối với token Khách hàng thật");
    let customer1Client: ClientSocket | null = null;
    {
      const { client, error } = await connectTestClient(serverUrl, {
        auth: { token: validCustomer1Token },
      });

      if (client) {
        activeClients.push(client);
        customer1Client = client;
      }

      assertCase(
        "5a. Khách hàng 1 kết nối thành công",
        client !== null && error === null,
        `Customer socket kết nối thành công: socketId=${client?.id}`
      );

      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(customer1Client!.id!);
      const inAdminChannel = serverSocket?.rooms.has("admin_channel") ?? false;
      const inUserRoom = serverSocket?.rooms.has(`user:${customer1UserId}`) ?? false;

      assertCase(
        "5b. Khách hàng vào phòng riêng và KHÔNG vào admin_channel",
        inUserRoom === true && inAdminChannel === false,
        `Customer ở trong "user:${customer1UserId}" và không có trong "admin_channel"`
      );
    }

    // ========================================================================
    // TEST CASE 6: KHÁCH HÀNG THAM GIA CUỘC HỘI THOẠI CỦA MÌNH
    // ========================================================================
    console.log("\n▶ TEST CASE 6: Khách hàng tham gia cuộc hội thoại của chính mình");
    if (testConversation1) {
      const joinRes = await new Promise<any>((resolve) => {
        customer1Client!.emit(
          "join_conversation",
          testConversation1._id.toString(),
          (res: any) => resolve(res)
        );
      });

      assertCase(
        "6a. Khách 1 join conversation 1 thành công",
        joinRes?.success === true,
        `Phản hồi: ${JSON.stringify(joinRes)}`
      );

      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(customer1Client!.id!);
      const inConvRoom =
        serverSocket?.rooms.has(`conversation:${testConversation1._id}`) ?? false;

      assertCase(
        "6b. Server xác nhận socket đã ở trong room conversation:id",
        inConvRoom === true,
        `Socket ở trong room: conversation:${testConversation1._id}`
      );
    }

    // ========================================================================
    // TEST CASE 7: KHÁCH HÀNG CỐ TÌNH THAM GIA CUỘC HỘI THOẠI CỦA NGƯỜI KHÁC
    // ========================================================================
    console.log("\n▶ TEST CASE 7: Khách hàng cố tình truy cập cuộc hội thoại của khách khác");
    if (testConversation2) {
      const unauthorizedJoinRes = await new Promise<any>((resolve) => {
        customer1Client!.emit(
          "join_conversation",
          testConversation2._id.toString(),
          (res: any) => resolve(res)
        );
      });

      assertCase(
        "7a. Khách 1 bị từ chối khi join conversation 2",
        unauthorizedJoinRes?.success === false,
        `Từ chối truy cập: "${unauthorizedJoinRes?.message}"`
      );

      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(customer1Client!.id!);
      const inConv2Room =
        serverSocket?.rooms.has(`conversation:${testConversation2._id}`) ?? false;

      assertCase(
        "7b. Server KHÔNG cho socket gia nhập room trái quyền",
        inConv2Room === false,
        "Socket không thể lọt vào room của khách hàng khác"
      );
    }

    // ========================================================================
    // TEST CASE 8: ADMIN THAM GIA CUỘC HỘI THOẠI BẤT KỲ
    // ========================================================================
    console.log("\n▶ TEST CASE 8: Admin tham gia cuộc hội thoại bất kỳ");
    if (testConversation1 && adminClient) {
      const adminJoinRes = await new Promise<any>((resolve) => {
        adminClient!.emit(
          "join_conversation",
          { conversationId: testConversation1._id.toString() },
          (res: any) => resolve(res)
        );
      });

      assertCase(
        "8a. Admin join conversation của khách thành công",
        adminJoinRes?.success === true,
        `Admin joined conversation: ${testConversation1._id}`
      );

      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(adminClient.id!);
      const inConvRoom =
        serverSocket?.rooms.has(`conversation:${testConversation1._id}`) ?? false;

      assertCase(
        "8b. Server xác nhận Admin socket đã ở trong room conversation:id",
        inConvRoom === true,
        `Admin có mặt trong room conversation:${testConversation1._id}`
      );
    }

    // ========================================================================
    // TEST CASE 9: RỜI KHỎI CUỘC HỘI THOẠI (leave_conversation)
    // ========================================================================
    console.log("\n▶ TEST CASE 9: Rời khỏi cuộc hội thoại (leave_conversation)");
    if (testConversation1 && customer1Client) {
      const leaveRes = await new Promise<any>((resolve) => {
        customer1Client!.emit(
          "leave_conversation",
          testConversation1._id.toString(),
          (res: any) => resolve(res)
        );
      });

      assertCase(
        "9a. Leave conversation thành công",
        leaveRes?.success === true,
        `Phản hồi: ${JSON.stringify(leaveRes)}`
      );

      const ioInstance = getIO();
      const serverSocket = ioInstance.sockets.sockets.get(customer1Client.id!);
      const inConvRoom =
        serverSocket?.rooms.has(`conversation:${testConversation1._id}`) ?? false;

      assertCase(
        "9b. Server xác nhận socket đã rời khỏi room conversation",
        inConvRoom === false,
        `Socket không còn ở trong room conversation:${testConversation1._id}`
      );
    }

    // ========================================================================
    // TEST CASE 10: XÁC NHẬN REST API EXPRESS VẪN HOẠT ĐỘNG BÌNH THƯỜNG
    // ========================================================================
    console.log("\n▶ TEST CASE 10: Kiểm tra REST API Express hiện có trên cùng HTTP server");
    {
      const response = await fetch(`${serverUrl}/`);
      const body = await response.json();

      assertCase(
        "10. REST API GET / hoạt động song song bình thường",
        response.status === 200 && body?.success === true,
        `Status: ${response.status}, message: "${body?.message}"`
      );
    }

    console.log("\n===============================================================");
    console.log("📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ SOCKET.IO AUTH (GIAI ĐOẠN 1):");
    console.log(`   - Tổng số kiểm thử: ${passedCount + failedCount}`);
    console.log(`   - Thành công (PASS): ${passedCount}`);
    console.log(`   - Thất bại (FAIL):  ${failedCount}`);
    console.log(
      `   - Tỷ lệ đạt:        ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`
    );
    console.log("===============================================================");

    if (failedCount > 0) {
      console.error("❌ CÓ TEST CASE THẤT BẠI!");
      process.exit(1);
    } else {
      console.log("🎉 TẤT CẢ TEST CASES ĐÃ ĐẠT 100% PASS!");
    }
  } catch (error) {
    console.error("❌ Lỗi ngoại lệ trong quá trình kiểm thử:", error);
    process.exit(1);
  } finally {
    // Dọn dẹp kết nối socket clients
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect();
      }
    }

    // Dọn dẹp dữ liệu test trong database
    if (mongoose.connection.readyState === 1) {
      try {
        if (testConversation1?._id) {
          await Conversation.findByIdAndDelete(testConversation1._id);
        }
        if (testConversation2?._id) {
          await Conversation.findByIdAndDelete(testConversation2._id);
        }
        if (testCustomerUser1?._id) {
          await User.findByIdAndDelete(testCustomerUser1._id);
        }
        if (testCustomerUser2?._id) {
          await User.findByIdAndDelete(testCustomerUser2._id);
        }
        if (testAdminUser?._id) {
          await User.findByIdAndDelete(testAdminUser._id);
        }
        console.log("🧹 Đã dọn dẹp dữ liệu kiểm thử trên database.");
      } catch (cleanupErr) {
        console.warn("Lỗi khi dọn dẹp dữ liệu test:", cleanupErr);
      }
      await disconnectDatabase();
    }

    // Đóng HTTP server
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer!.close(() => resolve());
      });
      console.log("🛑 Đã đóng HTTP test server an toàn.");
    }
  }
}

// Chạy test
runSocketAuthTests();
