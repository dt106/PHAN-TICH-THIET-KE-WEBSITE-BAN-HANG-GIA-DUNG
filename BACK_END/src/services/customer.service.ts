
/**
 * FILE: BACK_END/src/services/customer.service.ts
 *
 * NHIỆM VỤ:
 * - Xử lý nghiệp vụ tài khoản Customer.
 * - Đăng ký tài khoản bằng OTP.
 * - Đăng nhập, quên mật khẩu, đặt lại mật khẩu.
 * - Đổi mật khẩu khi đã đăng nhập.
 * - Lấy thông tin Customer hiện tại.
 * - Cập nhật hồ sơ Customer.
 *
 * LƯU Ý:
 * - Không đọc req/res trong Service.
 * - Không sử dụng express-validator tại Service.
 * - Không trả password hoặc password hash.
 * - Giữ nguyên OTP Service hiện có.
 */

import bcrypt from "bcrypt";

import User, {
  IUser,
  UserStatus,
} from "../models/User.model";

import {
  isRegisterEmailVerified,
  invalidateOtpService,
  sendOtp,
  verifyOtpService,
} from "./otp.service";

import { generateToken } from "../utils/jwt";

/** Số vòng hash password. */
const BCRYPT_SALT_ROUNDS = 12;

/** Dữ liệu trả về sau khi đăng ký hoặc đăng nhập. */
interface CustomerAuthResult {
  user: CustomerPublicInfo;
  token: string;
}

/** Thông tin Customer được phép trả về Frontend. */
interface CustomerPublicInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: "customer";
  status: UserStatus;
  emailVerifiedAt: Date | null;
}

/** Chuẩn hóa email trước khi truy vấn Database. */
const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

/** Chuyển User thành dữ liệu công khai, không trả password. */
const formatCustomer = (user: IUser): CustomerPublicInfo => {
  if (user.role !== "customer") {
    throw new Error("Tài khoản không phải Customer.");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    avatar: user.avatar ?? null,
    role: "customer",
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt ?? null,
  };
};

/** Kiểm tra Customer có được phép sử dụng tài khoản không. */
const checkCustomerStatus = (user: IUser): void => {
  if (user.role !== "customer") {
    throw new Error("Tài khoản không phải Customer.");
  }

  if (user.status === "blocked") {
    throw new Error("Tài khoản đã bị khóa.");
  }

  if (user.status === "inactive") {
    throw new Error("Tài khoản đang không hoạt động.");
  }
};

/** Tạo JWT cho Customer. */
const generateCustomerToken = (user: IUser): string =>
  generateToken({
    userId: user._id.toString(),
    role: user.role,
  });

/**
 * 1. GỬI OTP ĐĂNG KÝ
 *
 * Kiểm tra email chưa được sử dụng.
 * Chưa tạo User ở bước này.
 */
export const customerRequestRegisterOtp = async (
  email: string
): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("Email đã được sử dụng.");
  }

  await sendOtp(normalizedEmail, "register");
};

/**
 * 2. XÁC THỰC OTP ĐĂNG KÝ
 *
 * Hàm verifyOtpService giữ nguyên cách sử dụng
 * đồng bộ như trong auth.service.ts gốc.
 */
export const customerVerifyRegisterOtp = (
  email: string,
  otp: string
): void => {
  const normalizedEmail = normalizeEmail(email);

  const isValid = verifyOtpService(
    normalizedEmail,
    otp,
    "register"
  );

  if (!isValid) {
    throw new Error("OTP không hợp lệ hoặc đã hết hạn.");
  }
};

/**
 * 3. ĐĂNG KÝ CUSTOMER
 *
 * Chỉ tạo tài khoản khi email đã xác thực OTP.
 */
export const customerRegister = async (data: {
  email: string;
  name: string;
  phone?: string;
  password: string;
}): Promise<CustomerAuthResult> => {
  const normalizedEmail = normalizeEmail(data.email);

  // Kiểm tra email đã xác thực OTP đăng ký.
  const emailVerified = isRegisterEmailVerified(normalizedEmail);

  if (!emailVerified) {
    throw new Error("Email chưa được xác thực OTP.");
  }

  // Kiểm tra email có bị sử dụng trong lúc đăng ký hay không.
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    throw new Error("Email đã được sử dụng.");
  }

  // Hash mật khẩu trước khi lưu.
  const hashedPassword = await bcrypt.hash(
    data.password,
    BCRYPT_SALT_ROUNDS
  );

  // Tạo tài khoản Customer.
  const user = await User.create({
    name: data.name.trim(),
    email: normalizedEmail,
    phone: data.phone?.trim() || null,
    password: hashedPassword,
    role: "customer",
    status: "active",
    emailVerifiedAt: new Date(),
  });

  // OTP đăng ký đã sử dụng.
  invalidateOtpService(normalizedEmail, "register");

  return {
    user: formatCustomer(user),
    token: generateCustomerToken(user),
  };
};

