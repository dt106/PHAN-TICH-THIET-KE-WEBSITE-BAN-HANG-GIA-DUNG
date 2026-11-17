/**
 * =========================================================
 * FILE: BACK_END/src/config/mail.ts
 * =========================================================
 *
 * MỤC ĐÍCH:
 * - Cấu hình gửi email bằng Nodemailer.
 * - Kết nối Gmail SMTP.
 * - Gửi OTP đăng ký tài khoản.
 * - Gửi OTP reset mật khẩu.
 * - Gửi OTP xác nhận đổi email.
 * - Có LOG chi tiết để debug lỗi SMTP.
 *
 * CÁC LOẠI OTP:
 *
 * 1. register
 *    → Xác thực email khi đăng ký tài khoản.
 *
 * 2. reset_password
 *    → Xác thực khi reset mật khẩu.
 *
 * 3. change_email
 *    → Xác thực khi admin đổi email.
 *
 * LƯU Ý:
 * - Không lưu OTP trong MongoDB.
 * - OTP được quản lý bởi otp.service.ts.
 * - File này chỉ chịu trách nhiệm gửi email.
 *
 * =========================================================
 */

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * =========================================================
 * TYPE OTP DÙNG CHO MAIL
 * =========================================================
 *
 * Không import OTPType từ otp.service.ts.
 *
 * Lý do:
 *
 * otp.service.ts
 *      ↓
 * import sendOtpEmail
 *      ↓
 * mail.ts
 *
 * Nếu mail.ts lại import OTPType từ otp.service.ts
 * sẽ tạo dependency vòng.
 *
 * Vì vậy định nghĩa type riêng tại đây.
 *
 * =========================================================
 */

export type MailOtpType =
  | "register"
  | "reset_password"
  | "change_email";

/**
 * =========================================================
 * ĐỌC ENV
 * =========================================================
 */

const MAIL_HOST = process.env.MAIL_HOST;

const MAIL_PORT = Number(
  process.env.MAIL_PORT || 587,
);

const MAIL_USER = process.env.MAIL_USER;

const MAIL_PASSWORD =
  process.env.MAIL_PASSWORD;

const MAIL_FROM =
  process.env.MAIL_FROM || MAIL_USER;

/**
 * =========================================================
 * LOG CẤU HÌNH MAIL
 * =========================================================
 *
 * KHÔNG in password thật ra console.
 *
 * Chỉ hiển thị:
 * - Password có tồn tại hay không.
 * - Số lượng ký tự password.
 *
 * =========================================================
 */

console.log("");

console.log(
  "=================================================",
);

console.log(
  "📧 KIỂM TRA CẤU HÌNH EMAIL",
);

console.log(
  "=================================================",
);

console.log(
  "MAIL_HOST:",
  MAIL_HOST,
);

console.log(
  "MAIL_PORT:",
  MAIL_PORT,
);

console.log(
  "MAIL_USER:",
  MAIL_USER,
);

console.log(
  "MAIL_FROM:",
  MAIL_FROM,
);

console.log(
  "MAIL_PASSWORD:",
  MAIL_PASSWORD
    ? `ĐÃ CÓ (${MAIL_PASSWORD.length} ký tự)`
    : "❌ CHƯA CÓ",
);

console.log(
  "=================================================",
);

console.log("");

/**
 * =========================================================
 * KIỂM TRA ENV
 * =========================================================
 */

if (
  !MAIL_HOST ||
  !MAIL_USER ||
  !MAIL_PASSWORD ||
  !MAIL_FROM
) {
  console.error(
    "❌ CẤU HÌNH EMAIL CHƯA ĐẦY ĐỦ!",
  );
}

/**
 * =========================================================
 * NODEMAILER TRANSPORTER
 * =========================================================
 *
 * Port 587:
 * - secure = false
 * - sử dụng STARTTLS
 *
 * Port 465:
 * - secure = true
 *
 * =========================================================
 */

const transporter =
  nodemailer.createTransport({
    host: MAIL_HOST,
    port: MAIL_PORT,

    secure:
      MAIL_PORT === 465,

    auth: {
      user: MAIL_USER,
      pass: MAIL_PASSWORD,
    },

    /**
     * =======================================================
     * DEBUG NODEMAILER
     * =======================================================
     *
     * debug:
     * - Hiển thị quá trình SMTP.
     *
     * logger:
     * - Hiển thị log SMTP ra terminal.
     *
     * Chỉ nên bật khi DEBUG local.
     *
     * =======================================================
     */

    debug: true,
    logger: true,
  });

/**
 * =========================================================
 * KIỂM TRA KẾT NỐI SMTP
 * =========================================================
 */

