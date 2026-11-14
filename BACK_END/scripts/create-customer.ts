import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDatabase from "../src/config/database";
import User from "../src/models/User.model";

dotenv.config();

const BCRYPT_SALT_ROUNDS = 12;

const createCustomer = async (): Promise<void> => {
  try {
    console.log("🔌 Đang kết nối MongoDB...");
    await connectDatabase();

    const customerEmail = "user@gmail.com";
    const customerPassword = "User@123456";
    const customerName = "Khách Hàng Mẫu";
    const customerPhone = "0901234567";

    const existingUser = await User.findOne({ email: customerEmail });
    if (existingUser) {
      console.log(`⚠️ Email ${customerEmail} đã tồn tại trong hệ thống.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(customerPassword, BCRYPT_SALT_ROUNDS);

    const user = await User.create({
      name: customerName,
      email: customerEmail,
      password: hashedPassword,
      phone: customerPhone,
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    });

    console.log("=========================================");
    console.log("    TẠO TÀI KHOẢN KHÁCH HÀNG THÀNH CÔNG");
    console.log("=========================================");
    console.log(`👤 Tên      : ${user.name}`);
    console.log(`📧 Email    : ${user.email}`);
    console.log(`🔑 Password : ${customerPassword}`);
    console.log(`📱 Phone    : ${user.phone}`);
    console.log(`🔑 Role     : ${user.role}`);
    console.log(`🟢 Status   : ${user.status}`);
  } catch (error) {
    console.error("❌ Lỗi khi tạo tài khoản customer:", error);
  } finally {
    process.exit(0);
  }
};

createCustomer();
