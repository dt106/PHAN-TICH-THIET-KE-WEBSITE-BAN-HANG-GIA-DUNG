/**
 * Dữ liệu mẫu để duyệt cửa hàng. Chạy lại thì cập nhật theo slug/sku, không tạo bản trùng.
 * shortcut: ảnh lấy từ picsum, đổi mediaUrl khi có ảnh thật.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDatabase from "../src/config/database";
import Brand from "../src/models/Brand.model";
import Category from "../src/models/Category.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import ProductVariant from "../src/models/ProductVariant.model";

dotenv.config();

const categories = [
  { name: "Nồi chảo", slug: "noi-chao", sortOrder: 1 },
  { name: "Đồ điện", slug: "do-dien", sortOrder: 2 },
  { name: "Nhà bếp", slug: "nha-bep", sortOrder: 3 },
];

const brands = [
  { name: "Sunhouse", slug: "sunhouse" },
  { name: "Lock&Lock", slug: "locknlock" },
  { name: "Kangaroo", slug: "kangaroo" },
];

const products = [
  { name: "Nồi inox 24cm", slug: "noi-inox-24cm", sku: "GD-NOI-24", category: "noi-chao", brand: "sunhouse", basePrice: 890000, salePrice: 690000, image: 292 },
  { name: "Chảo chống dính 26cm", slug: "chao-chong-dinh-26cm", sku: "GD-CHAO-26", category: "noi-chao", brand: "locknlock", basePrice: 450000, salePrice: 359000, image: 488 },
  { name: "Bộ nồi 3 món", slug: "bo-noi-3-mon", sku: "GD-BONOI-3", category: "noi-chao", brand: "kangaroo", basePrice: 1290000, salePrice: null, image: 312 },
  { name: "Nồi cơm điện 1.8L", slug: "noi-com-dien-1-8l", sku: "GD-NCD-18", category: "do-dien", brand: "sunhouse", basePrice: 1890000, salePrice: 1490000, image: 225 },
  { name: "Ấm siêu tốc 1.7L", slug: "am-sieu-toc-1-7l", sku: "GD-AST-17", category: "do-dien", brand: "kangaroo", basePrice: 390000, salePrice: null, image: 1060 },
  { name: "Máy xay sinh tố", slug: "may-xay-sinh-to", sku: "GD-MXST-01", category: "do-dien", brand: "sunhouse", basePrice: 750000, salePrice: 620000, image: 835 },
  { name: "Hộp thủy tinh 3 ngăn", slug: "hop-thuy-tinh-3-ngan", sku: "GD-HOP-3", category: "nha-bep", brand: "locknlock", basePrice: 189000, salePrice: 149000, image: 429 },
  { name: "Thớt gỗ", slug: "thot-go", sku: "GD-THOT-01", category: "nha-bep", brand: "locknlock", basePrice: 259000, salePrice: null, image: 674 },
];

async function main() {
  await connectDatabase();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB chưa kết nối.");
  }

  const categoryId = new Map<string, mongoose.Types.ObjectId>();
  for (const item of categories) {
    const doc = await Category.findOneAndUpdate(
      { slug: item.slug },
      { $set: { name: item.name, slug: item.slug, parentId: null, sortOrder: item.sortOrder, isActive: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    categoryId.set(item.slug, doc._id);
  }

  const brandId = new Map<string, mongoose.Types.ObjectId>();
  for (const item of brands) {
    const doc = await Brand.findOneAndUpdate(
      { slug: item.slug },
      { $set: { name: item.name, slug: item.slug, isActive: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    brandId.set(item.slug, doc._id);
  }

  for (const item of products) {
    const product = await Product.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          categoryId: categoryId.get(item.category),
          brandId: brandId.get(item.brand),
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: `${item.name} — dữ liệu mẫu để chạy thử cửa hàng.`,
          basePrice: item.basePrice,
          salePrice: item.salePrice,
          isFeatured: true,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    const mediaUrl = `https://picsum.photos/id/${item.image}/800/800`;
    await ProductMedia.findOneAndUpdate(
      { productId: product._id, isPrimary: true },
      { $set: { productId: product._id, mediaType: "image", mediaUrl, altText: item.name, sortOrder: 0, isPrimary: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    const price = item.salePrice ?? item.basePrice;
    await ProductVariant.findOneAndUpdate(
      { sku: `${item.sku}-01` },
      {
        $set: {
          productId: product._id,
          sku: `${item.sku}-01`,
          price,
          compareAtPrice: item.salePrice ? item.basePrice : null,
          stockQuantity: 30,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  console.log(`Đã nạp ${products.length} sản phẩm mẫu.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
