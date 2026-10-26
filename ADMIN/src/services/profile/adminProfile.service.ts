
import { httpClient } from "../api/httpClient";

// =========================================================
// KIỂU DỮ LIỆU HỒ SƠ ADMIN
// =========================================================

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: "admin";
  status: "active" | "inactive" | "blocked";
  emailVerifiedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// =========================================================
// LẤY HỒ SƠ ADMIN
// GET /api/admin/me
// =========================================================

export async function getAdminProfile(): Promise<AdminProfile> {
  const response = await httpClient.get<ApiResponse<AdminProfile>>(
    "/admin/me",
  );

  return response.data;
}

// =========================================================
// CẬP NHẬT HỒ SƠ ADMIN
// PATCH /api/admin/profile
// =========================================================

export async function updateAdminProfile(data: {
  name: string;
  phone: string;
  avatarFile: File | null;
}): Promise<AdminProfile> {
  const formData = new FormData();

  formData.append("name", data.name);
  formData.append("phone", data.phone);

  if (data.avatarFile) {
    formData.append("avatar", data.avatarFile);
  }

  const response = await httpClient.patch<ApiResponse<AdminProfile>>(
    "/admin/profile",
    formData,
  );

  return response.data;
}

// =========================================================
// ĐỔI MẬT KHẨU ADMIN
// POST /api/admin/change-password
// =========================================================

export async function changeAdminPassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await httpClient.post("/admin/change-password", data);
}

// =========================================================
// YÊU CẦU OTP ĐỔI EMAIL
// POST /api/admin/change-email/request-otp
// =========================================================

export async function requestAdminEmailOtp(
  newEmail: string,
): Promise<void> {
  await httpClient.post("/admin/change-email/request-otp", {
    newEmail,
  });
}

// =========================================================
// XÁC MINH OTP ĐỔI EMAIL
// POST /api/admin/change-email/verify
// =========================================================

export async function verifyAdminEmailOtp(data: {
  newEmail: string;
  otp: string;
}): Promise<AdminProfile> {
  const response = await httpClient.post<ApiResponse<AdminProfile>>(
    "/admin/change-email/verify",
    data,
  );

return response.data;}
