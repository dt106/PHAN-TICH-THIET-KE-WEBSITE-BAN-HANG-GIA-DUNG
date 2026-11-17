/**
 * =========================================================
 * FILE: BACK_END/src/validators/customer.validator.ts
 * =========================================================
 *
 * MỤC ĐÍCH:
 * - Kiểm tra dữ liệu đầu vào cho các chức năng Customer.
 * - Không truy vấn database, không xác minh OTP thực tế.
 * - Không xử lý bcrypt hoặc JWT.
 *
 * LUỒNG:
 * Request -> Upload middleware (nếu có) -> Validator
 *         -> validationResult middleware -> Controller -> Service
 *
 * LƯU Ý:
 * - Không nhận role/status do client gửi khi đăng ký.
 * - API hồ sơ và đổi mật khẩu phải yêu cầu đăng nhập.
 * - Service kiểm tra OTP, trạng thái tài khoản và quyền sở hữu.
 * =========================================================
 */

import { body } from "express-validator";

/* =========================================================
 * 1. CÁC QUY TẮC VALIDATION
 * ========================================================= */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)[3-9][0-9]{8}$/;

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const OTP_REGEX = /^\d{6}$/;

/**
 * Kiểm tra email và chuẩn hóa email.
 * Không kiểm tra email đã tồn tại trong database hay chưa.
 */
const emailValidator = (field = "email") =>
  body(field)
    .isString()
    .withMessage("Email phải là chuỗi ký tự.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email là bắt buộc.")
    .bail()
    .isEmail()
    .withMessage("Email không đúng định dạng.")
    .bail()
    .matches(EMAIL_REGEX)
    .withMessage("Email không hợp lệ.")
    .normalizeEmail();

/**
 * Kiểm tra định dạng OTP gồm đúng 6 chữ số.
 * Không xác minh OTP có đúng, hết hạn hay đã sử dụng.
 */
const otpValidator = (field = "otp") =>
  body(field)
    .isString()
    .withMessage("OTP phải là chuỗi ký tự.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("OTP là bắt buộc.")
    .bail()
    .matches(OTP_REGEX)
    .withMessage("OTP phải gồm đúng 6 chữ số.");

/**
 * Mật khẩu phải:
 * - Có ít nhất 8 ký tự.
 * - Có chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
 */
const passwordValidator = (field = "password") =>
  body(field)
    .isString()
    .withMessage("Mật khẩu phải là chuỗi ký tự.")
    .bail()
    .notEmpty()
    .withMessage("Mật khẩu là bắt buộc.")
    .bail()
    .matches(PASSWORD_REGEX)
    .withMessage(
      "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt."
    );

/** Kiểm tra họ tên từ 2 đến 150 ký tự. */
const nameValidator = (field = "name") =>
  body(field)
    .isString()
    .withMessage("Họ tên phải là chuỗi ký tự.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Họ tên là bắt buộc.")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Họ tên phải từ 2 đến 150 ký tự.");

/** Số điện thoại không bắt buộc; nếu có thì phải hợp lệ. */
const phoneValidator = (field = "phone") =>
  body(field)
    .optional({ values: "null" })
    .isString()
    .withMessage("Số điện thoại phải là chuỗi ký tự.")
    .bail()
    .trim()
    .matches(PHONE_REGEX)
    .withMessage("Số điện thoại không đúng định dạng.");

/** Kiểm tra mật khẩu xác nhận trùng với mật khẩu tương ứng. */
const confirmPasswordValidator = (
  confirmField = "confirmPassword",
  passwordField = "password",
  label = "Xác nhận mật khẩu"
) =>
  body(confirmField)
    .isString()
    .withMessage(`${label} phải là chuỗi ký tự.`)
    .bail()
    .notEmpty()
    .withMessage(`${label} là bắt buộc.`)
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body[passwordField]) {
        throw new Error(`${label} không khớp.`);
      }

      return true;
    });

/** Cửa hàng chỉ gửi mật khẩu mới; nếu có confirmPassword thì phải khớp. */
const optionalConfirmPasswordValidator = (
  confirmField: string,
  passwordField: string,
  label: string,
) =>
  body(confirmField)
    .optional({ values: "null" })
    .isString()
    .withMessage(`${label} phải là chuỗi ký tự.`)
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body[passwordField]) {
        throw new Error(`${label} không khớp.`);
      }
      return true;
    });

/* =========================================================
 * 2. ĐĂNG KÝ CUSTOMER
 * ========================================================= */

/**
 * Bước 1: Customer nhập email để yêu cầu OTP đăng ký.
 * Chưa tạo tài khoản ở bước này.
 */
export const customerRequestRegisterOtpValidator = [
  emailValidator("email"),
];

/**
 * Bước 2: Customer gửi email và OTP để xác thực.
 * OTP Service chịu trách nhiệm xác minh OTP thực tế.
 */
export const customerVerifyRegisterOtpValidator = [
  emailValidator("email"),
  otpValidator("otp"),
];

/**
 * Bước 3: Hoàn tất đăng ký sau khi email được xác thực.
 *
 * Service bắt buộc kiểm tra trạng thái xác thực OTP trước khi tạo User.
 * Backend tự thiết lập role = "customer" và status mặc định.
 * Không lấy role/status từ request body.
 */
