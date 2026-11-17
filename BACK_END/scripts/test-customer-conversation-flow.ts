/**
 * ============================================================================
 * FILE: BACK_END/scripts/test-customer-conversation-flow.ts
 * ============================================================================
 *
 * MỤC TIÊU:
 * - Kịch bản kiểm thử tự động (Integration Test Suite) luồng API Khách hàng:
 *   /api/customer/conversations/* và tương tác vòng đời với Admin API.
 * - Tự động khởi chạy Express app nội bộ trên cổng động để kiểm thử toàn diện
 *   qua HTTP -> Middleware -> Validator -> Controller -> Service -> MongoDB.
 * - Tự động dọn dẹp dữ liệu kiểm thử sau khi hoàn tất.
 *
 * CHẠY SCRIPT:
 *   npx ts-node BACK_END/scripts/test-customer-conversation-flow.ts
 *   HOẶC
 *   cd BACK_END && npx tsx scripts/test-customer-conversation-flow.ts
 * ============================================================================
 */

import path from "path";
import type { Server } from "http";
import type { AddressInfo } from "net";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import express from "express";
import mongoose from "mongoose";

import connectDatabase, { disconnectDatabase } from "../src/config/database";
import { User, Conversation, Message } from "../src/models";
import { generateToken } from "../src/utils/jwt";
import adminConversationRoutes from "../src/routes/admin/admin.conversation.routes";
import customerConversationRoutes from "../src/routes/customer/customer.conversation.routes";
import errorMiddleware from "../src/middlewares/error.middleware";

// Hỗ trợ load .env dù chạy từ thư mục gốc hay thư mục BACK_END
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/BAN_HANG_GIA_DUNG";
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test_customer_conversation_secret_key";
}

interface HttpResult {
  status: number;
  json: any;
}

let passedCount = 0;
let failedCount = 0;

function assertCase(name: string, condition: boolean, detail: string): void {
  if (condition) {
    passedCount += 1;
    console.log(`[PASS] ${name} -> ${detail}`);
  } else {
    failedCount += 1;
    console.error(`[FAIL] ${name} -> ${detail}`);
  }
}

