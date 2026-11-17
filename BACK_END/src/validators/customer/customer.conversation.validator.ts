/**
 * FILE: BACK_END/src/validators/customer/customer.conversation.validator.ts
 *
 * NHIỆM VỤ:
 * - Validate request mở hội thoại, gửi tin nhắn, đánh dấu đọc từ phía Khách hàng.
 */

import { param, body, query, validationResult } from "express-validator";
import type { Request, Response, NextFunction } from "express";

export const createCustomerConversationValidator = [
  body("subject")
    .optional({ nullable: true })
    .isString()
    .withMessage("Tiêu đề phải là chuỗi ký tự.")
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Tiêu đề không được vượt quá 255 ký tự."),

  body("firstMessage")
    .trim()
    .notEmpty()
    .withMessage("Nội dung tin nhắn đầu tiên không được để trống.")
    .bail()
    .isLength({ max: 5000 })
    .withMessage("Nội dung tin nhắn không được vượt quá 5000 ký tự."),
];

export const customerConversationIdValidator = [
  param("id")
    .isMongoId()
    .withMessage("ID cuộc hội thoại không đúng định dạng MongoDB."),
];

export const sendCustomerMessageValidator = [
  ...customerConversationIdValidator,

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Nội dung tin nhắn không được để trống.")
    .bail()
    .isLength({ max: 5000 })
    .withMessage("Nội dung tin nhắn không được vượt quá 5000 ký tự."),

  body("messageType")
    .optional()
    .isIn(["text", "image", "file"])
    .withMessage("Loại tin nhắn của khách hàng phải là text, image hoặc file."),

  body("attachments")
    .optional({ nullable: true })
    .isArray()
    .withMessage("attachments phải là mảng URL."),
];

export const getCustomerConversationsValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page phải là số nguyên >= 1."),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit phải từ 1 đến 50."),
];

export const validateCustomerConversationRequest = (
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
