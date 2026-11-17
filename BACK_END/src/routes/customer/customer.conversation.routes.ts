/**
 * FILE: BACK_END/src/routes/customer/customer.conversation.routes.ts
 *
 * NHIỆM VỤ:
 * - Định nghĩa các endpoint chat CSKH dành cho Khách hàng.
 * - Yêu cầu xác thực đăng nhập (authMiddleware).
 */

import { Router } from "express";
import authMiddleware from "../../middlewares/auth.middleware";

import {
  getCurrentCustomerConversation,
  createCustomerConversation,
  getCustomerConversations,
  getCustomerConversationMessages,
  sendCustomerMessage,
  markCustomerConversationRead,
} from "../../controllers/customer/customer.conversation.controller";

import {
  createCustomerConversationValidator,
  customerConversationIdValidator,
  sendCustomerMessageValidator,
  getCustomerConversationsValidator,
  validateCustomerConversationRequest,
} from "../../validators/customer/customer.conversation.validator";

const router = Router();

router.use(authMiddleware);

/**
 * 1. GET /api/customer/conversations/current
 * Lấy hội thoại đang mở gần nhất để mở ngay trên Widget
 */
router.get("/current", getCurrentCustomerConversation);

/**
 * 2. POST /api/customer/conversations
 * Khởi tạo cuộc hội thoại mới
 */
router.post(
  "/",
  createCustomerConversationValidator,
  validateCustomerConversationRequest,
  createCustomerConversation
);

/**
 * 3. GET /api/customer/conversations
 * Lấy danh sách lịch sử hội thoại của khách hàng
 */
router.get(
  "/",
  getCustomerConversationsValidator,
  validateCustomerConversationRequest,
  getCustomerConversations
);

/**
 * 4. GET /api/customer/conversations/:id/messages
 * Lấy danh sách tin nhắn của cuộc hội thoại
 */
router.get(
  "/:id/messages",
  customerConversationIdValidator,
  validateCustomerConversationRequest,
  getCustomerConversationMessages
);

/**
 * 5. POST /api/customer/conversations/:id/messages
 * Khách hàng gửi tin nhắn vào cuộc hội thoại (tự động re-open nếu đã đóng)
 */
router.post(
  "/:id/messages",
  sendCustomerMessageValidator,
  validateCustomerConversationRequest,
  sendCustomerMessage
);

/**
 * 6. PATCH /api/customer/conversations/:id/read
 * Khách hàng đánh dấu đã đọc tin nhắn
 */
router.patch(
  "/:id/read",
  customerConversationIdValidator,
  validateCustomerConversationRequest,
  markCustomerConversationRead
);

export default router;
