/**
 * =========================================================
 * FILE: BACK_END/src/utils/jwt.ts
 * =========================================================
 * Mục đích:
 * - Tạo JWT
 * - Xác thực JWT
 * - Đọc thông tin user từ JWT
 * =========================================================
 */

import jwt, { SignOptions } from "jsonwebtoken";

/**
 * Payload được lưu bên trong JWT
 */
export interface JwtPayload {
  userId: string;
  role: "customer" | "admin";
  email?: string;
  name?: string;
}

/**
 * Lấy JWT Secret từ biến môi trường
 */
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET chưa được cấu hình trong file .env");
  }

  return secret;
};

/**
 * Tạo JWT
 */
export const generateToken = (
  payload: JwtPayload
): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  });
};

/**
 * Verify JWT
 */
export const verifyToken = (
  token: string
): JwtPayload => {
  return jwt.verify(
    token,
    getJwtSecret()
  ) as JwtPayload;
};

export default {
  generateToken,
  verifyToken,
};