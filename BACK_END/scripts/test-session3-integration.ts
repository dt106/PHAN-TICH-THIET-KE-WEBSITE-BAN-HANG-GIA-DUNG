import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Attribute from "../src/models/Attribute.model";
import AttributeValue from "../src/models/AttributeValue.model";
import Category from "../src/models/Category.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import ProductVariant from "../src/models/ProductVariant.model";
import VariantAttribute from "../src/models/VariantAttribute.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-session3-category";
const CATEGORY_NAME = "Test Session3 Category";
const PRODUCT_SKU = "SES3-001";
const PRODUCT_SLUG = "noi-com-dien-ses3";
const ATTRIBUTES = ["test-session3-mau-sac"];
const VALUE_SLUGS = ["test-session3-bac", "test-session3-xam"];
const MEDIA_URL_PRIMARY = "http://cdn.local/ses3-primary.jpg";
const MEDIA_URL_SECONDARY = "http://cdn.local/ses3-secondary.jpg";

interface CallResult {
  status: number;
  json: any;
}

const call = async (
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<CallResult> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
};

let passed = 0;
let failed = 0;

const expect = (name: string, condition: boolean, detail: string): void => {
  if (condition) {
    passed += 1;
    console.log(`PASS | ${name} | ${detail}`);
  } else {
    failed += 1;
    console.log(`FAIL | ${name} | ${detail}`);
  }
};

