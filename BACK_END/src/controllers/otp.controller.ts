/**
 * =========================================================
 * FILE: BACK_END/src/controllers/otp.controller.ts
 * =========================================================
 *
 * MỤC ĐÍCH:
 * - Controller quản lý các API liên quan đến OTP.
 * - Nhận request từ client.
 * - Kiểm tra dữ liệu đầu vào cơ bản.
 * - Gọi OTP Service để xử lý nghiệp vụ.
 * - Trả response về cho client.
 *
 * LƯU Ý:
 * - Không xử lý việc tạo OTP trực tiếp tại Controller.
 * - Không lưu OTP tại Controller.
 * - Không quản lý otpStore tại Controller.
 * - Toàn bộ logic OTP nằm trong:
 *
 *      services/otp.service.ts
 *
 * Các loại OTP:
 *
 * 1. register
 *    → Xác thực email đăng ký.
 *
 * 2. reset_password
 *    → Xác thực OTP reset mật khẩu.
 *
 * 3. change_email
 *    → Xác thực OTP khi admin đổi email.
 *
 * =========================================================
 */

import { Request, Response } from "express";

import { OTPType, sendOtp, verifyOtpService } from "../services/otp.service";

/**
 * =========================================================
 * HELPER: GET ERROR MESSAGE
 * =========================================================
 *
 * Lấy message an toàn từ unknown error.
 *
 * =========================================================
 */

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định.";
};

/**
 * =========================================================
 * HELPER: KIỂM TRA OTP TYPE
 * =========================================================
 *
 * Chỉ cho phép các loại OTP hợp lệ.
 *
 * =========================================================
 */

const isValidOtpType = (type: unknown): type is OTPType => {
  return (
    type === "register" || type === "reset_password" || type === "change_email"
  );
};

/**
 * =========================================================
 * CONTROLLER: REQUEST / SEND OTP
 * =========================================================
 *
 * API:
 * POST /api/auth/send-otp
 *
 * Body:
 * {
 *   "email": "example@gmail.com",
 *   "type": "register"
 * }
 *
 * hoặc:
 *
 * {
 *   "email": "example@gmail.com",
 *   "type": "reset_password"
 * }
 *
 * MỤC ĐÍCH:
 * - Gửi OTP cho các chức năng Authentication thông thường.
 *
 * LƯU Ý:
 * - Không nên dùng API này để gửi OTP change_email.
 * - change_email phải sử dụng API riêng dành cho admin.
 *
 * =========================================================
 */

export const requestOtp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { email, type } = req.body;
    console.log(email, type);
    /**
     * -------------------------------------------------------
     * KIỂM TRA EMAIL
     * -------------------------------------------------------
     */

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email là bắt buộc.",
      });
    }

    /**
     * -------------------------------------------------------
     * KIỂM TRA TYPE
     * -------------------------------------------------------
     */

    if (type !== "register" && type !== "reset_password") {
      return res.status(400).json({
        success: false,
        message: "Loại OTP không hợp lệ.",
      });
    }

    /**
     * -------------------------------------------------------
     * GỌI OTP SERVICE
     * -------------------------------------------------------
     */

    const result = await sendOtp(email, type);

    /**
     * -------------------------------------------------------
     * KIỂM TRA COOLDOWN
     * -------------------------------------------------------
     */

    if (!result.success) {
      return res.status(429).json({
        success: false,
        message: result.message,
        retryAfter: result.retryAfter,
      });
    }

    /**
     * -------------------------------------------------------
     * THÀNH CÔNG
     * -------------------------------------------------------
     */

    return res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email của bạn.",
    });
  } catch (error) {
    console.error("Lỗi khi gửi OTP:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể gửi email OTP. Vui lòng thử lại sau.",
    });
  }
};

/**
 * =========================================================
 * CONTROLLER: RESEND OTP
 * =========================================================
 *
 * API:
 * POST /api/auth/resend-otp
 *
 * Body:
 * {
 *   "email": "example@gmail.com",
 *   "type": "register"
 * }
 *
 * =========================================================
 */

export const resendOtp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  /**
   * Sử dụng chung logic với requestOtp.
   *
   * OTP Service đã xử lý cooldown
   * nên không cần viết lại logic tại đây.
   */

  return requestOtp(req, res);
};

/**
 * =========================================================
 * CONTROLLER: VERIFY REGISTER OTP
 * =========================================================
 *
 * API:
 * POST /api/auth/register/verify-otp
 *
 * Body:
 * {
 *   "email": "example@gmail.com",
 *   "otp": "123456"
 * }
 *
 * =========================================================
 */

export const verifyRegisterOtp = (req: Request, res: Response): Response => {
  const { email, otp } = req.body;

  /**
   * -------------------------------------------------------
   * KIỂM TRA INPUT
   * -------------------------------------------------------
   */

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof otp !== "string" ||
    !otp.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Email và mã OTP là bắt buộc.",
    });
  }

  /**
   * -------------------------------------------------------
   * VERIFY OTP
   * -------------------------------------------------------
   */

  const result = verifyOtpService(email, otp, "register");

  /**
   * -------------------------------------------------------
   * OTP KHÔNG HỢP LỆ
   * -------------------------------------------------------
   */

  if (!result) {
    return res.status(400).json({
      success: false,
      message: "OTP không hợp lệ hoặc đã hết hạn.",
    });
  }

  /**
   * -------------------------------------------------------
   * OTP HỢP LỆ
   * -------------------------------------------------------
   */

  return res.status(200).json({
    success: true,
    message: "Xác thực OTP thành công. Bạn có thể tiếp tục đăng ký tài khoản.",
  });
};

