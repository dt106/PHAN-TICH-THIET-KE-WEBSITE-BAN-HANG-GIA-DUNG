/**
 * ============================================================================
 * FILE: BACK_END/scripts/seed-conversations.ts
 * ============================================================================
 *
 * MỤC TIÊU:
 * - Khởi tạo dữ liệu mẫu cho hệ thống Chat CSKH (Hội thoại & Tin nhắn)
 * - Tự động xóa dữ liệu hội thoại mẫu cũ trước khi nạp lại để đảm bảo tính Idempotent
 * - Bao quát đủ 4 ca nghiệp vụ chuẩn:
 *   1. Ca 1 (`pending`): Chờ tiếp nhận, `assignedAdminId: null`, 1 tin nhắn khách chưa đọc (`adminUnreadCount: 1`).
 *   2. Ca 2 (`open`): Đang xử lý, đã phân công Admin 1, lịch sử trao đổi 3 tin nhắn (Khách ➔ Admin ➔ Khách).
 *   3. Ca 3 (`open`): Đang xử lý, đã bàn giao cho Admin 2 (Nhân viên CSKH), có tin nhắn hệ thống (`system`).
 *   4. Ca 4 (`closed`): Đã đóng, đã phân công Admin 1, kết thúc bằng tin nhắn hệ thống (`system`).
 *
 * CHẠY SCRIPT:
 *   npx ts-node BACK_END/scripts/seed-conversations.ts
 *   HOẶC
 *   cd BACK_END && npx tsx scripts/seed-conversations.ts
 * ============================================================================
 */

import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import connectDatabase, { disconnectDatabase } from "../src/config/database";
import { User, Conversation, Message } from "../src/models";

// Load biến môi trường từ .env
dotenv.config();

// Đảm bảo MONGO_URI có giá trị mặc định nếu chưa cấu hình
if (!process.env.MONGO_URI) {
  process.env.MONGO_URI = "mongodb://127.0.0.1:27017/BAN_HANG_GIA_DUNG";
}

const BCRYPT_SALT_ROUNDS = 12;

/**
 * 4 Chủ đề hội thoại mẫu dùng để đối soát và dọn dẹp trước khi nạp
 */
const SAMPLE_SUBJECTS = [
  "Tư vấn nồi chiên không dầu 5L",
  "Hỏi về tình trạng giao hàng đơn #1024",
  "Yêu cầu đổi trả máy xay sinh tố bị vỡ nắp",
  "Chính sách bảo hành chảo chống dính",
];

