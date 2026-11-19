/**
 * FILE: BACK_END/src/services/customer/customer.conversation.service.ts
 *
 * NHIỆM VỤ:
 * - Xử lý nghiệp vụ hội thoại CSKH phía Khách hàng (User/Customer):
 *   + Lấy cuộc hội thoại đang hoạt động (current) để render widget
 *   + Tạo hội thoại mới (hoặc tiếp tục hội thoại)
 *   + Lấy lịch sử hội thoại & tin nhắn của chính khách hàng
 *   + Khách hàng gửi tin nhắn (kèm cơ chế tự động mở lại - Re-open khi hội thoại đã đóng)
 *   + Đánh dấu khách hàng đã đọc tin nhắn của Admin
 */

import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import { Conversation, Message, User } from "../../models";
import {
  formatConversationForAdmin,
  formatMessageForView,
  getAdminConversationStatisticsService,
} from "../admin/admin.conversation.service";
import {
  emitNewMessage,
  emitConversationUpdated,
  emitKpiUpdated,
  emitConversationStatusChanged,
} from "../../socket/socketEmitter";
import type { MessageType } from "../../types/conversation.types";

/**
 * Format conversation dành cho phía Khách hàng.
 */
const formatConversationForCustomer = (conv: any, assignedUser?: any) => {
  const admin = assignedUser || conv.assignedAdminId;
  const assignedAdminName = admin?.name || "Bộ phận CSKH";

  return {
    id: conv._id.toString(),
    _id: conv._id.toString(),
    subject: conv.subject || "Hỗ trợ khách hàng",
    status: conv.status,
    assignedAdminName,
    lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : null,
    lastMessagePreview: conv.lastMessagePreview || null,
    unreadCount: conv.customerUnreadCount || 0,
    customerUnreadCount: conv.customerUnreadCount || 0,
    createdAt: conv.createdAt ? new Date(conv.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: conv.updatedAt ? new Date(conv.updatedAt).toISOString() : new Date().toISOString(),
  };
};

/**
 * 1. Lấy cuộc hội thoại đang mở hoặc gần nhất của khách hàng
 */
export const getCurrentCustomerConversationService = async (customerId: string) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new AppError(400, "ID khách hàng không hợp lệ.");
  }

  // Ưu tiên hội thoại đang mở (open hoặc pending)
  let conversation = await Conversation.findOne({
    customerId: new Types.ObjectId(customerId),
    status: { $in: ["open", "pending"] },
  })
    .sort({ updatedAt: -1 })
    .populate("assignedAdminId", "name avatar")
    .lean();

  // Nếu không có hội thoại mở, lấy hội thoại gần nhất bất kỳ
  if (!conversation) {
    conversation = await Conversation.findOne({
      customerId: new Types.ObjectId(customerId),
    })
      .sort({ updatedAt: -1 })
      .populate("assignedAdminId", "name avatar")
      .lean();
  }

  if (!conversation) {
    return null;
  }

  return formatConversationForCustomer(conversation);
};

/**
 * 2. Khách hàng tạo/mở cuộc hội thoại mới
 */
export const createCustomerConversationService = async (
  customerId: string,
  data: {
    subject?: string;
    firstMessage: string;
  }
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new AppError(400, "ID khách hàng không hợp lệ.");
  }

  const customerUser = await User.findById(customerId).lean();
  if (!customerUser) {
    throw new AppError(404, "Không tìm thấy thông tin khách hàng.");
  }

  const now = new Date();
  const subject = data.subject?.trim() || "Yêu cầu hỗ trợ từ khách hàng";

  // Tạo cuộc hội thoại mới với trạng thái pending
  const conversation = await Conversation.create({
    customerId: new Types.ObjectId(customerId),
    assignedAdminId: null,
    subject,
    status: "pending",
    lastMessageAt: now,
    lastMessagePreview: data.firstMessage,
    customerUnreadCount: 0,
    adminUnreadCount: 1,
  });

  // Tạo tin nhắn đầu tiên của khách
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(customerId),
    messageType: "text",
    content: data.firstMessage,
    attachments: null,
    isRead: false,
    readAt: null,
  });

  const formattedConversationCustomer = formatConversationForCustomer(conversation);
  const formattedMessage = formatMessageForView(message, customerUser);

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    const convIdStr = conversation._id.toString();

    // 1. Bắn emitNewMessage tới room ca chat
    emitNewMessage(convIdStr, formattedMessage);

    // 2. Bắn emitConversationUpdated tới admin_channel để Admin thấy preview & badge unread
    const formattedConversationAdmin = formatConversationForAdmin(conversation, customerUser);
    emitConversationUpdated(formattedConversationAdmin);

    // 3. Tính toán lại thống kê và bắn emitKpiUpdated tới admin_channel
    const kpiStats = await getAdminConversationStatisticsService();
    emitKpiUpdated(kpiStats);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong createCustomerConversationService:",
      socketError
    );
  }

  return {
    conversation: formattedConversationCustomer,
    message: formattedMessage,
  };
};

/**
 * 3. Lấy danh sách lịch sử hội thoại của khách hàng
 */
export const getCustomerConversationsService = async (
  customerId: string,
  params: { page?: number; limit?: number }
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    throw new AppError(400, "ID khách hàng không hợp lệ.");
  }

  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const query = { customerId: new Types.ObjectId(customerId) };

  const [total, conversations] = await Promise.all([
    Conversation.countDocuments(query),
    Conversation.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("assignedAdminId", "name avatar")
      .lean(),
  ]);

  return {
    conversations: conversations.map((conv) => formatConversationForCustomer(conv)),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * 4. Lấy danh sách tin nhắn của một cuộc hội thoại
 */
export const getCustomerConversationMessagesService = async (
  customerId: string,
  conversationId: string
) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "Tham số không hợp lệ.");
  }

  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    customerId: new Types.ObjectId(customerId),
  }).lean();

  if (!conversation) {
    throw new AppError(404, "Không tìm thấy hội thoại hoặc bạn không có quyền xem.");
  }

  const messages = await Message.find({ conversationId: new Types.ObjectId(conversationId) })
    .sort({ createdAt: 1 })
    .populate("senderId", "name role avatar")
    .lean();

  return messages.map((msg) => formatMessageForView(msg));
};

