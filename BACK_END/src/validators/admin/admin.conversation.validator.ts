/**
 * FILE: BACK_END/src/validators/admin/admin.conversation.validator.ts
 *
 * NHIỆM VỤ:
 * - Validate request danh sách, thống kê, tin nhắn, phân công và trạng thái hội thoại CSKH phía Admin.
 */

import { param, query, body, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";

export const getAdminConversationsValidator = [
  query("keyword")
    .optional()
    .isString()
    .withMessage("Từ khóa tìm kiếm phải là chuỗi.")
    .bail()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Từ khóa không được vượt quá 100 ký tự."),

  query("status")
    .optional()
    .isIn(["all", "open", "pending", "closed"])
    .withMessage("Trạng thái phải là: all, open, pending hoặc closed."),

  query("assignedAdminId")
    .optional()
    .isMongoId()
    .withMessage("ID nhân viên phụ trách không hợp lệ."),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page phải là số nguyên >= 1."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit phải từ 1 đến 100."),
];

export const conversationIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("ID cuộc hội thoại không đúng định dạng MongoDB."),
];

export const sendAdminMessageValidator = [
  ...conversationIdValidator,

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung tin nhắn không được để trống.")
    .bail()
    .isLength({ max: 5000 })
    .withMessage("Nội dung tin nhắn không được vượt quá 5000 ký tự."),

  body("messageType")
    .optional()
    .isIn(["text", "image", "file", "system"])
    .withMessage("Loại tin nhắn không hợp lệ."),

  body("attachments")
    .optional({ nullable: true })
    .isArray()
    .withMessage("Đính kèm phải là một mảng chuỗi URL."),
];

export const assignAdminValidator = [
  ...conversationIdValidator,

  body("assignedAdminId")
    .custom((value) => {
      if (value === null || value === undefined || value === "") {
        return true;
      }
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
      if (typeof value === "string" && mongoIdRegex.test(value)) {
        return true;
      }
      throw new Error("ID nhân viên phân công phải là MongoId hợp lệ hoặc null.");
    }),
];

export const updateConversationStatusValidator = [
  ...conversationIdValidator,

  body("status")
    .isIn(["open", "pending", "closed"])
    .withMessage("Trạng thái phải là: open, pending hoặc closed."),
];

export const validateAdminConversationRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Dữ liệu yêu cầu không hợp lệ.",
      errors: errors.array().map((error) => ({
        field: error.type === "field" ? error.path : undefined,
        message: error.msg,
      })),
    });
    return;
  }

  next();
};
