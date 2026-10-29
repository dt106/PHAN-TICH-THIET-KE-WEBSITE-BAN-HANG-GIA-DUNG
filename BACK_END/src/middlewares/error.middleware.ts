
/**
 * =========================================================
 * FILE: BACK_END/src/middleware/error.middleware.ts
 * =========================================================
 *
 * Mục đích:
 * - Điểm xử lý lỗi DUY NHẤT của toàn bộ API.
 * - Service ném AppError(statusCode, message) → middleware trả đúng status.
 * - Map các lỗi Mongoose phổ biến (ValidationError, CastError, trùng unique)
 *   về 400 với thông báo thân thiện.
 * - Không gửi stack trace cho client.
 *
 * =========================================================
 */

import type {
  Request,
  Response,
  NextFunction,
} from "express";

interface AppErrorLike extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, unknown>;
}

const errorMiddleware = (
  err: AppErrorLike,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Nếu response đã được gửi, chuyển lỗi cho Express xử lý.
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode =
    typeof err.statusCode === "number" &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  let message = err.message || "Yêu cầu không hợp lệ.";

  // Mongoose: validate schema thất bại (thiếu trường, sai enum...).
  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  // Mongoose: ObjectId sai định dạng.
  if (err.name === "CastError") {
    statusCode = 400;
    message = "ID không đúng định dạng.";
  }

  // Mongo: trùng khóa unique (E11000).
  if (err.code === 11000) {
    statusCode = 400;
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : null;
    message = field
      ? `Giá trị của trường '${field}' đã tồn tại.`
      : "Dữ liệu đã tồn tại (trùng khóa duy nhất).";
  }

  // Chỉ ghi log chi tiết phía server đối với lỗi 500.
  if (statusCode >= 500) {
    console.error("Internal Server Error:", err);
  }

  const responseMessage =
    statusCode === 500
      ? "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau."
      : message;

  res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
};

export default errorMiddleware;
