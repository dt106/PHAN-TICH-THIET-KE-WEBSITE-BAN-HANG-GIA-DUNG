import mongoose from "mongoose";

/**
 * =========================================================
 * FILE: BACK_END/src/config/database.ts
 * =========================================================
 *
 * NHIỆM VỤ:
 * - Khởi tạo và quản lý kết nối MongoDB qua thư viện Mongoose.
 * - Đọc MONGO_URI từ biến môi trường (.env).
 * - Lắng nghe các sự kiện kết nối (connected, error, disconnected).
 * - Cung cấp cơ chế shutdown an toàn (graceful disconnect).
 * =========================================================
 */

// Đăng ký các sự kiện theo dõi vòng đời kết nối MongoDB
mongoose.connection.on("connected", () => {
  console.log("=================================");
  console.log("✅ MongoDB connected successfully");
  console.log(`📦 Database Name: ${mongoose.connection.name}`);
  console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
  console.log("=================================");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected.");
});

/**
 * Hàm khởi tạo kết nối MongoDB
 */
const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.warn(
      "⚠️ MONGO_URI chưa được cấu hình trong file .env. Backend đang chạy ở chế độ KHÔNG có database."
    );
    return;
  }

  try {
    console.log("🔄 Đang kết nối tới MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (error: any) {
    console.warn("-----------------------------------------------------------------");
    console.warn("⚠️ KHÔNG THỂ KẾT NỐI MONGODB:");
    console.warn(`   Chi tiết lỗi: ${error?.message || error}`);
    console.warn("👉 Vui lòng kiểm tra:");
    console.warn("   1. MongoDB Service hoặc Docker container MongoDB đã được khởi động chưa?");
    console.warn("   2. Chuỗi MONGO_URI trong file BACK_END/.env đã chính xác chưa?");
    console.warn("-----------------------------------------------------------------");
  }
};

/**
 * Hàm ngắt kết nối an toàn (dùng cho test hoặc graceful shutdown)
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("🔌 Đã ngắt kết nối MongoDB an toàn.");
  } catch (error: any) {
    console.error("❌ Lỗi khi ngắt kết nối MongoDB:", error.message);
  }
};

export default connectDatabase;
