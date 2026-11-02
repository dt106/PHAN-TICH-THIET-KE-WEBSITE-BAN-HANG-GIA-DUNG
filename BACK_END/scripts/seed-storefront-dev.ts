import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import Attribute from "../src/models/Attribute.model";
import AttributeValue from "../src/models/AttributeValue.model";
import Brand from "../src/models/Brand.model";
import Category from "../src/models/Category.model";
import Coupon from "../src/models/Coupon.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import ProductVariant from "../src/models/ProductVariant.model";
import User from "../src/models/User.model";
import VariantAttribute from "../src/models/VariantAttribute.model";

/**
 * Dữ liệu tối thiểu để storefront và e2e có danh mục, biến thể, coupon, tài khoản mẫu.
 * Chạy: node node_modules/tsx/dist/cli.mjs scripts/seed-storefront-dev.ts
 */
async function main() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/BAN_HANG_GIA_DUNG");

  const category = await Category.findOneAndUpdate(
    { slug: "phong-khach" },
    { name: "Phòng khách", slug: "phong-khach", isActive: true, sortOrder: 1 },
    { upsert: true, returnDocument: "after" },
  );
  const brand = await Brand.findOneAndUpdate(
    { slug: "furniro" },
    { name: "Furniro", slug: "furniro", isActive: true },
    { upsert: true, returnDocument: "after" },
  );
  const simple = await Product.findOneAndUpdate(
    { sku: "GHE-01" },
    {
      name: "Ghế cafe",
      slug: "ghe-cafe",
      sku: "GHE-01",
      categoryId: category!._id,
      brandId: brand!._id,
      description: "Ghế cafe gỗ",
      basePrice: 2500000,
      salePrice: 2000000,
      isFeatured: true,
      isActive: true,
    },
    { upsert: true, returnDocument: "after" },
  );
  await ProductMedia.findOneAndUpdate(
    { productId: simple!._id, isPrimary: true },
    {
      productId: simple!._id,
      mediaType: "image",
      mediaUrl: "https://placehold.co/600x600/png?text=Ghe",
      altText: "Ghế cafe",
      isPrimary: true,
      sortOrder: 0,
    },
    { upsert: true },
  );

  const sized = await Product.findOneAndUpdate(
    { sku: "BAN-01" },
    {
      name: "Bàn ăn",
      slug: "ban-an",
      sku: "BAN-01",
      categoryId: category!._id,
      brandId: brand!._id,
      description: "Bàn ăn 4 người",
      basePrice: 7000000,
      minPrice: 6800000,
      maxPrice: 6800000,
      isFeatured: true,
      isActive: true,
    },
    { upsert: true, returnDocument: "after" },
  );
  const color = await Attribute.findOneAndUpdate(
    { slug: "mau-sac" },
    { name: "Màu sắc", slug: "mau-sac" },
    { upsert: true, returnDocument: "after" },
  );
  const oak = await AttributeValue.findOneAndUpdate(
    { attributeId: color!._id, value: "Gỗ sồi" },
    { attributeId: color!._id, value: "Gỗ sồi", slug: "go-soi" },
    { upsert: true, returnDocument: "after" },
  );
  const variant = await ProductVariant.findOneAndUpdate(
    { sku: "BAN-01-SOI" },
    {
      productId: sized!._id,
      sku: "BAN-01-SOI",
      price: 6800000,
      compareAtPrice: 7000000,
      stockQuantity: 8,
      isActive: true,
    },
    { upsert: true, returnDocument: "after" },
  );
  await VariantAttribute.findOneAndUpdate(
    { variantId: variant!._id, attributeId: color!._id },
    { variantId: variant!._id, attributeId: color!._id, attributeValueId: oak!._id },
    { upsert: true },
  );
  await Coupon.findOneAndUpdate(
    { code: "WELCOME10" },
    {
      code: "WELCOME10",
      name: "Giảm 10%",
      discountType: "percentage",
      discountValue: 10,
      minimumOrderAmount: 0,
      isActive: true,
    },
    { upsert: true },
  );
  const adminPassword = await bcrypt.hash("Admin@123456", 12);
  await User.findOneAndUpdate(
    { email: "admin@example.com" },
    {
      name: "Quản trị",
      email: "admin@example.com",
      phone: "0901000001",
      password: adminPassword,
      role: "admin",
      status: "active",
      emailVerifiedAt: new Date(),
    },
    { upsert: true },
  );
  const password = await bcrypt.hash("Customer@123", 12);
  await User.findOneAndUpdate(
    { email: "customer@example.com" },
    {
      name: "Khách Thử",
      email: "customer@example.com",
      phone: "0901234567",
      password,
      role: "customer",
      status: "active",
      emailVerifiedAt: new Date(),
    },
    { upsert: true },
  );
  console.log("seed-storefront-dev: ok");
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