/**
 * 5. Khách hàng gửi tin nhắn (kèm cơ chế Re-open tự động nếu đã đóng)
 */
export const sendCustomerMessageService = async (
  customerId: string,
  conversationId: string,
  data: {
    content: string;
    messageType?: MessageType;
    attachments?: string[];
  }
) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "Tham số không hợp lệ.");
  }

  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    customerId: new Types.ObjectId(customerId),
  });

  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại hoặc bạn không có quyền gửi tin.");
  }

  const customerUser = await User.findById(customerId, { name: 1, role: 1, avatar: 1 }).lean();
  const now = new Date();

  // Tạo tin nhắn khách gửi
  const message = await Message.create({
    conversationId: conversation._id,
    senderId: new Types.ObjectId(customerId),
    messageType: data.messageType || "text",
    content: data.content,
    attachments: data.attachments || null,
    isRead: false,
    readAt: null,
  });

  // Cập nhật Conversation
  conversation.lastMessageAt = now;
  conversation.lastMessagePreview = data.content;
  conversation.adminUnreadCount = (conversation.adminUnreadCount || 0) + 1;

  // CƠ CHẾ RE-OPEN TỰ ĐỘNG:
  // Nếu cuộc hội thoại trước đó đang ở trạng thái 'closed', khi khách hàng nhắn tin lại,
  // hệ thống tự động mở lại cuộc hội thoại để Admin/CSKH nhìn thấy ngay lập tức!
  let isReopened = false;
  let reopenSystemMessageDoc: any = null;

  if (conversation.status === "closed") {
    isReopened = true;
    conversation.status = conversation.assignedAdminId ? "open" : "pending";

    // Tạo tin nhắn hệ thống ghi nhận tái mở
    reopenSystemMessageDoc = await Message.create({
      conversationId: conversation._id,
      senderId: new Types.ObjectId(customerId),
      messageType: "system",
      content: "Khách hàng đã gửi tin nhắn mới. Cuộc hội thoại được mở lại.",
      isRead: false,
      readAt: null,
    });
  }

  await conversation.save();

  const formattedMessage = formatMessageForView(message, customerUser);

  // =========================================================================
  // GIAI ĐOẠN 2: PHÁT SỰ KIỆN SOCKET.IO REAL-TIME (DB-FIRST PATTERN)
  // =========================================================================
  try {
    const convIdStr = conversation._id.toString();

    // 1. Bắn emitNewMessage cho tin nhắn của khách tới room ca chat
    emitNewMessage(convIdStr, formattedMessage);

    // 2. Nếu kích hoạt cơ chế Auto Re-open:
    // - Bắn emitNewMessage cho tin nhắn hệ thống tái mở
    // - Bắn emitConversationStatusChanged tới room ca chat
    if (isReopened) {
      if (reopenSystemMessageDoc) {
        const formattedSystemMsg = formatMessageForView(reopenSystemMessageDoc, customerUser);
        emitNewMessage(convIdStr, formattedSystemMsg);
      }
      emitConversationStatusChanged(convIdStr, conversation.status);
    }

    // 3. Bắn emitConversationUpdated tới admin_channel để Admin thấy tin nhắn preview và badge unread
    const updatedConversationDoc = await Conversation.findById(conversation._id)
      .populate("customerId", "name email avatar")
      .populate("assignedAdminId", "name email avatar")
      .lean();
    const formattedAdminConv = formatConversationForAdmin(
      updatedConversationDoc || conversation,
      customerUser
    );
    emitConversationUpdated(formattedAdminConv);

    // 4. Tính toán lại thống kê và bắn emitKpiUpdated tới admin_channel
    const kpiStats = await getAdminConversationStatisticsService();
    emitKpiUpdated(kpiStats);
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong sendCustomerMessageService:",
      socketError
    );
  }

  return formattedMessage;
};

/**
 * 6. Khách hàng đánh dấu đã đọc tin nhắn
 */
export const markCustomerConversationReadService = async (
  customerId: string,
  conversationId: string
) => {
  if (!Types.ObjectId.isValid(customerId) || !Types.ObjectId.isValid(conversationId)) {
    throw new AppError(400, "Tham số không hợp lệ.");
  }

  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    customerId: new Types.ObjectId(customerId),
  });

  if (!conversation) {
    throw new AppError(404, "Không tìm thấy cuộc hội thoại.");
  }

  conversation.customerUnreadCount = 0;
  await conversation.save();

  // Đánh dấu các tin nhắn của Admin trong hội thoại này là isRead = true
  await Message.updateMany(
    {
      conversationId: conversation._id,
      senderId: { $ne: new Types.ObjectId(customerId) },
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  // Phát sự kiện cập nhật hội thoại (reset customerUnreadCount)
  try {
    const updatedConversationDoc = await Conversation.findById(conversation._id)
      .populate("customerId", "name email avatar")
      .populate("assignedAdminId", "name email avatar")
      .lean();
    if (updatedConversationDoc) {
      emitConversationUpdated(formatConversationForAdmin(updatedConversationDoc));
    }
  } catch (socketError) {
    console.error(
      "⚠️ [SocketEmitter] Lỗi phát sự kiện trong markCustomerConversationReadService:",
      socketError
    );
  }

  return { success: true };
};
