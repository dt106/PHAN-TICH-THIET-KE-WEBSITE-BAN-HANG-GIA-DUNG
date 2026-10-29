/**
 * FILE: BACK_END/src/utils/appError.ts
 *
 * Lớp lỗi chuẩn của toàn bộ API.
 * Service ném AppError(kèm statusCode), error.middleware đọc statusCode
 * và trả về JSON { success: false, message } với đúng HTTP status.
 *
 * Quy ước mã:
 * - 400: dữ liệu gửi lên không hợp lệ / vi phạm nghiệp vụ
 * - 401: chưa đăng nhập
 * - 403: không có quyền
 * - 404: không tìm thấy tài nguyên
 * - 409: xung đột trạng thái
 * - 429: quá nhiều yêu cầu
 * - 500: lỗi hệ thống (middleware tự che message gốc)
 */
export class AppError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export default AppError;