async function seedConversations(): Promise<void> {
  try {
    console.log("===============================================================");
    console.log("🚀 BẮT ĐẦU NẠP DỮ LIỆU MẪU HỘI THOẠI & TIN NHẮN CHAT CSKH");
    console.log("===============================================================");

    // 1. Kết nối cơ sở dữ liệu MongoDB
    await connectDatabase();

    // 2. Tìm hoặc khởi tạo tài khoản Admin 1, Admin 2 và Customer
    const admin1Email = (process.env.ADMIN_EMAIL || "admin@gmail.com").trim().toLowerCase();
    const admin1Name = process.env.ADMIN_NAME || "Admin";
    const admin2Email = "cskh@gmail.com";
    const admin2Name = "Nhân viên CSKH";
    const customerEmail = "user@gmail.com";
    const customerName = "Khách Hàng Mẫu";

    const defaultAdminPassword = await bcrypt.hash("Admin@123456", BCRYPT_SALT_ROUNDS);
    const defaultCustomerPassword = await bcrypt.hash("User@123456", BCRYPT_SALT_ROUNDS);

    // Admin 1 (Admin chính)
    let admin1 = await User.findOne({ email: admin1Email });
    if (!admin1) {
      console.log(`➕ Đang tạo tài khoản Admin 1: ${admin1Email}`);
      admin1 = await User.create({
        name: admin1Name,
        email: admin1Email,
        password: defaultAdminPassword,
        phone: "0900000001",
        role: "admin",
        status: "active",
        emailVerifiedAt: new Date(),
      });
    } else {
      console.log(`ℹ️ Đã tìm thấy Admin 1: ${admin1.name} (${admin1.email})`);
    }

    // Admin 2 (Nhân viên CSKH hỗ trợ bàn giao)
    let admin2 = await User.findOne({ email: admin2Email });
    if (!admin2) {
      console.log(`➕ Đang tạo tài khoản Admin 2 (CSKH): ${admin2Email}`);
      admin2 = await User.create({
        name: admin2Name,
        email: admin2Email,
        password: defaultAdminPassword,
        phone: "0900000002",
        role: "admin",
        status: "active",
        emailVerifiedAt: new Date(),
      });
    } else {
      console.log(`ℹ️ Đã tìm thấy Admin 2: ${admin2.name} (${admin2.email})`);
    }

    // Customer (Khách hàng mẫu)
    let customer = await User.findOne({ email: customerEmail });
    if (!customer) {
      console.log(`➕ Đang tạo tài khoản Customer: ${customerEmail}`);
      customer = await User.create({
        name: customerName,
        email: customerEmail,
        password: defaultCustomerPassword,
        phone: "0901234567",
        role: "customer",
        status: "active",
        emailVerifiedAt: new Date(),
      });
    } else {
      console.log(`ℹ️ Đã tìm thấy Customer: ${customer.name} (${customer.email})`);
    }

    // 3. Tự động xóa dữ liệu hội thoại mẫu cũ nếu đã tồn tại để tránh trùng lặp
    console.log("\n🧹 Đang kiểm tra và xóa dữ liệu hội thoại mẫu cũ...");
    const oldConversations = await Conversation.find({
      $or: [
        { subject: { $in: SAMPLE_SUBJECTS } },
        { customerId: customer._id },
      ],
    });

    if (oldConversations.length > 0) {
      const oldConvIds = oldConversations.map((c) => c._id);
      const deletedMessages = await Message.deleteMany({ conversationId: { $in: oldConvIds } });
      const deletedConvs = await Conversation.deleteMany({ _id: { $in: oldConvIds } });
      console.log(`🗑️ Đã xóa ${deletedConvs.deletedCount} hội thoại cũ và ${deletedMessages.deletedCount} tin nhắn liên quan.`);
    } else {
      console.log("✨ Không có hội thoại mẫu cũ cần dọn dẹp.");
    }

    // Thiết lập mốc thời gian tuần tự (tính ngược từ hiện tại)
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;

    console.log("\n📦 Bắt đầu khởi tạo 4 cuộc hội thoại mẫu...");

    // =========================================================================
    // HỘI THOẠI 1: Trạng thái PENDING (Chờ tiếp nhận)
    // - subject: "Tư vấn nồi chiên không dầu 5L"
    // - status: 'pending', assignedAdminId: null, adminUnreadCount: 1, customerUnreadCount: 0
    // - 1 tin nhắn do khách gửi chưa đọc
    // =========================================================================
    const conv1Time = new Date(now - 30 * minute);
    const conv1 = await Conversation.create({
      customerId: customer._id,
      assignedAdminId: null,
      subject: "Tư vấn nồi chiên không dầu 5L",
      status: "pending",
      adminUnreadCount: 1,
      customerUnreadCount: 0,
      createdAt: new Date(conv1Time.getTime() - 5 * minute),
      updatedAt: conv1Time,
    });

    const msg1_1 = await Message.create({
      conversationId: conv1._id,
      senderId: customer._id,
      messageType: "text",
      content: "Dung tích 5 lít có phù hợp cho gia đình 4 người không shop?",
      isRead: false,
      readAt: null,
      createdAt: conv1Time,
      updatedAt: conv1Time,
    });

    // Đồng bộ trường lastMessageAt và lastMessagePreview
    conv1.lastMessageAt = msg1_1.createdAt;
    conv1.lastMessagePreview = msg1_1.content;
    await conv1.save();
    console.log(`  ✅ [Ca 1 - PENDING] "${conv1.subject}" (ID: ${conv1._id})`);

    // =========================================================================
    // HỘI THOẠI 2: Trạng thái OPEN (Đang xử lý)
    // - subject: "Hỏi về tình trạng giao hàng đơn #1024"
    // - status: 'open', assignedAdminId: Admin 1, adminUnreadCount: 0, customerUnreadCount: 0
    // - Lịch sử 3 tin nhắn: Khách hỏi ➔ Admin trả lời ➔ Khách cảm ơn
    // =========================================================================
    const conv2Start = new Date(now - 2 * hour);
    const conv2Time1 = new Date(now - 110 * minute);
    const conv2Time2 = new Date(now - 80 * minute);
    const conv2Time3 = new Date(now - 50 * minute);

    const conv2 = await Conversation.create({
      customerId: customer._id,
      assignedAdminId: admin1._id,
      subject: "Hỏi về tình trạng giao hàng đơn #1024",
      status: "open",
      adminUnreadCount: 0,
      customerUnreadCount: 0,
      createdAt: conv2Start,
      updatedAt: conv2Time3,
    });

    await Message.create({
      conversationId: conv2._id,
      senderId: customer._id,
      messageType: "text",
      content: "Chào shop, đơn hàng #1024 của mình hiện tại đã được giao chưa ạ?",
      isRead: true,
      readAt: conv2Time2,
      createdAt: conv2Time1,
      updatedAt: conv2Time1,
    });

    await Message.create({
      conversationId: conv2._id,
      senderId: admin1._id,
      messageType: "text",
      content: "Dạ chào bạn, đơn hàng #1024 đang được bưu tá đi giao, dự kiến sẽ đến tay bạn trong chiều nay nhé!",
      isRead: true,
      readAt: conv2Time3,
      createdAt: conv2Time2,
      updatedAt: conv2Time2,
    });

    const msg2_3 = await Message.create({
      conversationId: conv2._id,
      senderId: customer._id,
      messageType: "text",
      content: "Dạ mình nhận được thông tin rồi, cảm ơn shop nhiều nhé!",
      isRead: true,
      readAt: new Date(conv2Time3.getTime() + 5 * minute),
      createdAt: conv2Time3,
      updatedAt: conv2Time3,
    });

    conv2.lastMessageAt = msg2_3.createdAt;
    conv2.lastMessagePreview = msg2_3.content;
    await conv2.save();
    console.log(`  ✅ [Ca 2 - OPEN] "${conv2.subject}" (ID: ${conv2._id})`);

    // =========================================================================
    // HỘI THOẠI 3: Trạng thái OPEN (Đang xử lý - có bàn giao ca)
    // - subject: "Yêu cầu đổi trả máy xay sinh tố bị vỡ nắp"
    // - status: 'open', assignedAdminId: Admin 2 (Nhân viên CSKH)
    // - Lịch sử tin nhắn kèm 1 tin nhắn hệ thống (messageType: 'system') bàn giao
    // =========================================================================
    const conv3Start = new Date(now - 4 * hour);
    const conv3Time1 = new Date(now - 220 * minute);
    const conv3Time2 = new Date(now - 190 * minute);
    const conv3Time3 = new Date(now - 170 * minute);
    const conv3Time4 = new Date(now - 140 * minute);

    const conv3 = await Conversation.create({
      customerId: customer._id,
      assignedAdminId: admin2._id,
      subject: "Yêu cầu đổi trả máy xay sinh tố bị vỡ nắp",
      status: "open",
      adminUnreadCount: 0,
      customerUnreadCount: 0,
      createdAt: conv3Start,
      updatedAt: conv3Time4,
    });

    // 1. Khách gửi yêu cầu
    await Message.create({
      conversationId: conv3._id,
      senderId: customer._id,
      messageType: "text",
      content: "Shop ơi, máy xay sinh tố mình nhận hôm qua bị nứt phần nắp đậy, shop hỗ trợ đổi nắp mới giúp mình được không?",
      isRead: true,
      readAt: conv3Time2,
      createdAt: conv3Time1,
      updatedAt: conv3Time1,
    });

    // 2. Admin 1 tiếp nhận ban đầu
    await Message.create({
      conversationId: conv3._id,
      senderId: admin1._id,
      messageType: "text",
      content: "Dạ shop đã tiếp nhận thông tin, em sẽ chuyển tiếp ca này cho chuyên viên CSKH hỗ trợ xử lý đổi hàng ngay cho mình ạ.",
      isRead: true,
      readAt: conv3Time3,
      createdAt: conv3Time2,
      updatedAt: conv3Time2,
    });

    // 3. Tin nhắn hệ thống ghi nhận bàn giao ca
    await Message.create({
      conversationId: conv3._id,
      senderId: admin1._id,
      messageType: "system",
      content: "Quản trị viên Admin đã bàn giao cuộc hội thoại cho Nhân viên CSKH.",
      isRead: true,
      readAt: conv3Time4,
      createdAt: conv3Time3,
      updatedAt: conv3Time3,
    });

    // 4. Admin 2 (Nhân viên CSKH) tiếp quản và phản hồi
    const msg3_4 = await Message.create({
      conversationId: conv3._id,
      senderId: admin2._id,
      messageType: "text",
      content: "Chào bạn, mình là nhân viên CSKH phụ trách ca này. Shop đã tạo đơn đổi linh kiện nắp mới miễn phí gửi về địa chỉ của bạn rồi nhé.",
      isRead: true,
      readAt: new Date(conv3Time4.getTime() + 10 * minute),
      createdAt: conv3Time4,
      updatedAt: conv3Time4,
    });

    conv3.lastMessageAt = msg3_4.createdAt;
    conv3.lastMessagePreview = msg3_4.content;
    await conv3.save();
    console.log(`  ✅ [Ca 3 - OPEN & BÀN GIAO] "${conv3.subject}" (ID: ${conv3._id})`);

    // =========================================================================
    // HỘI THOẠI 4: Trạng thái CLOSED (Đã đóng)
    // - subject: "Chính sách bảo hành chảo chống dính"
    // - status: 'closed', assignedAdminId: Admin 1
    // - Lịch sử tin nhắn kết thúc bằng 1 tin nhắn hệ thống (messageType: 'system') đóng hội thoại
    // =========================================================================
    const conv4Start = new Date(now - 6 * hour);
    const conv4Time1 = new Date(now - 340 * minute);
    const conv4Time2 = new Date(now - 310 * minute);
    const conv4Time3 = new Date(now - 280 * minute);
    const conv4Time4 = new Date(now - 260 * minute);

    const conv4 = await Conversation.create({
      customerId: customer._id,
      assignedAdminId: admin1._id,
      subject: "Chính sách bảo hành chảo chống dính",
      status: "closed",
      adminUnreadCount: 0,
      customerUnreadCount: 0,
      createdAt: conv4Start,
      updatedAt: conv4Time4,
    });

    await Message.create({
      conversationId: conv4._id,
      senderId: customer._id,
      messageType: "text",
      content: "Shop cho mình hỏi chảo chống dính Tefal bên mình được bảo hành chính hãng bao lâu vậy?",
      isRead: true,
      readAt: conv4Time2,
      createdAt: conv4Time1,
      updatedAt: conv4Time1,
    });

    await Message.create({
      conversationId: conv4._id,
      senderId: admin1._id,
      messageType: "text",
      content: "Dạ sản phẩm chảo Tefal được bảo hành chính hãng 24 tháng cho phần đáy từ và tay cầm bạn nhé.",
      isRead: true,
      readAt: conv4Time3,
      createdAt: conv4Time2,
      updatedAt: conv4Time2,
    });

    await Message.create({
      conversationId: conv4._id,
      senderId: customer._id,
      messageType: "text",
      content: "Dạ vâng mình hiểu rồi, cảm ơn shop rất nhiều.",
      isRead: true,
      readAt: conv4Time4,
      createdAt: conv4Time3,
      updatedAt: conv4Time3,
    });

    // Tin nhắn hệ thống kết thúc đóng hội thoại
    const msg4_4 = await Message.create({
      conversationId: conv4._id,
      senderId: admin1._id,
      messageType: "system",
      content: "Hội thoại đã được đóng bởi Admin.",
      isRead: true,
      readAt: conv4Time4,
      createdAt: conv4Time4,
      updatedAt: conv4Time4,
    });

    conv4.lastMessageAt = msg4_4.createdAt;
    conv4.lastMessagePreview = msg4_4.content;
    await conv4.save();
    console.log(`  ✅ [Ca 4 - CLOSED] "${conv4.subject}" (ID: ${conv4._id})`);

    // =========================================================================
    // TỔNG KẾT VÀ KIỂM TRA SỐ LƯỢNG
    // =========================================================================
    const totalConvs = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();

    console.log("\n===============================================================");
    console.log("🎉 NẠP DỮ LIỆU MẪU THÀNH CÔNG RỰC RỠ!");
    console.log("===============================================================");
    console.log(`📊 Tổng số cuộc hội thoại trong Database: ${totalConvs}`);
    console.log(`💬 Tổng số tin nhắn trong Database:       ${totalMessages}`);
    console.log("---------------------------------------------------------------");
    console.log("Chi tiết 4 cuộc hội thoại vừa tạo:");
    console.log(` 1. [Pending]  : ${conv1._id} | Subject: "${conv1.subject}" | Unread: ${conv1.adminUnreadCount}`);
    console.log(` 2. [Open]     : ${conv2._id} | Subject: "${conv2.subject}" | Assignee: Admin 1 (${admin1.name})`);
    console.log(` 3. [Open-Hand]: ${conv3._id} | Subject: "${conv3.subject}" | Assignee: Admin 2 (${admin2.name})`);
    console.log(` 4. [Closed]   : ${conv4._id} | Subject: "${conv4.subject}" | Status: ${conv4.status}`);
    console.log("===============================================================\n");
  } catch (error: any) {
    console.error("❌ Lỗi khi thực hiện seed dữ liệu hội thoại:", error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

// Thực thi hàm seed
seedConversations();