async function callApi(
  baseUrl: string,
  method: string,
  endpoint: string,
  token?: string,
  body?: Record<string, unknown>
): Promise<HttpResult> {
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

async function runTests(): Promise<void> {
  let server: Server | null = null;
  const createdConversationIds: mongoose.Types.ObjectId[] = [];
  let testCustomerId: mongoose.Types.ObjectId | null = null;
  let testAdminId: mongoose.Types.ObjectId | null = null;

  try {
    console.log("===============================================================");
    console.log("🧪 BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG LUỒNG API CHAT CSKH KHÁCH HÀNG");
    console.log("===============================================================");

    // 1. Kết nối MongoDB
    await connectDatabase();

    // 2. Khởi chạy Express HTTP server nội bộ (mount đầy đủ 2 router conversation)
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/admin/conversations", adminConversationRoutes);
    testApp.use("/api/customer/conversations", customerConversationRoutes);
    testApp.use(errorMiddleware);

    server = await new Promise<Server>((resolve, reject) => {
      const srv = testApp.listen(0, "127.0.0.1", () => resolve(srv));
      srv.on("error", reject);
    });
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;
    console.log(`🌐 Test HTTP server đang lắng nghe tại: ${baseUrl}\n`);

    // 3. Tạo dữ liệu user tạm thời phục vụ test (sẽ xóa sạch ở finally)
    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const hashedPassword = await bcrypt.hash("Test@123456", 10);

    const testCustomer = await User.create({
      name: "Khách Hàng Test Flow",
      email: `test.customer.${uniqueSuffix}@example.com`,
      password: hashedPassword,
      phone: "0988888881",
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testCustomerId = testCustomer._id;

    const testAdmin = await User.create({
      name: "Admin Test Flow",
      email: `test.admin.${uniqueSuffix}@example.com`,
      password: hashedPassword,
      phone: "0988888882",
      role: "admin",
      status: "active",
      emailVerifiedAt: new Date(),
    });
    testAdminId = testAdmin._id;

    const customerToken = generateToken({
      userId: testCustomer._id.toString(),
      role: "customer",
    });

    const adminToken = generateToken({
      userId: testAdmin._id.toString(),
      role: "admin",
    });

    // =========================================================================
    // CASE 1: Tạo ca mới (POST /api/customer/conversations)
    // =========================================================================
    const firstMessageText = "Shop ơi nồi chiên có bảo hành không ạ?";
    const case1Res = await callApi(
      baseUrl,
      "POST",
      "/api/customer/conversations",
      customerToken,
      {
        subject: "Hỏi bảo hành nồi chiên không dầu",
        firstMessage: firstMessageText,
      }
    );

    const createdConvId = case1Res.json?.data?.conversation?.id as string | undefined;
    if (createdConvId && mongoose.Types.ObjectId.isValid(createdConvId)) {
      createdConversationIds.push(new mongoose.Types.ObjectId(createdConvId));
    }

    const dbConvAfterCase1 = createdConvId
      ? await Conversation.findById(createdConvId).lean()
      : null;

    assertCase(
      "Case 1: Khách hàng tạo cuộc hội thoại mới",
      case1Res.status === 201 &&
        case1Res.json?.success === true &&
        case1Res.json?.data?.conversation?.status === "pending" &&
        dbConvAfterCase1?.adminUnreadCount === 1 &&
        case1Res.json?.data?.message?.content === firstMessageText,
      `HTTP=${case1Res.status}, status=${case1Res.json?.data?.conversation?.status}, adminUnreadCount=${dbConvAfterCase1?.adminUnreadCount}`
    );

    if (!createdConvId) {
      throw new Error("Không tạo được conversationId ở Case 1, dừng chuỗi test.");
    }

    // =========================================================================
    // CASE 2: Lấy ca hiện tại (GET /api/customer/conversations/current)
    // =========================================================================
    const case2Res = await callApi(
      baseUrl,
      "GET",
      "/api/customer/conversations/current",
      customerToken
    );

    assertCase(
      "Case 2: Khách hàng lấy cuộc hội thoại hiện tại (/current)",
      case2Res.status === 200 &&
        case2Res.json?.success === true &&
        case2Res.json?.data?.id === createdConvId,
      `HTTP=${case2Res.status}, returnedId=${case2Res.json?.data?.id}, expectedId=${createdConvId}`
    );

    // =========================================================================
    // CASE 3: Lấy danh sách tin nhắn (GET /api/customer/conversations/:id/messages)
    // =========================================================================
    const case3Res = await callApi(
      baseUrl,
      "GET",
      `/api/customer/conversations/${createdConvId}/messages`,
      customerToken
    );

    const case3Messages = Array.isArray(case3Res.json?.data)
      ? case3Res.json.data
      : [];

    assertCase(
      "Case 3: Khách hàng lấy danh sách tin nhắn",
      case3Res.status === 200 &&
        case3Messages.length === 1 &&
        case3Messages[0]?.content === firstMessageText,
      `HTTP=${case3Res.status}, count=${case3Messages.length}, firstContent="${case3Messages[0]?.content}"`
    );

    // =========================================================================
    // CASE 4: Khách gửi thêm tin nhắn (POST /api/customer/conversations/:id/messages)
    // =========================================================================
    const secondMessageText = "Shop ship hỏa tốc được không?";
    const case4Res = await callApi(
      baseUrl,
      "POST",
      `/api/customer/conversations/${createdConvId}/messages`,
      customerToken,
      {
        content: secondMessageText,
        messageType: "text",
      }
    );

    const dbConvAfterCase4 = await Conversation.findById(createdConvId).lean();

    assertCase(
      "Case 4: Khách hàng gửi thêm tin nhắn & tăng adminUnreadCount",
      case4Res.status === 201 &&
        case4Res.json?.data?.content === secondMessageText &&
        dbConvAfterCase4?.adminUnreadCount === 2,
      `HTTP=${case4Res.status}, adminUnreadCount=${dbConvAfterCase4?.adminUnreadCount}`
    );

    // =========================================================================
    // CASE 5: Kiểm tra cơ chế Re-open tự động khi Admin đã đóng ca
    // =========================================================================
    const closeByAdminRes = await callApi(
      baseUrl,
      "PATCH",
      `/api/admin/conversations/${createdConvId}/status`,
      adminToken,
      { status: "closed" }
    );

    const reopenMessageText = "Em muốn hỏi thêm về quà tặng kèm ạ";
    const customerSendOnClosedRes = await callApi(
      baseUrl,
      "POST",
      `/api/customer/conversations/${createdConvId}/messages`,
      customerToken,
      {
        content: reopenMessageText,
        messageType: "text",
      }
    );

    const dbConvAfterCase5 = await Conversation.findById(createdConvId).lean();
    const case5Messages = await Message.find({
      conversationId: new mongoose.Types.ObjectId(createdConvId),
    })
      .sort({ createdAt: 1 })
      .lean();

    const hasReopenSystemMessage = case5Messages.some(
      (msg) =>
        msg.messageType === "system" &&
        typeof msg.content === "string" &&
        msg.content.includes("được mở lại")
    );

    assertCase(
      "Case 5: Tự động Re-open khi khách nhắn vào hội thoại đã đóng",
      closeByAdminRes.status === 200 &&
        customerSendOnClosedRes.status === 201 &&
        (dbConvAfterCase5?.status === "pending" ||
          dbConvAfterCase5?.status === "open") &&
        dbConvAfterCase5?.adminUnreadCount === 3 &&
        hasReopenSystemMessage,
      `closeHTTP=${closeByAdminRes.status}, sendHTTP=${customerSendOnClosedRes.status}, newStatus=${dbConvAfterCase5?.status}, adminUnreadCount=${dbConvAfterCase5?.adminUnreadCount}, systemReopenMsg=${hasReopenSystemMessage}`
    );

    // =========================================================================
    // CASE 6: Khách hàng đánh dấu đã đọc (PATCH /api/customer/conversations/:id/read)
    // =========================================================================
    const adminReplyRes = await callApi(
      baseUrl,
      "POST",
      `/api/admin/conversations/${createdConvId}/messages`,
      adminToken,
      {
        content: "Dạ nồi chiên bảo hành 24 tháng và có giao hỏa tốc 2h ạ!",
        messageType: "text",
      }
    );

    const dbConvBeforeRead = await Conversation.findById(createdConvId).lean();

    const case6Res = await callApi(
      baseUrl,
      "PATCH",
      `/api/customer/conversations/${createdConvId}/read`,
      customerToken
    );

    const dbConvAfterRead = await Conversation.findById(createdConvId).lean();

    assertCase(
      "Case 6: Khách hàng đánh dấu đã đọc (customerUnreadCount reset về 0)",
      adminReplyRes.status === 201 &&
        (dbConvBeforeRead?.customerUnreadCount ?? 0) >= 1 &&
        case6Res.status === 200 &&
        case6Res.json?.success === true &&
        dbConvAfterRead?.customerUnreadCount === 0,
      `adminReplyHTTP=${adminReplyRes.status}, beforeRead=${dbConvBeforeRead?.customerUnreadCount}, readHTTP=${case6Res.status}, afterRead=${dbConvAfterRead?.customerUnreadCount}`
    );

    console.log("\n===============================================================");
    console.log(`📊 KẾT QUẢ KIỂM THỬ: ${passedCount} PASS | ${failedCount} FAIL`);
    console.log("===============================================================\n");

    if (failedCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng khi chạy kịch bản kiểm thử:", error);
    process.exitCode = 1;
  } finally {
    // 4. Dọn dẹp toàn bộ dữ liệu kiểm thử tạm thời
    try {
      if (createdConversationIds.length > 0) {
        await Message.deleteMany({
          conversationId: { $in: createdConversationIds },
        });
        await Conversation.deleteMany({
          _id: { $in: createdConversationIds },
        });
      }

      const tempUserIds = [testCustomerId, testAdminId].filter(
        (id): id is mongoose.Types.ObjectId => id !== null
      );
      if (tempUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: tempUserIds } });
      }
      console.log("🧹 Đã dọn dẹp sạch dữ liệu kiểm thử khỏi Database.");
    } catch (cleanupError) {
      console.error("⚠️ Lỗi khi dọn dẹp dữ liệu kiểm thử:", cleanupError);
    }

    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await disconnectDatabase();
  }
}

void runTests();