/**
 * 4. ĐĂNG NHẬP CUSTOMER
 *
 * Endpoint Customer không cho Admin đăng nhập.
 */
export const customerLogin = async (
  email: string,
  password: string
): Promise<CustomerAuthResult> => {
  const normalizedEmail = normalizeEmail(email);

  // Password có select:false trong User model.
  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user || user.role !== "customer") {
    throw new Error("Email hoặc mật khẩu không chính xác.");
  }

  checkCustomerStatus(user);

  const passwordCorrect = await bcrypt.compare(
    password,
    user.password
  );

  if (!passwordCorrect) {
    throw new Error("Email hoặc mật khẩu không chính xác.");
  }

  return {
    user: formatCustomer(user),
    token: generateCustomerToken(user),
  };
};

/**
 * 5. QUÊN MẬT KHẨU CUSTOMER
 *
 * Gửi OTP theo email đã đăng ký.
 */
export const customerForgotPassword = async (
  email: string
): Promise<void> => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({
    email: normalizedEmail,
  });

  // Không báo email không tồn tại, để khớp lời hứa trên trang quên mật khẩu.
  if (!user || user.role !== "customer") {
    return;
  }

  checkCustomerStatus(user);

  await sendOtp(normalizedEmail, "reset_password");
};

/**
 * 6. ĐẶT LẠI MẬT KHẨU CUSTOMER
 *
 * Kiểm tra OTP, trạng thái tài khoản và đảm bảo
 * mật khẩu mới không trùng mật khẩu cũ.
 */
export const customerResetPassword = async (data: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<void> => {
  const normalizedEmail = normalizeEmail(data.email);

  const otpValid = verifyOtpService(
    normalizedEmail,
    data.otp,
    "reset_password"
  );

  if (!otpValid) {
    throw new Error("OTP không hợp lệ hoặc đã hết hạn.");
  }

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user || user.role !== "customer") {
    invalidateOtpService(normalizedEmail, "reset_password");
    throw new Error("Không tìm thấy tài khoản Customer.");
  }

  try {
    checkCustomerStatus(user);
  } catch (error) {
    invalidateOtpService(normalizedEmail, "reset_password");
    throw error;
  }

  const samePassword = await bcrypt.compare(
    data.newPassword,
    user.password
  );

  if (samePassword) {
    throw new Error(
      "Mật khẩu mới không được trùng với mật khẩu cũ."
    );
  }

  user.password = await bcrypt.hash(
    data.newPassword,
    BCRYPT_SALT_ROUNDS
  );

  await user.save();

  invalidateOtpService(normalizedEmail, "reset_password");
};

/**
 * 7. LẤY THÔNG TIN CUSTOMER HIỆN TẠI
 *
 * userId lấy từ JWT thông qua Auth Middleware.
 */
export const customerGetCurrentUser = async (
  userId: string
): Promise<CustomerPublicInfo> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  checkCustomerStatus(user);

  return formatCustomer(user);
};

/**
 * 8. ĐỔI MẬT KHẨU CUSTOMER
 *
 * Customer phải nhập đúng mật khẩu hiện tại.
 */
export const customerChangePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const user = await User.findById(userId).select("+password");

  if (!user || user.role !== "customer") {
    throw new Error("Không tìm thấy tài khoản Customer.");
  }

  if (user.status !== "active") {
    throw new Error("Tài khoản không ở trạng thái hoạt động.");
  }

  const currentPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password
  );

  if (!currentPasswordCorrect) {
    throw new Error("Mật khẩu hiện tại không chính xác.");
  }

  const samePassword = await bcrypt.compare(
    newPassword,
    user.password
  );

  if (samePassword) {
    throw new Error(
      "Mật khẩu mới không được trùng với mật khẩu cũ."
    );
  }

  user.password = await bcrypt.hash(
    newPassword,
    BCRYPT_SALT_ROUNDS
  );

  await user.save();
};

/**
 * 9. CẬP NHẬT HỒ SƠ CUSTOMER
 *
 * Chỉ cho phép cập nhật:
 * - name
 * - phone
 * - avatar
 *
 * Avatar phải được xử lý bởi upload middleware ở Route.
 * Controller truyền đường dẫn/URL avatar vào Service.
 *
 * Không cho phép cập nhật email, password, role, status
 * qua chức năng cập nhật hồ sơ.
 */
export const customerUpdateProfile = async (
  userId: string,
  data: {
    name?: string;
    phone?: string | null;
    avatar?: string | null;
  }
): Promise<CustomerPublicInfo> => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Không tìm thấy người dùng.");
  }

  checkCustomerStatus(user);

  if (data.name !== undefined) {
    user.name = data.name.trim();
  }

  if (data.phone !== undefined) {
    user.phone = data.phone?.trim() || null;
  }

  if (data.avatar !== undefined) {
    user.avatar = data.avatar;
  }

  await user.save();

  return formatCustomer(user);
};
