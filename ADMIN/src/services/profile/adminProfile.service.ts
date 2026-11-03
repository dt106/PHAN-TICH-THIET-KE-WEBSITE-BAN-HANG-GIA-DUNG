import { httpClient } from '../api/httpClient';

// =========================================================
// TYPES
// =========================================================

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: 'admin';
  status: 'active' | 'inactive' | 'blocked';
  emailVerifiedAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface AdminProfileData {
  user: AdminProfile;
}

export interface UpdateAdminProfilePayload {
  name: string;
  phone: string;
  avatarFile: File | null;
}

// =========================================================
// ENDPOINTS
// =========================================================

const ADMIN_PROFILE_ENDPOINTS = {
  me: '/admin/me',
  profile: '/admin/profile',
} as const;

// =========================================================
// GET ADMIN PROFILE
// GET /api/admin/me
// =========================================================

export async function getAdminProfile(): Promise<AdminProfile> {
  const response = await httpClient.get<
    ApiResponse<AdminProfileData>
  >(ADMIN_PROFILE_ENDPOINTS.me);

  return response.data.user;
}

// =========================================================
// UPDATE ADMIN PROFILE
// PATCH /api/admin/profile
//
// Có avatarFile:
// - Gửi multipart/form-data.
// - Backend upload ảnh lên Cloudinary.
// - Backend lưu URL avatar vào MongoDB.
//
// Không có avatarFile:
// - Gửi JSON.
// - Chỉ cập nhật name/phone.
// =========================================================

export async function updateAdminProfile(
  payload: UpdateAdminProfilePayload,
): Promise<AdminProfile> {
  if (payload.avatarFile instanceof File) {
    const formData = new FormData();

    formData.append('name', payload.name);
    formData.append('phone', payload.phone);
    formData.append('avatar', payload.avatarFile);

    const response = await httpClient.patch<
      ApiResponse<AdminProfileData>
    >(ADMIN_PROFILE_ENDPOINTS.profile, formData);

    return response.data.user;
  }

  const jsonPayload = {
    name: payload.name,
    phone: payload.phone,
  };

  const response = await httpClient.patch<
    ApiResponse<AdminProfileData>
  >(ADMIN_PROFILE_ENDPOINTS.profile, jsonPayload);

  return response.data.user;
}