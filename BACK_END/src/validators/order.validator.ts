import { body, param, query } from "express-validator";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipping",
  "delivered",
  "completed",
  "cancelled",
  "returned",
];

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

const PAYMENT_METHODS = ["COD", "BANK", "MOMO", "VNPAY", "ZALOPAY"];

export const orderIdParamValidator = [
  param("id").isMongoId().withMessage("ID đơn hàng không hợp lệ"),
];

export const myOrdersQueryValidator = [
  query("status")
    .optional()
    .isIn(ORDER_STATUSES)
    .withMessage("Trạng thái đơn hàng không hợp lệ"),
  query("page").optional().isInt({ min: 1 }).withMessage("page phải là số nguyên >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit từ 1 đến 100"),
];

export const adminOrdersQueryValidator = [
  ...myOrdersQueryValidator,
  query("search")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Từ khóa tìm kiếm tối đa 100 ký tự"),
  query("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Trạng thái thanh toán không hợp lệ"),
  query("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Phương thức thanh toán không hợp lệ"),
  query("userId").optional().isMongoId().withMessage("userId không đúng định dạng"),
  query("from")
    .optional()
    .isISO8601()
    .withMessage("from phải là ngày ISO8601 hợp lệ"),
  query("to").optional().isISO8601().withMessage("to phải là ngày ISO8601 hợp lệ"),
];

export const updateOrderStatusValidator = [
  ...orderIdParamValidator,
  body("status")
    .notEmpty()
    .withMessage("Trạng thái đơn hàng là bắt buộc")
    .isIn(ORDER_STATUSES)
    .withMessage("Trạng thái đơn hàng không hợp lệ"),
];
