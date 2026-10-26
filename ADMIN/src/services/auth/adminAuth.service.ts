/**
 * =========================================================
 * FILE: ADMIN/src/services/auth/adminAuth.service.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Gọi API xác thực và quản lý tài khoản Admin.
 * - Không xử lý logic giao diện tại service.
 * - Không tự xử lý request/response của Express.
 * - Dùng chung httpClient và authToken.
 *
 * API PREFIX:
 * /api/admin
 * =========================================================
 */

import { httpClient, authToken } from '../api/httpClient';

/**
 * =========================================================
 * TYPES
 * =========================================================
 */

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

export interface AdminChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface AdminUpdateProfilePayload {
  name?: string;
  phone?: string;
  avatar?: string | File;
}

export interface AdminRequestChangeEmailPayload {
  newEmail: string;
}

export interface AdminVerifyChangeEmailPayload {
  newEmail: string;
  otp: string;
}

/**
 * =========================================================
 * API ENDPOINTS
 * Đồng bộ với BACK_END/src/routes/admin.routes.ts
 * =========================================================
 */

const ADMIN_AUTH_ENDPOINTS = {
  login: '/admin/login',
  forgotPassword: '/admin/forgot-password',
  resetPassword: '/admin/reset-password',
  changePassword: '/admin/change-password',
  me: '/admin/me',
  profile: '/admin/profile',
  requestChangeEmailOtp: '/admin/change-email/request-otp',
  verifyChangeEmailOtp: '/admin/change-email/verify',
  logout: '/admin/logout',
} as const;

/**
 * =========================================================
 * ADMIN AUTH SERVICE
 * =========================================================
 */

export const adminAuthService = {
  /**
   * Đăng nhập Admin.
   *
   * POST /api/admin/login
   *
   * Việc lưu token và lựa chọn ghi nhớ đăng nhập
   * được xử lý ở LoginPage.
   */
  login(payload: AdminLoginPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.login,
      payload,
    );
  },

  /**
   * Yêu cầu OTP đặt lại mật khẩu.
   *
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
   *
   * POST /api/admin/reset-password
   */
  resetPassword(payload: AdminResetPasswordPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.resetPassword,
      payload,
    );
  },

  /**
   * Đổi mật khẩu khi Admin đã đăng nhập.
   *
   * POST /api/admin/change-password
   * Yêu cầu JWT.
   */
  changePassword(payload: AdminChangePasswordPayload) {
    return httpClient.post<unknown>(
      ADMIN_AUTH_ENDPOINTS.changePassword,
      payload,
    );
  },

  /**
   * Lấy thông tin Admin hiện tại.
   *
   * GET /api/admin/me
   * Yêu cầu JWT.
   */
  getMe() {
    return httpClient.get<unknown>(
      ADMIN_AUTH_ENDPOINTS.me,
    );
  },

  /**
   * Cập nhật hồ sơ Admin.
   *
   * PATCH /api/admin/profile
   * Yêu cầu JWT.
   *
   * Nếu avatar là File thì gửi multipart/form-data.
   * Nếu không có File thì gửi JSON.
   */
  updateProfile(payload: AdminUpdateProfilePayload) {
    const formData = new FormData();

    if (payload.name !== undefined) {
      formData.append('name', payload.name);
    }

    if (payload.phone !== undefined) {
      formData.append('phone', payload.phone);
    }

    if (payload.avatar instanceof File) {
      formData.append('avatar', payload.avatar);

      return httpClient.patch<unknown>(
        ADMIN_AUTH_ENDPOINTS.profile,
        formData,
      );
    }

    // Không gửi chuỗi avatar như thể đó là file upload.
    const jsonPayload: {
      name?: string;
      phone?: string;
      avatar?: string;
    } = {};

    if (payload.name !== undefined) {
      jsonPayload.name = payload.name;
    }

    if (payload.phone !== undefined) {
      jsonPayload.phone = payload.phone;
    }

    if (typeof payload.avatar === 'string') {
      jsonPayload.avatar = payload.avatar;
    }

    return httpClient.patch<unknown>(
      ADMIN_AUTH_ENDPOINTS.profile,
      jsonPayload,
    );
  },

  /**
   * Yêu cầu OTP để đổi email Admin.
   *
   * POST /api/admin/change-email/request-otp
   * Yêu cầu JWT.
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
   * Xác nhận đổi email bằng OTP.
   *
   * POST /api/admin/change-email/verify
   * Yêu cầu JWT.
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
   *
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
