/**
 * FILE: BACK_END/src/services/admin/admin.conversation.service.ts
 *
 * NHIỆM VỤ:
 * - Nghiệp vụ quản lý hội thoại CSKH phía Admin:
 *   + Danh sách hội thoại (lọc, tìm kiếm, phân trang)
 *   + Thống kê 4 chỉ số Dashboard (total, open, pending, unread)
 *   + Danh sách nhân viên CSKH/Admin để phân công
 *   + Xem chi tiết & lịch sử tin nhắn
 *   + Admin gửi tin nhắn trả lời
 *   + Phân công/bàn giao nhân viên kèm tin nhắn hệ thống (system message)
 *   + Đổi trạng thái (đóng/mở) kèm tin nhắn hệ thống
 *   + Đánh dấu admin đã đọc tin nhắn
 */

import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import { Conversation, Message, User } from "../../models";
import {
  emitNewMessage,
  emitConversationUpdated,
  emitKpiUpdated,
  emitConversationStatusChanged,
} from "../../socket/socketEmitter";
import type { ConversationStatus, MessageType } from "../../types/conversation.types";

export interface GetAdminConversationsParams {
  keyword?: string;
  status?: "all" | ConversationStatus;
  assignedAdminId?: string;
  page?: number;
  limit?: number;
}

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Format conversation document sang cả dạng camelCase và snake_case
 * để tương thích 100% với Admin UI và API clients.
 */