export const verifyMailConnection =
  async (): Promise<void> => {
    console.log("");

    console.log(
      "=================================================",
    );

    console.log(
      "🔍 ĐANG KIỂM TRA KẾT NỐI GMAIL SMTP...",
    );

    console.log(
      "=================================================",
    );

    console.log(
      "SMTP HOST:",
      MAIL_HOST,
    );

    console.log(
      "SMTP PORT:",
      MAIL_PORT,
    );

    console.log(
      "SMTP USER:",
      MAIL_USER,
    );

    console.log(
      "SMTP PASSWORD:",
      MAIL_PASSWORD
        ? "ĐÃ CÓ"
        : "❌ CHƯA CÓ",
    );

    console.log(
      "=================================================",
    );

    try {
      await transporter.verify();

      console.log("");

      console.log(
        "=================================================",
      );

      console.log(
        "✅ SMTP CONNECTION SUCCESSFUL",
      );

      console.log(
        "=================================================",
      );

      console.log(
        "Gmail SMTP đã xác thực thành công.",
      );

      console.log(
        "=================================================",
      );

      console.log("");
    } catch (error: unknown) {
      console.error("");

      console.error(
        "=================================================",
      );

      console.error(
        "❌ SMTP CONNECTION FAILED",
      );

      console.error(
        "=================================================",
      );

      if (error instanceof Error) {
        console.error(
          "ERROR MESSAGE:",
          error.message,
        );

        console.error(
          "ERROR NAME:",
          error.name,
        );
      } else {
        console.error(
          "ERROR:",
          error,
        );
      }

      /**
       * Nodemailer error có thể chứa
       * các thuộc tính SMTP bổ sung.
       */

      const mailError =
        error as {
          code?: string;
          command?: string;
          responseCode?: number;
          response?: string;
        };

      console.error(
        "ERROR CODE:",
        mailError.code,
      );

      console.error(
        "ERROR COMMAND:",
        mailError.command,
      );

      console.error(
        "ERROR RESPONSE CODE:",
        mailError.responseCode,
      );

      console.error(
        "ERROR RESPONSE:",
        mailError.response,
      );

      console.error(
        "=================================================",
      );

      console.error("");
    }
  };

/**
 * =========================================================
 * GỬI OTP
 * =========================================================
 *
 * MỤC ĐÍCH:
 * - Gửi OTP đăng ký.
 * - Gửi OTP reset mật khẩu.
 * - Gửi OTP đổi email.
 *
 * =========================================================
 */

