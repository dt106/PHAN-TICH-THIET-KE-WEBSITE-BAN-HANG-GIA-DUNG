import { request } from "./http.ts";
import type { User } from "../types/api.ts";

const requestRegisterOtp = (email: string) => {
  return request<null>("/api/customer/register/request-otp", {
    method: "POST",
    auth: false,
    body: { email },
  });
};

const verifyRegisterOtp = (email: string, otp: string) => {
  return request<null>("/api/customer/register/verify-otp", {
    method: "POST",
    auth: false,
    body: { email, otp },
  });
};

const registerCustomer = (body: {
  email: string;
  name: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}) => {
  return request<{ user: User; token: string }>("/api/customer/register", {
    method: "POST",
    auth: false,
    body,
  });
};

const loginCustomer = (body: { email: string; password: string }) => {
  return request<{ user: User; token: string }>("/api/customer/login", {
    method: "POST",
    auth: false,
    body,
  });
};

const forgotPassword = (email: string) => {
  return request<null>("/api/customer/forgot-password", {
    method: "POST",
    auth: false,
    body: { email },
  });
};

const resetPassword = (body: {
  email: string;
  otp: string;
  newPassword: string;
}) => {
  return request<null>("/api/customer/reset-password", {
    method: "POST",
    auth: false,
    body,
  });
};

const getCurrentCustomer = () => {
  return request<{ user: User }>("/api/customer/me");
};

const changePassword = (body: {
  currentPassword: string;
  newPassword: string;
}) => {
  return request<null>("/api/customer/change-password", {
    method: "POST",
    body,
  });
};

const updateProfile = (form: FormData) => {
  return request<{ user: User }>("/api/customer/profile", {
    method: "PATCH",
    form,
  });
};

const logoutCustomer = () => {
  return request<null>("/api/customer/logout", { method: "POST" });
};

export const authService = {
  requestRegisterOtp,
  verifyRegisterOtp,
  registerCustomer,
  loginCustomer,
  forgotPassword,
  resetPassword,
  getCurrentCustomer,
  changePassword,
  updateProfile,
  logoutCustomer,
};
