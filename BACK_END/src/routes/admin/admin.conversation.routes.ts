/**
 * FILE: BACK_END/src/routes/admin/admin.conversation.routes.ts
 *
 * NHIỆM VỤ:
 * - Định nghĩa các endpoint quản lý hội thoại chăm sóc khách hàng phía Admin.
 * - Yêu cầu đăng nhập và có role admin.
 */

import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import roleMiddleware from "../../middlewares/role.middleware";

import {
  getAdminConversations,
  getAdminConversationStatistics,
  getAdminAssignees,
  getAdminConversationById,
  getAdminConversationMessages,
  sendAdminMessage,
  assignAdmin,
  updateConversationStatus,
  markAdminConversationRead,
} from "../../controllers/admin/admin.conversation.controller";

import {
  getAdminConversationsValidator,
  conversationIdValidator,
  sendAdminMessageValidator,
  assignAdminValidator,
  updateConversationStatusValidator,
  validateAdminConversationRequest,
} from "../../validators/admin/admin.conversation.validator";

const router = Router();

router.use(authMiddleware, roleMiddleware("admin"));

/**
 * 1. GET /api/admin/conversations/statistics
 * Thống kê 4 thẻ chỉ số hội thoại
 */
router.get("/statistics", getAdminConversationStatistics);

/**
 * 2. GET /api/admin/conversations/assignees
 * Danh sách nhân viên CSKH/Admin để phân công
 */
router.get("/assignees", getAdminAssignees);

/**
 * 3. GET /api/admin/conversations
 * Danh sách hội thoại (lọc, tìm kiếm, phân trang)
 */
router.get(
  "/",
  getAdminConversationsValidator,
  validateAdminConversationRequest,
  getAdminConversations
);

/**
 * 4. GET /api/admin/conversations/:id
 * Chi tiết một cuộc hội thoại
 */
router.get(
  "/:id",
  conversationIdValidator,
  validateAdminConversationRequest,
  getAdminConversationById
);

/**
 * 5. GET /api/admin/conversations/:id/messages
 * Danh sách tin nhắn trong cuộc hội thoại
 */
router.get(
  "/:id/messages",
  conversationIdValidator,
  validateAdminConversationRequest,
  getAdminConversationMessages
);

/**
 * 6. POST /api/admin/conversations/:id/messages
 * Admin gửi tin nhắn trả lời khách hàng
 */
router.post(
  "/:id/messages",
  sendAdminMessageValidator,
  validateAdminConversationRequest,
  sendAdminMessage
);

/**
 * 7. PATCH /api/admin/conversations/:id/assign
 * Phân công hoặc bàn giao nhân viên phụ trách
 */
router.patch(
  "/:id/assign",
  assignAdminValidator,
  validateAdminConversationRequest,
  assignAdmin
);

/**
 * 8. PATCH /api/admin/conversations/:id/status
 * Đổi trạng thái cuộc trò chuyện (đóng / mở lại)
 */
router.patch(
  "/:id/status",
  updateConversationStatusValidator,
  validateAdminConversationRequest,
  updateConversationStatus
);

/**
 * 9. PATCH /api/admin/conversations/:id/read
 * Đánh dấu admin đã đọc tin nhắn
 */
router.patch(
  "/:id/read",
  conversationIdValidator,
  validateAdminConversationRequest,
  markAdminConversationRead
);

export default router;
