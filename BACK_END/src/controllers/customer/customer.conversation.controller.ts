/**
 * FILE: BACK_END/src/controllers/customer/customer.conversation.controller.ts
 *
 * NHIỆM VỤ:
 * - Điều phối request / response cho các API hội thoại CSKH phía Khách hàng.
 */

import type { Request, Response, NextFunction } from "express";
import {
  getCurrentCustomerConversationService,
  createCustomerConversationService,
  getCustomerConversationsService,
  getCustomerConversationMessagesService,
  sendCustomerMessageService,
  markCustomerConversationReadService,
} from "../../services/customer/customer.conversation.service";
import type { MessageType } from "../../types/conversation.types";

/**
 * GET /api/customer/conversations/current
 * Lấy cuộc hội thoại đang mở hoặc gần nhất của khách hàng hiện tại.
 */
export const getCurrentCustomerConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const conversation = await getCurrentCustomerConversationService(customerId);

    res.status(200).json({
      success: true,
      message: conversation
        ? "Lấy hội thoại hiện tại thành công."
        : "Khách hàng chưa có cuộc hội thoại nào.",
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/customer/conversations
 * Khách hàng khởi tạo cuộc hội thoại mới.
 */
export const createCustomerConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const { subject, firstMessage } = req.body;

    const result = await createCustomerConversationService(customerId, {
      subject,
      firstMessage,
    });

    res.status(201).json({
      success: true,
      message: "Tạo cuộc hội thoại thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customer/conversations
 * Lấy danh sách lịch sử hội thoại của khách hàng.
 */
export const getCustomerConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await getCustomerConversationsService(customerId, {
      page,
      limit,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách hội thoại thành công.",
      data: result.conversations,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customer/conversations/:id/messages
 * Lấy danh sách tin nhắn của cuộc hội thoại.
 */
export const getCustomerConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const conversationId = req.params.id as string;

    const messages = await getCustomerConversationMessagesService(
      customerId,
      conversationId
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách tin nhắn thành công.",
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/customer/conversations/:id/messages
 * Khách hàng gửi tin nhắn trong cuộc hội thoại.
 */
export const sendCustomerMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const conversationId = req.params.id as string;
    const { content, messageType, attachments } = req.body;

    const message = await sendCustomerMessageService(
      customerId,
      conversationId,
      {
        content,
        messageType: messageType as MessageType,
        attachments,
      }
    );

    res.status(201).json({
      success: true,
      message: "Gửi tin nhắn thành công.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/customer/conversations/:id/read
 * Khách hàng đánh dấu đã đọc tin nhắn.
 */
export const markCustomerConversationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.user!.userId;
    const conversationId = req.params.id as string;

    await markCustomerConversationReadService(customerId, conversationId);

    res.status(200).json({
      success: true,
      message: "Đánh dấu đã đọc thành công.",
    });
  } catch (error) {
    next(error);
  }
};
