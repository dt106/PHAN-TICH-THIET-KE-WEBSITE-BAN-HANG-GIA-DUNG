import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Attribute from "../src/models/Attribute.model";
import AttributeValue from "../src/models/AttributeValue.model";
import Brand from "../src/models/Brand.model";
import Category from "../src/models/Category.model";
import OrderItem from "../src/models/OrderItem.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import ProductVariant from "../src/models/ProductVariant.model";
import VariantAttribute from "../src/models/VariantAttribute.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-variant-category";
const BRAND_SLUG = "test-variant-brand";
const CATEGORY_NAME = "Test Variant Category";
const BRAND_NAME = "Test Variant Brand";

const P1_SKU = "TPV-001";
const ALL_SKUS = [P1_SKU];

const V1_SKU = "TPV-001-RED";
const V2_SKU = "TPV-001-BLUE";
const ALL_VARIANT_SKUS = [V1_SKU, V2_SKU];

const COLOR_ATTRIBUTE_SLUG = "test-variant-mau-sac";
const RED_VALUE_SLUG = "test-variant-do";
const BLACK_VALUE_SLUG = "test-variant-den";
const VOLUME_ATTRIBUTE_SLUG = "test-variant-dung-tich";
const VOLUME_18L_VALUE_SLUG = "test-variant-1-8l";