const preClean = async (): Promise<void> => {
  const products = await Product.find({ sku: PRODUCT_SKU });
  const productIds = products.map((product) => product._id);
  const variants = await ProductVariant.find({
    productId: { $in: productIds },
  });
  const variantIds = variants.map((variant) => variant._id);

  await Promise.all([
    VariantAttribute.deleteMany({ variantId: { $in: variantIds } }),
    ProductVariant.deleteMany({ productId: { $in: productIds } }),
    ProductMedia.deleteMany({ productId: { $in: productIds } }),
    Product.deleteMany({ sku: PRODUCT_SKU }),
    Category.deleteMany({ slug: CATEGORY_SLUG }),
    AttributeValue.deleteMany({ slug: { $in: VALUE_SLUGS } }),
    Attribute.deleteMany({ slug: { $in: ATTRIBUTES } }),
  ]);
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Product.syncIndexes();
  await preClean();

  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const category = await Category.create({ name: CATEGORY_NAME, slug: CATEGORY_SLUG });
  const attribute = await Attribute.create({
    name: "Màu Sắc",
    slug: ATTRIBUTES[0],
  });
  const valueBac = await AttributeValue.create({
    attributeId: attribute._id,
    value: "Bạc",
    slug: VALUE_SLUGS[0],
  });
  const valueXam = await AttributeValue.create({
    attributeId: attribute._id,
    value: "Xám",
    slug: VALUE_SLUGS[1],
  });

  const createProduct = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Nồi Cơm Điện Ses3",
      sku: PRODUCT_SKU,
      categoryId: category._id.toString(),
      basePrice: 1000000,
    },
    adminToken
  );
  const productId = createProduct.json.data?.id as string;
  expect(
    "Tạo sản phẩm SES3-001 basePrice 1000000 thành công",
    createProduct.status === 201 && productId !== "",
    `status=${createProduct.status}, productId=${productId}`
  );

  const primaryMedia = await call(
    "POST",
    `/api/admin/products/${productId}/media`,
    { mediaType: "image", mediaUrl: MEDIA_URL_PRIMARY, altText: "Ảnh chính" },
    adminToken
  );
  const primaryMediaId = primaryMedia.json.data?.id as string;
  expect(
    "Thêm ảnh chính: ảnh đầu tiên tự động isPrimary",
    primaryMedia.status === 201 && primaryMedia.json.data?.isPrimary === true,
    `status=${primaryMedia.status}, isPrimary=${primaryMedia.json.data?.isPrimary}`
  );

  const secondaryMedia = await call(
    "POST",
    `/api/admin/products/${productId}/media`,
    { mediaType: "image", mediaUrl: MEDIA_URL_SECONDARY, altText: "Ảnh phụ" },
    adminToken
  );
  expect(
    "Thêm ảnh phụ: isPrimary false và sortOrder tự tăng",
    secondaryMedia.status === 201 &&
      secondaryMedia.json.data?.isPrimary === false &&
      secondaryMedia.json.data?.sortOrder === 1,
    `status=${secondaryMedia.status}, sortOrder=${secondaryMedia.json.data?.sortOrder}`
  );

  const createV1 = await call(
    "POST",
    `/api/admin/products/${productId}/variants`,
    {
      sku: "SES3-001-BAC",
      price: 850000,
      stockQuantity: 10,
      attributes: [
        { attributeId: attribute._id.toString(), attributeValueId: valueBac._id.toString() },
      ],
    },
    adminToken
  );
  const v1Id = createV1.json.data?.id as string;
  expect(
    "Thêm biến thể V1 (Bạc, 850000) kèm thuộc tính thành công",
    createV1.status === 201 &&
      v1Id !== "" &&
      createV1.json.data?.sku === "SES3-001-BAC",
    `status=${createV1.status}, variantId=${v1Id}`
  );

  const productAfterV1 = await call("GET", `/api/products/${productId}`);
  expect(
    "Min/max price tự cập nhật về 850000 sau khi thêm V1",
    productAfterV1.status === 200 &&
      productAfterV1.json.data?.minPrice === 850000 &&
      productAfterV1.json.data?.maxPrice === 850000,
    `min=${productAfterV1.json.data?.minPrice}, max=${productAfterV1.json.data?.maxPrice}`
  );

  const createV2 = await call(
    "POST",
    `/api/admin/products/${productId}/variants`,
    {
      sku: "SES3-001-XAM",
      price: 1250000,
      stockQuantity: 5,
      attributes: [
        { attributeId: attribute._id.toString(), attributeValueId: valueXam._id.toString() },
      ],
    },
    adminToken
  );
  expect(
    "Thêm biến thể V2 (Xám, 1250000) thành công",
    createV2.status === 201,
    `status=${createV2.status}`
  );

  const productAfterV2 = await call("GET", `/api/products/${productId}`);
  expect(
    "Min/max price tự cập nhật 850000/1250000 sau khi thêm V2",
    productAfterV2.status === 200 &&
      productAfterV2.json.data?.minPrice === 850000 &&
      productAfterV2.json.data?.maxPrice === 1250000,
    `min=${productAfterV2.json.data?.minPrice}, max=${productAfterV2.json.data?.maxPrice}`
  );

  const detailBySlug = await call("GET", `/api/products/slug/${PRODUCT_SLUG}`);
  const detailData = detailBySlug.json.data;
  const detailMedia = Array.isArray(detailData?.media) ? detailData.media : [];
  const detailVariants = Array.isArray(detailData?.variants)
    ? detailData.variants
    : [];
  expect(
    "Chi tiết public lồng media (ảnh chính đầu) và biến thể kèm thuộc tính",
    detailBySlug.status === 200 &&
      detailMedia.length === 2 &&
      detailMedia[0]?.mediaUrl === MEDIA_URL_PRIMARY &&
      detailVariants.length === 2 &&
      detailVariants[0]?.attributes?.[0]?.attributeValueId?.value === "Bạc",
    `media=${detailMedia.length}, variants=${detailVariants.length}, firstMedia=${detailMedia[0]?.mediaUrl}`
  );

  const publicList = await call("GET", "/api/products");
  const productInList = Array.isArray(publicList.json.data)
    ? publicList.json.data.find((item: any) => item.sku === PRODUCT_SKU)
    : null;
  expect(
    "Danh sách public gắn thumbnail từ ảnh isPrimary",
    publicList.status === 200 && productInList?.thumbnail === MEDIA_URL_PRIMARY,
    `status=${publicList.status}, thumbnail=${productInList?.thumbnail}`
  );

  const publicVariants = await call(
    "GET",
    `/api/products/${productId}/variants`
  );
  expect(
    "Public danh sách biến thể trả 2 biến thể active kèm thuộc tính",
    publicVariants.status === 200 &&
      Array.isArray(publicVariants.json.data) &&
      publicVariants.json.data.length === 2 &&
      publicVariants.json.data[0]?.attributes?.[0]?.attributeId?.name === "Màu Sắc",
    `status=${publicVariants.status}, count=${publicVariants.json.data?.length}`
  );

  await preClean();

  const remainingProducts = await Product.countDocuments({ sku: PRODUCT_SKU });
  const remainingMedia = await ProductMedia.countDocuments({
    productId: { $in: [productId] },
  });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingProducts === 0 && remainingMedia === 0,
    `products=${remainingProducts}, media=${remainingMedia}`
  );

  console.log("\n========================================");
  console.log(`SESSION 3 INTEGRATION SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
