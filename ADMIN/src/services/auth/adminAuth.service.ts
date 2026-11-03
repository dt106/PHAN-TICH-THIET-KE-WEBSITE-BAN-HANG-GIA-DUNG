/**
 * =========================================================
 * FILE: src/services/auth/adminAuth.service.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Đăng nhập Admin.
 * - Quên mật khẩu.
 * - Đặt lại mật khẩu.
 * - Đổi mật khẩu.
 * - Yêu cầu OTP đổi email.
 * - Xác minh OTP đổi email.
 * - Đăng xuất Admin.
 *
 * Hồ sơ Admin và avatar được xử lý tại:
 * src/services/profile/adminProfile.service.ts
 * =========================================================
 */

import { httpClient, authToken } from '../api/httpClient';

// =========================================================
// TYPES
// =========================================================

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminForgotPasswordPayload {
  email: string;
}

export interface AdminResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword?: string;
}

/**
 * Payload backend nhận khi Admin đổi mật khẩu.
 * confirmPassword chỉ dùng validate ở frontend,
 * không gửi lên API này.
 */
export interface AdminChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;

}

export interface AdminRequestChangeEmailPayload {
  newEmail: string;
}

export interface AdminVerifyChangeEmailPayload {
  newEmail: string;
  otp: string;
}

// =========================================================
// ENDPOINTS
// Đồng bộ với BACK_END/src/routes/admin.routes.ts
// =========================================================

const ADMIN_AUTH_ENDPOINTS = {
  login: '/admin/login',
  forgotPassword: '/admin/forgot-password',
  resetPassword: '/admin/reset-password',

  // POST /api/admin/auth/change-password
  changePassword: '/admin/change-password',

  requestChangeEmailOtp: '/admin/change-email/request-otp',
  verifyChangeEmailOtp: '/admin/change-email/verify',
  logout: '/admin/logout',
} as const;

// =========================================================
// ADMIN AUTH SERVICE
// =========================================================

export const adminAuthService = {
  /**
   * Đăng nhập Admin.
   * POST /api/admin/login
   */
  login(payload: AdminLoginPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.login,
      payload,
    );
  },

  /**
   * Yêu cầu OTP đặt lại mật khẩu.
   * POST /api/admin/forgot-password
   */
  forgotPassword(payload: AdminForgotPasswordPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.forgotPassword,
      payload,
    );
  },

  /**
   * Đặt lại mật khẩu bằng OTP.
   * POST /api/admin/reset-password
   */
  resetPassword(payload: AdminResetPasswordPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.resetPassword,
      payload,
    );
  },

  /**
   * Đổi mật khẩu Admin đã đăng nhập.
   * POST /api/admin/auth/change-password
   *
   * Backend nhận:
   * - currentPassword
   * - newPassword
   */

  changePassword(payload: AdminChangePasswordPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.changePassword,
      payload,
    );
  },

  /**
   * Yêu cầu OTP để đổi email.
   * POST /api/admin/change-email/request-otp
   */
  requestChangeEmailOtp(
    payload: AdminRequestChangeEmailPayload,
  ) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.requestChangeEmailOtp,
      payload,
    );
  },

  /**
   * Xác minh OTP đổi email.
   * POST /api/admin/change-email/verify
   */
  verifyChangeEmailOtp(
    payload: AdminVerifyChangeEmailPayload,
  ) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.verifyChangeEmailOtp,
      payload,
    );
  },

  /**
   * Đăng xuất Admin.
   * POST /api/admin/logout
   *
   * Luôn xóa token cục bộ kể cả khi API logout lỗi.
   */
  async logout(): Promise<unknown> {
    try {
      return await httpClient.post<unknown>(
        ADMIN_AUTH_ENDPOINTS.logout,
      );
    } finally {
      authToken.clear();
    }
  },
};