export const customerRegisterValidator = [
  emailValidator("email"),
  nameValidator("name"),
  phoneValidator("phone"),
  passwordValidator("password"),
  confirmPasswordValidator("confirmPassword", "password"),
];

/* =========================================================
 * 3. ĐĂNG NHẬP CUSTOMER
 * ========================================================= */

export const customerLoginValidator = [
  emailValidator("email"),

  body("password")
    .isString()
    .withMessage("Mật khẩu phải là chuỗi ký tự.")
    .bail()
    .notEmpty()
    .withMessage("Mật khẩu là bắt buộc."),
];

/* =========================================================
 * 4. QUÊN MẬT KHẨU VÀ ĐẶT LẠI MẬT KHẨU
 * ========================================================= */

/** Yêu cầu OTP quên mật khẩu bằng email. */
export const customerForgotPasswordValidator = [
  emailValidator("email"),
];

/**
 * Đặt lại mật khẩu bằng email + OTP + mật khẩu mới.
 *
 * Service phải:
 * - Xác minh OTP.
 * - Tìm đúng tài khoản Customer.
 * - Kiểm tra mật khẩu mới khác mật khẩu cũ.
 * - Hash mật khẩu trước khi lưu.
 */
export const customerResetPasswordValidator = [
  emailValidator("email"),
  otpValidator("otp"),
  passwordValidator("newPassword"),

  optionalConfirmPasswordValidator(
    "confirmPassword",
    "newPassword",
    "Xác nhận mật khẩu mới",
  ),
];

/* =========================================================
 * 5. ĐỔI MẬT KHẨU KHI CUSTOMER ĐÃ ĐĂNG NHẬP
 * ========================================================= */

export const customerChangePasswordValidator = [
  body("currentPassword")
    .isString()
    .withMessage("Mật khẩu hiện tại phải là chuỗi ký tự.")
    .bail()
    .notEmpty()
    .withMessage("Mật khẩu hiện tại là bắt buộc."),

  passwordValidator("newPassword"),

  optionalConfirmPasswordValidator(
    "confirmPassword",
    "newPassword",
    "Xác nhận mật khẩu mới",
  ),
];

/* =========================================================
 * 6. CẬP NHẬT HỒ SƠ CUSTOMER
 * =========================================================
 *
 * Cho phép cập nhật từng phần:
 * - name: họ tên.
 * - phone: số điện thoại.
 * - avatar: file ảnh qua upload middleware.
 *
 * Không cho cập nhật email, role, status, password hoặc userId
 * qua API cập nhật hồ sơ thông thường.
 *
 * Nếu upload ảnh:
 * - Đặt upload middleware trước validator.
 * - Kiểm tra MIME type và dung lượng tại upload middleware.
 * - Controller/Service xử lý lưu ảnh theo hệ thống hiện có.
 * =========================================================
 */

const CUSTOMER_PROFILE_FIELDS = ["name", "phone"] as const;

export const customerUpdateProfileValidator = [
  /**
   * Nếu gửi name thì phải hợp lệ.
   * Nếu không gửi name thì cho phép cập nhật trường khác.
   */
  body("name")
    .optional()
    .isString()
    .withMessage("Họ tên phải là chuỗi ký tự.")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Họ tên không được để trống.")
    .bail()
    .isLength({ min: 2, max: 150 })
    .withMessage("Họ tên phải từ 2 đến 150 ký tự."),

  /**
   * Nếu gửi phone thì phải hợp lệ.
   * Nếu không gửi phone thì cho phép cập nhật trường khác.
   */
  body("phone")
    .optional({ values: "null" })
    .isString()
    .withMessage("Số điện thoại phải là chuỗi ký tự.")
    .bail()
    .trim()
    .matches(PHONE_REGEX)
    .withMessage("Số điện thoại không đúng định dạng."),

  /**
   * Chặn các trường không thuộc API cập nhật hồ sơ.
   * Cho phép cập nhật ảnh đơn lẻ thông qua req.file.
   */
  body().custom((_value, { req }) => {
    const bodyKeys = Object.keys(req.body ?? {});

    const unknownFields = bodyKeys.filter(
      (key) =>
        !CUSTOMER_PROFILE_FIELDS.includes(key as "name" | "phone")
    );

    if (unknownFields.length > 0) {
      throw new Error(
        `Không được phép cập nhật các trường: ${unknownFields.join(", ")}.`
      );
    }

    const hasAllowedBodyField = bodyKeys.some((key) =>
      CUSTOMER_PROFILE_FIELDS.includes(key as "name" | "phone")
    );

    // Dùng kiểu mở rộng cục bộ để không phụ thuộc khai báo req.file
    // của @types/multer trong file validator.
    const requestWithFile = req as typeof req & {
      file?: unknown;
    };

    const hasUploadedAvatar = Boolean(requestWithFile.file);

    if (!hasAllowedBodyField && !hasUploadedAvatar) {
      throw new Error(
        "Vui lòng cung cấp ít nhất một thông tin cần cập nhật."
      );
    }

    return true;
  }),
];

/**
 * PHÂN QUYỀN:
 * - Route hồ sơ phải có auth middleware.
 * - Lấy userId từ token đã xác thực, không lấy từ body.
 * - Customer chỉ được cập nhật tài khoản của chính mình.
 * - Service kiểm tra số điện thoại trùng nếu nghiệp vụ yêu cầu.
 */