export const formatConversationForAdmin = (
  conv: any,
  customerUser?: any,
  assignedUser?: any
) => {
  const customer = customerUser || conv.customerId;
  const admin = assignedUser || conv.assignedAdminId;

  const customerIdStr = customer?._id ? customer._id.toString() : conv.customerId?.toString() || "";
  const customerName = customer?.name || "Khách hàng";
  const customerEmail = customer?.email || "";
  const customerAvatar = customer?.avatar || null;

  const assignedAdminIdStr = admin?._id ? admin._id.toString() : conv.assignedAdminId ? conv.assignedAdminId.toString() : null;
  const assignedAdminName = admin?.name || null;

  return {
    id: conv._id.toString(),
    _id: conv._id.toString(),

    // Snake case cho Admin Frontend hiện tại
    customer_id: customerIdStr,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_avatar: customerAvatar,

    assigned_admin_id: assignedAdminIdStr,
    assigned_admin_name: assignedAdminName,

    subject: conv.subject || null,
    status: conv.status as ConversationStatus,

    last_message_at: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
    last_message_preview: conv.lastMessagePreview || null,

    customer_unread_count: conv.customerUnreadCount || 0,
    admin_unread_count: conv.adminUnreadCount || 0,

    created_at: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
    updated_at: conv.updatedAt ? new Date(conv.updatedAt).toISOString() : new Date().toISOString(),

    // Camel case cho tiêu chuẩn REST API hiện đại
    customerId: customerIdStr,
    customerName,
    customerEmail,
    customerAvatar,
    assignedAdminId: assignedAdminIdStr,
    assignedAdminName,
    lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
    lastMessagePreview: conv.lastMessagePreview || null,
    customerUnreadCount: conv.customerUnreadCount || 0,
    adminUnreadCount: conv.adminUnreadCount || 0,
    createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * Format Message document sang cả camelCase và snake_case.
 */
export const formatMessageForView = (msg: any, senderUser?: any) => {
  const sender = senderUser || msg.senderId;
  const senderIdStr = sender?._id ? sender._id.toString() : msg.senderId?.toString() || "";
  const senderName = sender?.name || "Người dùng";
  const senderRole = sender?.role || "customer";

  return {
    id: msg._id.toString(),
    _id: msg._id.toString(),
    conversation_id: msg.conversationId?.toString() || "",
    conversationId: msg.conversationId?.toString() || "",

    sender_id: senderIdStr,
    senderId: senderIdStr,
    sender_name: senderName,
    senderName,
    sender_role: senderRole,
    senderRole,

    message_type: msg.messageType,
    messageType: msg.messageType,
    content: msg.content || null,
    attachments: msg.attachments || null,

    is_read: Boolean(msg.isRead),
    isRead: Boolean(msg.isRead),
    read_at: msg.readAt ? new Date(msg.readAt).toISOString() : null,
    readAt: msg.readAt ? new Date(msg.readAt).toISOString() : null,

    created_at: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
    updated_at: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : new Date().toISOString(),
    updatedAt: msg.updatedAt ? new Date(msg.updatedAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * 1. Lấy danh sách cuộc hội thoại cho Admin
 */
export const getAdminConversationsService = async (params: GetAdminConversationsParams) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query: any = {};

  if (params.status && params.status !== "all") {
    query.status = params.status;
  }

  if (params.assignedAdminId) {
    query.assignedAdminId = new Types.ObjectId(params.assignedAdminId);
  }

  if (params.keyword && params.keyword.trim()) {
    const cleanKeyword = escapeRegex(params.keyword.trim());
    const keywordRegex = new RegExp(cleanKeyword, "i");

    // Tìm các customer có tên hoặc email trùng từ khóa
    const matchingUsers = await User.find(
      {
        $or: [{ name: keywordRegex }, { email: keywordRegex }],
      },
      { _id: 1 }
    ).lean();

    const matchingUserIds = matchingUsers.map((u) => u._id);

    query.$or = [
      { customerId: { $in: matchingUserIds } },
      { subject: keywordRegex },
      { lastMessagePreview: keywordRegex },
    ];
  }

  const [total, conversations] = await Promise.all([
    Conversation.countDocuments(query),
    Conversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customerId", "name email avatar")
      .populate("assignedAdminId", "name email avatar")
      .lean(),
  ]);

  const items = conversations.map((conv) => formatConversationForAdmin(conv));

  return {
    conversations: items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 2. Thống kê 4 chỉ số Dashboard hội thoại
 */
export const getAdminConversationStatisticsService = async () => {
  const [total, open, pending, unreadStats] = await Promise.all([
    Conversation.countDocuments(),
    Conversation.countDocuments({ status: "open" }),
    Conversation.countDocuments({ status: "pending" }),
    Conversation.aggregate<{ totalUnread: number }>([
      {
        $group: {
          _id: null,
          totalUnread: { $sum: "$adminUnreadCount" },
        },
      },
    ]),
  ]);

  const unread = unreadStats[0]?.totalUnread || 0;

  return {
    total,
    open,
    pending,
    unread,
  };
};

/**
 * 3. Lấy danh sách nhân viên CSKH/Admin để phân công
 */
export const getAdminAssigneesService = async () => {
  const admins = await User.find(
    { role: "admin", status: "active" },
    { _id: 1, name: 1, email: 1, avatar: 1, role: 1 }
  )
    .sort({ name: 1 })
    .lean();

  return admins.map((admin) => ({
    id: admin._id.toString(),
    _id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    avatar: admin.avatar || null,
    role: admin.role,
  }));
};

/**
 * 4. Lấy chi tiết một cuộc hội thoại
 */
export const getAdminConversationByIdService = async (conversationId: string) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "ID hội thoại không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId)
    .populate("customerId", "name email avatar")
    .populate("assignedAdminId", "name email avatar")
    .lean();

  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  return formatConversationForAdmin(conversation);
};

/**
 * 5. Lấy danh sách tin nhắn của cuộc hội thoại
 */
export const getAdminConversationMessagesService = async (conversationId: string) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "ID hội thoại không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  const messages = await Message.find({ conversationId: new Types.ObjectId(conversationId) })
    .sort({ createdAt: 1 })
    .populate("senderId", "name role avatar")
    .lean();

  return messages.map((msg) => formatMessageForView(msg));
};

/**
 * 6. Admin gửi tin nhắn trả lời khách hàng
 */
export const sendAdminMessageService = async (
  conversationId: string,
  adminId: string,
  data: {
    content: string;
    messageType?: MessageType;
    attachments?: string[];
  }
) => {
  if (!Types.ObjectId.isValid(conversationId) || !Types.ObjectId.isValid(adminId)) {
    throw new AppError(400, "Tham số không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  if (conversation.status === "closed") {
    throw new AppError(400, "Hội thoại đã đóng. Vui lòng mở lại trước khi trả lời.");
  }

  const adminUser = await User.findById(adminId, { name: 1, role: 1, avatar: 1 }).lean();
  if (!adminUser) {
    throw new AppError(404, "Không tìm thấy tài khoản quản trị viên.");
  }

  const now = new Date();
  const createdMessage = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(adminId),
    messageType: data.messageType || "text",
    content: data.content,
    attachments: data.attachments || null,
    isRead: true,
    readAt: now,
  });

  // Cập nhật Conversation
  conversation.lastMessageAt = now;
  conversation.lastMessagePreview = data.content;
  conversation.customerUnreadCount = (conversation.customerUnreadCount || 0) + 1;

  // Nếu cuộc hội thoại đang pending hoặc chưa có ai nhận, tự động gán cho admin này và chuyển sang open
  if (conversation.status === "pending" || !conversation.assignedAdminId) {
    conversation.assignedAdminId = new Types.ObjectId(adminId);
    conversation.status = "open";
  }

  await conversation.save();

  const formattedMsg = formatMessageForView(createdMessage, adminUser);

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    // 1. Bắn emitNewMessage tới room ca chat (để khách hàng nhận được ngay)
    emitNewMessage(conversationId, formattedMsg);

    // 2. Bắn emitConversationUpdated để cập nhật preview và badge trên Admin Portal
    const updatedConversation = await Conversation.findById(conversationId)
      .populate("customerId", "name email avatar")
      .populate("assignedAdminId", "name email avatar")
      .lean();
    if (updatedConversation) {
      emitConversationUpdated(formatConversationForAdmin(updatedConversation));
    }

    // 3. Tính lại và bắn emitKpiUpdated tới admin_channel
    const kpiStats = await getAdminConversationStatisticsService();
    emitKpiUpdated(kpiStats);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong sendAdminMessageService:",
      socketError
    );
  }

  return formattedMsg;
};

/**
 * 7. Phân công hoặc bàn giao nhân viên CSKH
 */
export const assignAdminService = async (
  conversationId: string,
  performingAdminId: string,
  assignedAdminId: string | null
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "ID hội thoại không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  const performingAdmin = await User.findById(performingAdminId, { name: 1, email: 1 }).lean();
  const performingAdminName = performingAdmin?.name || "Quản trị viên";

  let targetAdminName: string | null = null;
  let targetAdminObjectId: Types.ObjectId | null = null;

  if (assignedAdminId) {
    if (!Types.ObjectId.isValid(assignedAdminId)) {
      throw new AppError(400, "ID nhân viên phân công không hợp lệ.");
    }
    const targetAdmin = await User.findOne(
      { _id: new Types.ObjectId(assignedAdminId), role: "admin" },
      { name: 1 }
    ).lean();

    if (!targetAdmin) {
      throw new AppError(404, "Không tìm thấy nhân viên quản trị được chọn.");
    }
    targetAdminName = targetAdmin.name;
    targetAdminObjectId = targetAdmin._id;
  }

  conversation.assignedAdminId = targetAdminObjectId;
  await conversation.save();

  // Tạo System Message ghi nhận lịch sử phân công/bàn giao
  const systemContent = targetAdminName
    ? `Quản trị viên ${performingAdminName} đã bàn giao cuộc hội thoại cho ${targetAdminName}.`
    : `Quản trị viên ${performingAdminName} đã hủy phân công cuộc hội thoại.`;

  const now = new Date();
  const systemMessage = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(performingAdminId),
    messageType: "system",
    content: systemContent,
    isRead: true,
    readAt: now,
  });

  const updatedConversation = await Conversation.findById(conversationId)
    .populate("customerId", "name email avatar")
    .populate("assignedAdminId", "name email avatar")
    .lean();

  const formattedConversation = formatConversationForAdmin(updatedConversation);
  const formattedSystemMessage = formatMessageForView(systemMessage, performingAdmin);

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    // 1. Bắn emitNewMessage (tin nhắn hệ thống bàn giao) tới room ca chat
    emitNewMessage(conversationId, formattedSystemMessage);

    // 2. Bắn emitConversationUpdated tới admin_channel và room ca chat
    emitConversationUpdated(formattedConversation);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong assignAdminService:",
      socketError
    );
  }

  return {
    conversation: formattedConversation,
    systemMessage: formattedSystemMessage,
  };
};