/**
 * =========================================================
 * CONTROLLER: VERIFY RESET PASSWORD OTP
 * =========================================================
 *
 * API:
 * POST /api/auth/reset-password/verify-otp
 *
 * Body:
 * {
 *   "email": "example@gmail.com",
 *   "otp": "123456"
 * }
 *
 * =========================================================
 */

export const verifyResetPasswordOtp = (
  req: Request,
  res: Response,
): Response => {
  const { email, otp } = req.body;

  /**
   * -------------------------------------------------------
   * KIỂM TRA INPUT
   * -------------------------------------------------------
   */

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof otp !== "string" ||
    !otp.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Email và mã OTP là bắt buộc.",
    });
  }

  /**
   * -------------------------------------------------------
   * VERIFY OTP
   * -------------------------------------------------------
   */

  const result = verifyOtpService(email, otp, "reset_password");

  /**
   * -------------------------------------------------------
   * OTP KHÔNG HỢP LỆ
   * -------------------------------------------------------
   */

  if (!result) {
    return res.status(400).json({
      success: false,
      message: "OTP không hợp lệ hoặc đã hết hạn.",
    });
  }

  /**
   * -------------------------------------------------------
   * OTP HỢP LỆ
   * -------------------------------------------------------
   */

  return res.status(200).json({
    success: true,
    message: "OTP reset mật khẩu hợp lệ.",
  });
};

/**
 * =========================================================
 * CONTROLLER: REQUEST CHANGE EMAIL OTP
 * =========================================================
 *
 * API:
 * POST /api/admin/auth/change-email/request-otp
 *
 * Body:
 * {
 *   "newEmail": "newemail@gmail.com"
 * }
 *
 * Authentication:
 * - Bắt buộc đăng nhập.
 * - Bắt buộc role = admin.
 *
 * MỤC ĐÍCH:
 * - Admin yêu cầu OTP để đổi email.
 * - OTP được gửi đến email mới.
 * - OTP được gắn với userId của admin hiện tại.
 *
 * LUỒNG:
 *
 * Admin
 *   ↓
 * JWT
 *   ↓
 * authMiddleware
 *   ↓
 * req.user.userId
 * req.user.role
 *   ↓
 * requestChangeEmailOtp
 *   ↓
 * sendOtp()
 *   ↓
 * OTP type = change_email
 *
 * =========================================================
 */

export const requestChangeEmailOtp = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    /**
     * -------------------------------------------------------
     * KIỂM TRA ĐĂNG NHẬP
     * -------------------------------------------------------
     */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    /**
     * -------------------------------------------------------
     * KIỂM TRA QUYỀN ADMIN
     * -------------------------------------------------------
     */

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện chức năng này.",
      });
    }

    /**
     * -------------------------------------------------------
     * LẤY EMAIL MỚI
     * -------------------------------------------------------
     */

    const { newEmail } = req.body;

    if (typeof newEmail !== "string" || !newEmail.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email mới là bắt buộc.",
      });
    }

    /**
     * -------------------------------------------------------
     * CHUẨN HÓA EMAIL
     * -------------------------------------------------------
     */

    const normalizedEmail = newEmail.trim().toLowerCase();

    /**
     * -------------------------------------------------------
     * KIỂM TRA FORMAT EMAIL
     * -------------------------------------------------------
     */

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng.",
      });
    }

    /**
     * -------------------------------------------------------
     * GỬI OTP
     * -------------------------------------------------------
     *
     * OTP được gắn với:
     *
     * email mới
     * +
     * type = change_email
     * +
     * userId = admin hiện tại
     *
     * -------------------------------------------------------
     */

    const result = await sendOtp(
      normalizedEmail,
      "change_email",
      req.user.userId,
    );

    /**
     * -------------------------------------------------------
     * KIỂM TRA COOLDOWN
     * -------------------------------------------------------
     */

    if (!result.success) {
      return res.status(429).json({
        success: false,
        message: result.message,
        retryAfter: result.retryAfter,
      });
    }

    /**
     * -------------------------------------------------------
     * THÀNH CÔNG
     * -------------------------------------------------------
     */

    return res.status(200).json({
      success: true,
      message: "Mã OTP đã được gửi đến email mới.",
    });
  } catch (error) {
    console.error("Lỗi khi gửi OTP đổi email:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể gửi OTP. Vui lòng thử lại sau.",
    });
  }
};

/**
 * =========================================================
 * EXPORT DEFAULT
 * =========================================================
 */

export default {
  requestOtp,
  resendOtp,
  verifyRegisterOtp,
  verifyResetPasswordOtp,
  requestChangeEmailOtp,
};