export const sendOtpEmail = async (
  email: string,
  otp: string,
  type: MailOtpType,
): Promise<void> => {
  console.log("");

  console.log(
    "=================================================",
  );

  console.log(
    "📨 BẮT ĐẦU GỬI EMAIL OTP",
  );

  console.log(
    "=================================================",
  );

  console.log(
    "Người nhận:",
    email,
  );

  console.log(
    "Loại OTP:",
    type,
  );

  /**
   * =======================================================
   * DEBUG OTP
   * =======================================================
   *
   * Không nên log OTP trong production.
   *
   * Khi phát triển local có thể log để
   * kiểm tra quá trình gửi mail.
   *
   * =======================================================
   */

  console.log(
    "OTP:",
    otp,
  );

  console.log(
    "MAIL_FROM:",
    MAIL_FROM,
  );

  console.log(
    "SMTP_HOST:",
    MAIL_HOST,
  );

  console.log(
    "SMTP_PORT:",
    MAIL_PORT,
  );

  console.log(
    "=================================================",
  );

  /**
   * =======================================================
   * NỘI DUNG EMAIL
   * =======================================================
   */

  let subject: string;
  let title: string;
  let description: string;

  /**
   * -------------------------------------------------------
   * OTP ĐĂNG KÝ
   * -------------------------------------------------------
   */

  if (type === "register") {
    subject =
      "Mã OTP xác thực đăng ký tài khoản";

    title =
      "Xác thực đăng ký tài khoản";

    description =
      "Bạn đang thực hiện đăng ký tài khoản. Vui lòng sử dụng mã OTP bên dưới để xác thực email.";
  }

  /**
   * -------------------------------------------------------
   * OTP RESET PASSWORD
   * -------------------------------------------------------
   */

  else if (
    type === "reset_password"
  ) {
    subject =
      "Mã OTP đặt lại mật khẩu";

    title =
      "Đặt lại mật khẩu";

    description =
      "Bạn đang thực hiện đặt lại mật khẩu. Vui lòng sử dụng mã OTP bên dưới để tiếp tục.";
  }

  /**
   * -------------------------------------------------------
   * OTP CHANGE EMAIL
   * -------------------------------------------------------
   */

  else {
    subject =
      "Mã OTP xác nhận đổi email";

    title =
      "Xác nhận đổi email";

    description =
      "Bạn đang thực hiện thay đổi địa chỉ email tài khoản quản trị. Vui lòng sử dụng mã OTP bên dưới để xác nhận email mới.";
  }

  /**
   * =======================================================
   * GỬI EMAIL
   * =======================================================
   */

  if (!MAIL_HOST || !MAIL_USER || !MAIL_PASSWORD) {
    console.warn(
      "SMTP chưa được cấu hình. Bỏ qua gửi email; OTP ở log phía trên dùng được ở chế độ dev.",
    );
    return;
  }

  try {
    console.log(
      "📤 Đang gọi transporter.sendMail()...",
    );

    const info =
      await transporter.sendMail({
        /**
         * ---------------------------------------------------
         * NGƯỜI GỬI
         * ---------------------------------------------------
         */

        from:
          `"Gia Dụng Store" <${MAIL_FROM}>`,

        /**
         * ---------------------------------------------------
         * NGƯỜI NHẬN
         * ---------------------------------------------------
         */

        to: email,

        /**
         * ---------------------------------------------------
         * TIÊU ĐỀ
         * ---------------------------------------------------
         */

        subject,

        /**
         * ---------------------------------------------------
         * TEXT VERSION
         * ---------------------------------------------------
         */

        text: `
${title}

${description}

Mã OTP của bạn: ${otp}

Mã OTP có hiệu lực trong 5 phút.

Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.

Trân trọng,

Gia Dụng Store
        `.trim(),

        /**
         * ---------------------------------------------------
         * HTML VERSION
         * ---------------------------------------------------
         */

        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 24px;
              background-color: #f7f7f7;
            "
          >
            <div
              style="
                background-color: #ffffff;
                padding: 30px;
                border-radius: 12px;
              "
            >

              <!-- TIÊU ĐỀ -->

              <h2>
                ${title}
              </h2>

              <!-- MÔ TẢ -->

              <p>
                ${description}
              </p>

              <!-- OTP -->

              <div
                style="
                  margin: 25px 0;
                  padding: 20px;
                  text-align: center;
                  background-color: #f1f1f1;
                  border-radius: 10px;
                "
              >

                <div
                  style="
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 8px;
                  "
                >
                  MÃ OTP
                </div>

                <div
                  style="
                    font-size: 32px;
                    font-weight: bold;
                    letter-spacing: 8px;
                  "
                >
                  ${otp}
                </div>

              </div>

              <!-- THỜI HẠN -->

              <p>
                <strong>
                  Thời hạn:
                </strong>
                5 phút.
              </p>

              <!-- CẢNH BÁO -->

              <p>
                Nếu bạn không thực hiện yêu cầu này,
                vui lòng bỏ qua email.
              </p>

              <hr />

              <!-- FOOTER -->

              <p
                style="
                  font-size: 12px;
                  color: #777;
                "
              >
                Đây là email tự động.
                Vui lòng không trả lời email này.
              </p>

            </div>
          </div>
        `,
      });

    /**
     * =====================================================
     * LOG GỬI EMAIL THÀNH CÔNG
     * =====================================================
     */

    console.log("");

    console.log(
      "=================================================",
    );

    console.log(
      "✅ GỬI EMAIL THÀNH CÔNG",
    );

    console.log(
      "=================================================",
    );

    console.log(
      "Message ID:",
      info.messageId,
    );

    console.log(
      "Accepted:",
      info.accepted,
    );

    console.log(
      "Rejected:",
      info.rejected,
    );

    console.log(
      "Response:",
      info.response,
    );

    console.log(
      "=================================================",
    );

    console.log("");
  } catch (error: unknown) {
    /**
     * =====================================================
     * LOG LỖI GỬI EMAIL
     * =====================================================
     */

    console.error("");

    console.error(
      "=================================================",
    );

    console.error(
      "❌ GỬI EMAIL THẤT BẠI",
    );

    console.error(
      "=================================================",
    );

    if (error instanceof Error) {
      console.error(
        "ERROR NAME:",
        error.name,
      );

      console.error(
        "ERROR MESSAGE:",
        error.message,
      );
    } else {
      console.error(
        "ERROR:",
        error,
      );
    }

    /**
     * Nodemailer SMTP error.
     */

    const mailError =
      error as {
        code?: string;
        command?: string;
        responseCode?: number;
        response?: string;
      };

    console.error(
      "ERROR CODE:",
      mailError.code,
    );

    console.error(
      "ERROR COMMAND:",
      mailError.command,
    );

    console.error(
      "ERROR RESPONSE CODE:",
      mailError.responseCode,
    );

    console.error(
      "ERROR RESPONSE:",
      mailError.response,
    );

    console.error(
      "=================================================",
    );

    console.error("");

    /**
     * Quan trọng:
     * Ném lỗi lên service để service biết
     * việc gửi email đã thất bại.
     */

    throw error;
  }
};

/**
 * =========================================================
 * EXPORT DEFAULT
 * =========================================================
 */

export default transporter;