/**
 * 8. Cập nhật trạng thái hội thoại (đóng / mở lại)
 */
export const updateConversationStatusService = async (
  conversationId: string,
  performingAdminId: string,
  nextStatus: ConversationStatus
) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "ID hội thoại không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  const performingAdmin = await User.findById(performingAdminId, { name: 1 }).lean();
  const performingAdminName = performingAdmin?.name || "Quản trị viên";

  conversation.status = nextStatus;
  await conversation.save();

  // Tạo tin nhắn hệ thống ghi nhận đóng / mở lại
  let systemContent = "";
  if (nextStatus === "closed") {
    systemContent = `Hội thoại đã được đóng bởi ${performingAdminName}.`;
  } else if (nextStatus === "open") {
    systemContent = `Hội thoại đã được mở lại bởi ${performingAdminName}.`;
  } else {
    systemContent = `Hội thoại được chuyển sang trạng thái chờ tiếp nhận bởi ${performingAdminName}.`;
  }

  const now = new Date();
  const systemMessage = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(performingAdminId),
    messageType: "system",
    content: systemContent,
    isRead: true,
    readAt: now,
  });

  const updatedConversation = await Conversation.findById(conversationId)
    .populate("customerId", "name email avatar")
    .populate("assignedAdminId", "name email avatar")
    .lean();

  const formattedConversation = formatConversationForAdmin(updatedConversation);
  const formattedSystemMessage = formatMessageForView(systemMessage, performingAdmin);

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    // 1. Bắn emitNewMessage (tin nhắn hệ thống đóng/mở ca) tới room ca chat
    emitNewMessage(conversationId, formattedSystemMessage);

    // 2. Bắn emitConversationStatusChanged tới room ca chat & admin_channel
    emitConversationStatusChanged(conversationId, nextStatus);

    // 3. Bắn emitConversationUpdated để cập nhật danh sách
    emitConversationUpdated(formattedConversation);

    // 4. Bắn emitKpiUpdated tới admin_channel
    const kpiStats = await getAdminConversationStatisticsService();
    emitKpiUpdated(kpiStats);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong updateConversationStatusService:",
      socketError
    );
  }

  return {
    conversation: formattedConversation,
    systemMessage: formattedSystemMessage,
  };
};

/**
 * 9. Đánh dấu Admin đã đọc hội thoại
 */
export const markAdminConversationReadService = async (conversationId: string) => {
  if (!Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "ID hội thoại không hợp lệ.");
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  conversation.adminUnreadCount = 0;
  await conversation.save();

  // Đánh dấu các tin nhắn do khách gửi là isRead = true
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: conversation.customerId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    const updatedConversation = await Conversation.findById(conversationId)
      .populate("customerId", "name email avatar")
      .populate("assignedAdminId", "name email avatar")
      .lean();
    if (updatedConversation) {
      emitConversationUpdated(formatConversationForAdmin(updatedConversation));
    }
    const kpiStats = await getAdminConversationStatisticsService();
    emitKpiUpdated(kpiStats);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong markAdminConversationReadService:",
      socketError
    );
  }

  return { success: true };
};