const ALL_ATTRIBUTE_SLUGS = [COLOR_ATTRIBUTE_SLUG, VOLUME_ATTRIBUTE_SLUG];
const ALL_VALUE_SLUGS = [
  RED_VALUE_SLUG,
  BLACK_VALUE_SLUG,
  VOLUME_18L_VALUE_SLUG,
];

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
  const products = await Product.find({ sku: { $in: ALL_SKUS } });
  const productIds = products.map((product) => product._id);
  const variants = await ProductVariant.find({
    productId: { $in: productIds },
  });
  const variantIds = variants.map((variant) => variant._id);
  const attributes = await Attribute.find({ slug: { $in: ALL_ATTRIBUTE_SLUGS } });
  const attributeIds = attributes.map((attribute) => attribute._id);

  await Promise.all([
    VariantAttribute.deleteMany({ variantId: { $in: variantIds } }),
    VariantAttribute.deleteMany({ attributeId: { $in: attributeIds } }),
    ProductVariant.deleteMany({ productId: { $in: productIds } }),
    ProductMedia.deleteMany({ productId: { $in: productIds } }),
    OrderItem.deleteMany({ productSku: { $in: ALL_SKUS } }),
    Product.deleteMany({ sku: { $in: ALL_SKUS } }),
    Category.deleteMany({ slug: CATEGORY_SLUG }),
    Brand.deleteMany({ slug: BRAND_SLUG }),
    AttributeValue.deleteMany({ attributeId: { $in: attributeIds } }),
    AttributeValue.deleteMany({ slug: { $in: ALL_VALUE_SLUGS } }),
    Attribute.deleteMany({ slug: { $in: ALL_ATTRIBUTE_SLUGS } }),
  ]);
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Product.syncIndexes();
  await ProductVariant.syncIndexes();
  await preClean();

  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const customerToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "customer" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const categoryRes = await call(
    "POST",
    "/api/admin/categories",
    { name: CATEGORY_NAME },
    adminToken
  );
  const categoryId = categoryRes.json.data?.id as string;

  const brandRes = await call(
    "POST",
    "/api/admin/brands",
    { name: BRAND_NAME },
    adminToken
  );
  const brandId = brandRes.json.data?.id as string;

  const colorAttrRes = await call(
    "POST",
    "/api/admin/attributes",
    { name: "Màu Sắc", slug: COLOR_ATTRIBUTE_SLUG },
    adminToken
  );
  const colorAttributeId = colorAttrRes.json.data?.id as string;

  const redValueRes = await call(
    "POST",
    `/api/admin/attributes/${colorAttributeId}/values`,
    { value: "Đỏ", slug: RED_VALUE_SLUG },
    adminToken
  );
  const redValueId = redValueRes.json.data?.id as string;

  const blackValueRes = await call(
    "POST",
    `/api/admin/attributes/${colorAttributeId}/values`,
    { value: "Đen", slug: BLACK_VALUE_SLUG },
    adminToken
  );
  const blackValueId = blackValueRes.json.data?.id as string;

  const volumeAttrRes = await call(
    "POST",
    "/api/admin/attributes",
    { name: "Dung Tích", slug: VOLUME_ATTRIBUTE_SLUG },
    adminToken
  );
  const volumeAttributeId = volumeAttrRes.json.data?.id as string;

  const volume18LRes = await call(
    "POST",
    `/api/admin/attributes/${volumeAttributeId}/values`,
    { value: "1.8L", slug: VOLUME_18L_VALUE_SLUG },
    adminToken
  );
  const volume18LValueId = volume18LRes.json.data?.id as string;

  expect(
    "Chuẩn bị dữ liệu: category, brand, thuộc tính và giá trị tạo thành công",
    Boolean(
      categoryId &&
        brandId &&
        colorAttributeId &&
        redValueId &&
        blackValueId &&
        volumeAttributeId &&
        volume18LValueId
    ),
    `category=${categoryId}, brand=${brandId}, colorAttr=${colorAttributeId}, volumeAttr=${volumeAttributeId}`
  );

  const createP1 = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Nồi Cơm Điện Test Variant TPV1",
      sku: P1_SKU,
      categoryId,
      brandId,
      basePrice: 1200000,
      description: "Sản phẩm test luồng biến thể",
    },
    adminToken
  );
  const p1Id = createP1.json.data?.id as string;
  expect(
    "Tạo sản phẩm TPV-001 basePrice 1200000 thành công",
    createP1.status === 201 &&
      p1Id !== "" &&
      createP1.json.data?.sku === P1_SKU,
    `status=${createP1.status}, productId=${p1Id}`
  );

  const noAuthCreate = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    { sku: V1_SKU, price: 850000 }
  );
  expect(
    "RBAC: tạo biến thể không có token bị chặn",
    noAuthCreate.status === 401,
    `status=${noAuthCreate.status}`
  );

  const customerCreate = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    { sku: V1_SKU, price: 850000 },
    customerToken
  );
  expect(
    "RBAC: customer không được tạo biến thể",
    customerCreate.status === 403,
    `status=${customerCreate.status}`
  );

  const noAuthAdminList = await call(
    "GET",
    `/api/admin/products/${p1Id}/variants`
  );
  expect(
    "RBAC: admin list biến thể không có token bị chặn",
    noAuthAdminList.status === 401,
    `status=${noAuthAdminList.status}`
  );

  const missingFields = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    {},
    adminToken
  );
  expect(
    "Validate: tạo biến thể thiếu sku/price trả 400",
    missingFields.status === 400,
    `status=${missingFields.status}`
  );

  const badProductId = await call(
    "POST",
    "/api/admin/products/not-a-mongo-id/variants",
    { sku: "TPV-BAD", price: 100000 },
    adminToken
  );
  expect(
    "Validate: productId không phải MongoId trả 400",
    badProductId.status === 400,
    `status=${badProductId.status}`
  );

  const createV1 = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    {
      sku: V1_SKU,
      price: 850000,
      stockQuantity: 20,
      attributes: [
        { attributeId: colorAttributeId, attributeValueId: redValueId },
      ],
    },
    adminToken
  );
  const v1Id = createV1.json.data?.id as string;
  expect(
    "Tạo biến thể V1 trả 201 với SKU tự in hoa và tồn kho 20",
    createV1.status === 201 &&
      v1Id !== "" &&
      createV1.json.data?.sku === V1_SKU &&
      createV1.json.data?.price === 850000 &&
      createV1.json.data?.stockQuantity === 20 &&
      createV1.json.data?.isActive === true,
    `status=${createV1.status}, variantId=${v1Id}`
  );

  const publicList = await call("GET", `/api/products/${p1Id}/variants`);
  const publicVariants = Array.isArray(publicList.json.data)
    ? publicList.json.data
    : [];
  const v1InList = publicVariants.find((item: any) => item.id === v1Id);
  expect(
    "Public list biến thể trả V1 kèm thuộc tính lồng đúng",
    publicList.status === 200 &&
      publicVariants.length === 1 &&
      v1InList?.sku === V1_SKU &&
      v1InList?.attributes?.[0]?.attributeId?.name === "Màu Sắc" &&
      v1InList?.attributes?.[0]?.attributeValueId?.value === "Đỏ",
    `status=${publicList.status}, variants=${publicVariants.length}`
  );

  const publicDetail = await call("GET", `/api/variants/${v1Id}`);
  expect(
    "Public chi tiết biến thể theo ID trả đủ thông tin",
    publicDetail.status === 200 &&
      publicDetail.json.data?.id === v1Id &&
      publicDetail.json.data?.sku === V1_SKU &&
      publicDetail.json.data?.price === 850000 &&
      publicDetail.json.data?.attributes?.length === 1,
    `status=${publicDetail.status}, sku=${publicDetail.json.data?.sku}`
  );

  const productAfterV1 = await call("GET", `/api/products/${p1Id}`);
  expect(
    "Tạo V1 tự đồng bộ minPrice/maxPrice về 850000",
    productAfterV1.status === 200 &&
      productAfterV1.json.data?.minPrice === 850000 &&
      productAfterV1.json.data?.maxPrice === 850000,
    `status=${productAfterV1.status}, min=${productAfterV1.json.data?.minPrice}, max=${productAfterV1.json.data?.maxPrice}`
  );

  const duplicateSku = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    { sku: "tpv-001-red", price: 900000 },
    adminToken
  );
  expect(
    "Trùng SKU biến thể (kể cả viết thường) bị chặn",
    duplicateSku.status === 400,
    `status=${duplicateSku.status}, message=${duplicateSku.json.message}`
  );

  const mismatchedPair = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    {
      sku: "TPV-001-BAD",
      price: 100000,
      attributes: [
        { attributeId: colorAttributeId, attributeValueId: volume18LValueId },
      ],
    },
    adminToken
  );
  expect(
    "attributeValueId không thuộc attributeId bị chặn",
    mismatchedPair.status === 400,
    `status=${mismatchedPair.status}, message=${mismatchedPair.json.message}`
  );

  const createV2 = await call(
    "POST",
    `/api/admin/products/${p1Id}/variants`,
    {
      sku: V2_SKU,
      price: 950000,
      stockQuantity: 10,
      attributes: [
        { attributeId: colorAttributeId, attributeValueId: blackValueId },
      ],
    },
    adminToken
  );
  const v2Id = createV2.json.data?.id as string;

  const productAfterV2 = await call("GET", `/api/products/${p1Id}`);
  expect(
    "Tạo V2 thành công và min/max Price cập nhật 850000/950000",
    createV2.status === 201 &&
      v2Id !== "" &&
      productAfterV2.json.data?.minPrice === 850000 &&
      productAfterV2.json.data?.maxPrice === 950000,
    `create=${createV2.status}, min=${productAfterV2.json.data?.minPrice}, max=${productAfterV2.json.data?.maxPrice}`
  );

  const adminList = await call(
    "GET",
    `/api/admin/products/${p1Id}/variants`,
    undefined,
    adminToken
  );
  const adminVariants = Array.isArray(adminList.json.data)
    ? adminList.json.data
    : [];
  expect(
    "Admin list trả cả biến thể đang ẩn",
    adminList.status === 200 && adminVariants.length === 2,
    `status=${adminList.status}, variants=${adminVariants.length}`
  );

  const updateStock = await call(
    "PATCH",
    `/api/admin/variants/${v1Id}/stock`,
    { stockQuantity: 15 },
    adminToken
  );
  expect(
    "PATCH stock cập nhật tồn kho V1 xuống 15",
    updateStock.status === 200 && updateStock.json.data?.stockQuantity === 15,
    `status=${updateStock.status}, stock=${updateStock.json.data?.stockQuantity}`
  );

  const updatePrice = await call(
    "PUT",
    `/api/admin/variants/${v1Id}`,
    { price: 750000 },
    adminToken
  );
  const productAfterPriceUpdate = await call("GET", `/api/products/${p1Id}`);
  expect(
    "PUT giá V1 750000 và minPrice tự đồng bộ",
    updatePrice.status === 200 &&
      updatePrice.json.data?.price === 750000 &&
      productAfterPriceUpdate.json.data?.minPrice === 750000,
    `put=${updatePrice.status}, min=${productAfterPriceUpdate.json.data?.minPrice}`
  );

  const toggleV2Off = await call(
    "PATCH",
    `/api/admin/variants/${v2Id}/status`,
    { isActive: false },
    adminToken
  );
  const publicListAfterHide = await call(
    "GET",
    `/api/products/${p1Id}/variants`
  );
  const visibleIdsAfterHide = Array.isArray(publicListAfterHide.json.data)
    ? publicListAfterHide.json.data.map((item: any) => item.id)
    : [];
  const productAfterHide = await call("GET", `/api/products/${p1Id}`);
  expect(
    "Tắt isActive V2 thì public ẩn biến thể và maxPrice về 750000",
    toggleV2Off.status === 200 &&
      toggleV2Off.json.data?.isActive === false &&
      !visibleIdsAfterHide.includes(v2Id) &&
      productAfterHide.json.data?.maxPrice === 750000,
    `toggle=${toggleV2Off.status}, visible=${visibleIdsAfterHide.length}, max=${productAfterHide.json.data?.maxPrice}`
  );

  const toggleV2On = await call(
    "PATCH",
    `/api/admin/variants/${v2Id}/status`,
    { isActive: true },
    adminToken
  );
  const publicListAfterShow = await call(
    "GET",
    `/api/products/${p1Id}/variants`
  );
  const visibleIdsAfterShow = Array.isArray(publicListAfterShow.json.data)
    ? publicListAfterShow.json.data.map((item: any) => item.id)
    : [];
  expect(
    "Bật lại isActive V2 thì public list đủ 2 biến thể",
    toggleV2On.status === 200 &&
      visibleIdsAfterShow.includes(v1Id) &&
      visibleIdsAfterShow.includes(v2Id),
    `toggle=${toggleV2On.status}, visible=${visibleIdsAfterShow.length}`
  );

  await OrderItem.create({
    orderId: new mongoose.Types.ObjectId(),
    productId: p1Id,
    variantId: v1Id,
    productName: "Nồi Cơm Điện Test Variant TPV1",
    productSku: P1_SKU,
    variantSku: V1_SKU,
    quantity: 1,
    unitPrice: 750000,
    discountAmount: 0,
    totalPrice: 750000,
  });

  const deleteV1WithOrder = await call(
    "DELETE",
    `/api/admin/variants/${v1Id}`,
    undefined,
    adminToken
  );
  expect(
    "Chặn xóa biến thể đã phát sinh trong đơn hàng",
    deleteV1WithOrder.status === 400,
    `status=${deleteV1WithOrder.status}, message=${deleteV1WithOrder.json.message}`
  );

  const deleteV2 = await call(
    "DELETE",
    `/api/admin/variants/${v2Id}`,
    undefined,
    adminToken
  );
  const v2Remaining = await ProductVariant.countDocuments({ _id: v2Id });
  const productAfterDeleteV2 = await call("GET", `/api/products/${p1Id}`);
  expect(
    "Xóa biến thể chưa có đơn thành công và maxPrice giữ 750000",
    deleteV2.status === 200 &&
      v2Remaining === 0 &&
      productAfterDeleteV2.json.data?.maxPrice === 750000,
    `delete=${deleteV2.status}, v2Remaining=${v2Remaining}, max=${productAfterDeleteV2.json.data?.maxPrice}`
  );

  const v1BeforeClean = await ProductVariant.findOne({ sku: V1_SKU });

  await preClean();

  const [
    leftoverProducts,
    leftoverVariants,
    leftoverVariantAttrs,
    leftoverOrderItems,
    leftoverCategories,
    leftoverBrands,
    leftoverAttributes,
    leftoverAttributeValues,
  ] = await Promise.all([
    Product.countDocuments({ sku: { $in: ALL_SKUS } }),
    ProductVariant.countDocuments({ sku: { $in: ALL_VARIANT_SKUS } }),
    VariantAttribute.countDocuments({
      $or: [
        { variantId: v1BeforeClean ? v1BeforeClean._id : new mongoose.Types.ObjectId() },
        { attributeId: colorAttributeId },
        { attributeId: volumeAttributeId },
      ],
    }),
    OrderItem.countDocuments({ productSku: { $in: ALL_SKUS } }),
    Category.countDocuments({ slug: CATEGORY_SLUG }),
    Brand.countDocuments({ slug: BRAND_SLUG }),
    Attribute.countDocuments({ slug: { $in: ALL_ATTRIBUTE_SLUGS } }),
    AttributeValue.countDocuments({ slug: { $in: ALL_VALUE_SLUGS } }),
  ]);

  expect(
    "Dọn dữ liệu test sạch sẽ",
    leftoverProducts === 0 &&
      leftoverVariants === 0 &&
      leftoverVariantAttrs === 0 &&
      leftoverOrderItems === 0 &&
      leftoverCategories === 0 &&
      leftoverBrands === 0 &&
      leftoverAttributes === 0 &&
      leftoverAttributeValues === 0,
    `products=${leftoverProducts}, variants=${leftoverVariants}, variantAttrs=${leftoverVariantAttrs}, orderItems=${leftoverOrderItems}, categories=${leftoverCategories}, brands=${leftoverBrands}, attributes=${leftoverAttributes}, attributeValues=${leftoverAttributeValues}`
  );

  console.log("\n========================================");
  console.log(`PRODUCT VARIANT TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
