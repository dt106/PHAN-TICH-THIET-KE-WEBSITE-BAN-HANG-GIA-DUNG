import "dotenv/config";
import mongoose from "mongoose";
import app from "./app";
import connectDatabase from "./src/config/database";
import * as models from "./src/models";

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // 1. Kết nối MongoDB
    await connectDatabase();

    // 2. Tự động tạo tất cả collection từ các Model nếu DB đã kết nối
    if (mongoose.connection.readyState === 1) {
      console.log("📦 Đang khởi tạo các collection...");

      for (const [name, model] of Object.entries(models)) {
        try {
          await model.createCollection();
          console.log(`✅ ${name} → collection đã tạo`);
        } catch (error: any) {
          // Collection đã tồn tại thì bỏ qua
          if (error?.codeName === "NamespaceExists") {
            console.log(`ℹ️ ${name} → collection đã tồn tại`);
          } else {
            console.error(`❌ ${name} → không thể tạo collection`);
            console.error(error);
          }
        }
      }

      console.log("=================================");
      console.log("🚀 Tất cả collection đã sẵn sàng");
      console.log("=================================");
    } else {
      console.log(
        "ℹ️ Bỏ qua khởi tạo collection vì chưa kết nối được MongoDB.",
      );
    }

    // 3. Chạy server
    const server = app.listen(PORT, () => {
      console.log("=================================");
      console.log("🚀 Server is running");
      console.log(`🌐 http://localhost:${PORT}`);
      console.log(
        `🐞 Debugger: ws://127.0.0.1:9229 (Chrome DevTools / Cursor)`,
      );
      console.log("=================================");
    });
    server.on("error", (error) => {
      console.error(`❌ Không mở được cổng ${PORT}:`, error);
      process.exit(1);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
