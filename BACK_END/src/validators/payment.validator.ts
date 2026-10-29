import { body, param, query } from "express-validator";

const PAYMENT_METHODS = ["COD", "BANK", "MOMO", "VNPAY", "ZALOPAY"];
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];

export const createPaymentValidator = [
  body("orderId")
    .notEmpty()
    .withMessage("orderId là bắt buộc")
    .isMongoId()
    .withMessage("orderId không đúng định dạng"),
];

export const mockCompleteValidator = [
  body("orderNumber")
    .notEmpty()
    .withMessage("orderNumber là bắt buộc")
    .isString()
    .trim()
    .isLength({ min: 6, max: 50 })
    .withMessage("orderNumber không hợp lệ"),
  body("success").optional().isBoolean().withMessage("success phải là boolean"),
];

export const adminPaymentsQueryValidator = [
  query("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Phương thức thanh toán không hợp lệ"),
  query("status")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Trạng thái thanh toán không hợp lệ"),
  query("orderId").optional().isMongoId().withMessage("orderId không đúng định dạng"),
  query("from")
    .optional()
    .isISO8601()
    .withMessage("from phải là ngày ISO8601 hợp lệ"),
  query("to").optional().isISO8601().withMessage("to phải là ngày ISO8601 hợp lệ"),
  query("page").optional().isInt({ min: 1 }).withMessage("page phải là số nguyên >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit từ 1 đến 100"),
];

export const refundValidator = [
  param("id").isMongoId().withMessage("ID thanh toán không hợp lệ"),
  body("amount")
    .optional()
    .isFloat({ min: 1 })
    .withMessage("Số tiền hoàn phải là số dương"),
  body("reason").optional().isString().trim().isLength({ max: 500 }),
];
