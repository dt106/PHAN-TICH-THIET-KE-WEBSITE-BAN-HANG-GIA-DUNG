/**
 * FILE: BACK_END/src/controllers/admin/admin.conversation.controller.ts
 *
 * NHIỆM VỤ:
 * - Điều phối request / response cho các API hội thoại chăm sóc khách hàng phía Admin.
 */

import type { Request, Response, NextFunction } from "express";
import {
  getAdminConversationsService,
  getAdminConversationStatisticsService,
  getAdminAssigneesService,
  getAdminConversationByIdService,
  getAdminConversationMessagesService,
  sendAdminMessageService,
  assignAdminService,
  updateConversationStatusService,
  markAdminConversationReadService,
} from "../../services/admin/admin.conversation.service";
import type { ConversationStatus, MessageType } from "../../types/conversation.types";

/**
 * GET /api/admin/conversations
 * Lấy danh sách hội thoại có tìm kiếm, lọc theo trạng thái và phân trang.
 */
export const getAdminConversations = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keyword = typeof req.query.keyword === "string" ? req.query.keyword : undefined;
    const status = typeof req.query.status === "string" ? (req.query.status as any) : undefined;
    const assignedAdminId = typeof req.query.assignedAdminId === "string" ? req.query.assignedAdminId : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await getAdminConversationsService({
      keyword,
      status,
      assignedAdminId,
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
 * GET /api/admin/conversations/statistics
 * Lấy 4 chỉ số thống kê (total, open, pending, unread).
 */
export const getAdminConversationStatistics = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await getAdminConversationStatisticsService();

    res.status(200).json({
      success: true,
      message: "Lấy thống kê hội thoại thành công.",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/conversations/assignees
 * Lấy danh sách nhân viên CSKH / Admin phục vụ dropdown phân công.
 */
export const getAdminAssignees = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignees = await getAdminAssigneesService();

    res.status(200).json({
      success: true,
      message: "Lấy danh sách nhân viên phân công thành công.",
      data: assignees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/conversations/:id
 * Lấy chi tiết một cuộc hội thoại.
 */
export const getAdminConversationById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const conversation = await getAdminConversationByIdService(id);

    res.status(200).json({
      success: true,
      message: "Lấy chi tiết hội thoại thành công.",
      data: conversation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/conversations/:id/messages
 * Lấy danh sách tin nhắn của một cuộc hội thoại.
 */
export const getAdminConversationMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const messages = await getAdminConversationMessagesService(id);

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
 * POST /api/admin/conversations/:id/messages
 * Admin gửi tin nhắn trả lời khách hàng.
 */
export const sendAdminMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminId = req.user!.userId;
    const id = req.params.id as string;
    const { content, messageType, attachments } = req.body;

    const message = await sendAdminMessageService(id, adminId, {
      content,
      messageType: messageType as MessageType,
      attachments,
    });

    res.status(201).json({
      success: true,
      message: "Gửi tin nhắn trả lời thành công.",
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/conversations/:id/assign
 * Phân công hoặc bàn giao nhân viên phụ trách cuộc hội thoại.
 */
export const assignAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const performingAdminId = req.user!.userId;
    const id = req.params.id as string;
    const { assignedAdminId } = req.body;

    const result = await assignAdminService(
      id,
      performingAdminId,
      assignedAdminId || null
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật phân công nhân viên thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/conversations/:id/status
 * Cập nhật trạng thái hội thoại (đóng / mở lại).
 */
export const updateConversationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const performingAdminId = req.user!.userId;
    const id = req.params.id as string;
    const { status } = req.body;

    const result = await updateConversationStatusService(
      id,
      performingAdminId,
      status as ConversationStatus
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái hội thoại thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/conversations/:id/read
 * Đánh dấu admin đã đọc tin nhắn trong cuộc hội thoại.
 */
export const markAdminConversationRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id as string;
    await markAdminConversationReadService(id);

    res.status(200).json({
      success: true,
      message: "Đánh dấu đã đọc thành công.",
    });
  } catch (error) {
    next(error);
  }
};
