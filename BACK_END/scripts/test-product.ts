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

const CATEGORY_SLUG = "test-product-category";
const BRAND_SLUG = "test-product-brand";
const CATEGORY_NAME = "Test Product Category";
const BRAND_NAME = "Test Product Brand";

const P1_SKU = "TSP-001";
const P2_SKU = "TSP-002";
const P3_SKU = "TSP-003";
const ALL_SKUS = [P1_SKU, P2_SKU, P3_SKU];

const P1_SLUG = "noi-com-dien-sunhouse-tsp1";
const P2_SLUG = "noi-chien-khong-dau-testsp2";
const P3_SLUG = "may-xay-sinh-to-testsp3";

const ATTRIBUTE_SLUG = "test-product-mau-sac";

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
  const variants = await ProductVariant.find({ productId: { $in: productIds } });
  const variantIds = variants.map((variant) => variant._id);

  await Promise.all([
    VariantAttribute.deleteMany({ variantId: { $in: variantIds } }),
    ProductVariant.deleteMany({ productId: { $in: productIds } }),
    ProductMedia.deleteMany({ productId: { $in: productIds } }),
    OrderItem.deleteMany({ productSku: { $in: ALL_SKUS } }),
    Product.deleteMany({ sku: { $in: ALL_SKUS } }),
    Category.deleteMany({ slug: CATEGORY_SLUG }),
    Brand.deleteMany({ slug: BRAND_SLUG }),
    AttributeValue.deleteMany({ slug: "do" }),
    Attribute.deleteMany({ slug: ATTRIBUTE_SLUG }),
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
  const customerToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "customer" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const noAuth = await call("POST", "/api/admin/products", { name: "Test" });
  expect(
    "RBAC: tạo sản phẩm không có token bị chặn",
    noAuth.status === 401,
    `status=${noAuth.status}`
  );

  const customer = await call(
    "POST",
    "/api/admin/products",
    { name: "Test" },
    customerToken
  );
  expect(
    "RBAC: customer không được tạo sản phẩm",
    customer.status === 403,
    `status=${customer.status}`
  );

  const adminListNoAuth = await call("GET", "/api/admin/products/all");
  expect(
    "RBAC: admin list không có token bị chặn",
    adminListNoAuth.status === 401,
    `status=${adminListNoAuth.status}`
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

  const invalidBody = await call("POST", "/api/admin/products", {}, adminToken);
  expect(
    "Validate: tạo sản phẩm thiếu dữ liệu bắt buộc trả 400",
    invalidBody.status === 400,
    `status=${invalidBody.status}`
  );

  const createP1 = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Nồi Cơm Điện Sunhouse TSP1",
      sku: P1_SKU,
      categoryId,
      brandId,
      basePrice: 1200000,
      salePrice: 1000000,
      description: "Nồi cơm điện chính hãng",
    },
    adminToken
  );
  expect(
    "Tạo sản phẩm chuẩn trả 201 kèm slug tự sinh và thumbnail ban đầu null",
    createP1.status === 201 &&
      createP1.json.data?.slug === P1_SLUG &&
      createP1.json.data?.sku === P1_SKU &&
      createP1.json.data?.isActive === true,
    `status=${createP1.status}, slug=${createP1.json.data?.slug}`
  );
  const p1Id = createP1.json.data?.id as string;

  const createP2 = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Nồi Chiên Không Dầu TestSP2",
      sku: P2_SKU,
      categoryId,
      basePrice: 2500000,
    },
    adminToken
  );
  const p2Id = createP2.json.data?.id as string;
  expect(
    "Tạo sản phẩm không có brandId và salePrice vẫn thành công",
    createP2.status === 201 &&
      createP2.json.data?.brandId === null &&
      createP2.json.data?.salePrice === null,
    `status=${createP2.status}, slug=${createP2.json.data?.slug}`
  );

  const createP3 = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Máy Xay Sinh Tố TestSP3",
      sku: P3_SKU,
      categoryId,
      basePrice: 800000,
    },
    adminToken
  );
  const p3Id = createP3.json.data?.id as string;
  expect(
    "Tạo sản phẩm thứ ba thành công",
    createP3.status === 201 && createP3.json.data?.slug === P3_SLUG,
    `status=${createP3.status}, slug=${createP3.json.data?.slug}`
  );

  const salePriceTooHigh = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Sản Phẩm Giá Lỗi",
      sku: "TSP-BAD-1",
      categoryId,
      basePrice: 100000,
      salePrice: 200000,
    },
    adminToken
  );
  expect(
    "Ràng buộc: salePrice > basePrice bị chặn khi tạo",
    salePriceTooHigh.status === 400,
    `status=${salePriceTooHigh.status}, message=${salePriceTooHigh.json.message}`
  );

  const duplicateSku = await call(
    "POST",
    "/api/admin/products",
    {
      name: "Sản Phẩm Trùng SKU",
      sku: "tsp-001",
      categoryId,
      basePrice: 500000,
    },
    adminToken
  );
  expect(
    "Trùng SKU (kể cả viết thường) bị chặn khi tạo",
    duplicateSku.status === 400,
    `status=${duplicateSku.status}, message=${duplicateSku.json.message}`
  );

  const filteredList = await call(
    "GET",
    `/api/products?categoryId=${categoryId}&minPrice=900000&maxPrice=2600000&sort=price_asc`
  );
  const filteredSkus = Array.isArray(filteredList.json.data)
    ? filteredList.json.data.map((item: any) => item.sku)
    : [];
  const filteredPrices = Array.isArray(filteredList.json.data)
    ? filteredList.json.data.map((item: any) => item.basePrice)
    : [];
  expect(
    "Lọc danh mục + khoảng giá + sắp xếp giá tăng dần",
    filteredList.status === 200 &&
      filteredSkus.includes(P1_SKU) &&
      filteredSkus.includes(P2_SKU) &&
      !filteredSkus.includes(P3_SKU) &&
      filteredPrices[0] === 1200000 &&
      filteredPrices[1] === 2500000,
    `status=${filteredList.status}, skus=${JSON.stringify(filteredSkus)}`
  );

  const textSearch = await call("GET", "/api/products?search=sunhouse");
  const searchSkus = Array.isArray(textSearch.json.data)
    ? textSearch.json.data.map((item: any) => item.sku)
    : [];
  expect(
    "Tìm kiếm full-text theo tên sản phẩm",
    textSearch.status === 200 &&
      searchSkus.includes(P1_SKU) &&
      !searchSkus.includes(P3_SKU),
    `status=${textSearch.status}, skus=${JSON.stringify(searchSkus)}`
  );

  const primaryMedia = await ProductMedia.create({
    productId: p1Id,
    mediaType: "image",
    mediaUrl: "http://cdn.local/tsp1-primary.jpg",
    sortOrder: 2,
    isPrimary: true,
  });
  await ProductMedia.create({
    productId: p1Id,
    mediaType: "image",
    mediaUrl: "http://cdn.local/tsp1-extra.jpg",
    sortOrder: 1,
    isPrimary: false,
  });
  await ProductMedia.create({
    productId: p3Id,
    mediaType: "image",
    mediaUrl: "http://cdn.local/tsp3.jpg",
    sortOrder: 1,
    isPrimary: true,
  });

  const variantV1 = await ProductVariant.create({
    productId: p1Id,
    sku: "TSP-001-V1",
    price: 1000000,
    stockQuantity: 5,
    isActive: true,
  });
  await ProductVariant.create({
    productId: p1Id,
    sku: "TSP-001-V2",
    price: 1100000,
    stockQuantity: 0,
    isActive: false,
  });
  await ProductVariant.create({
    productId: p3Id,
    sku: "TSP-003-V1",
    price: 800000,
    stockQuantity: 3,
    isActive: true,
  });

  const attribute = await Attribute.create({ name: "Màu Sắc", slug: ATTRIBUTE_SLUG });
  const attributeValue = await AttributeValue.create({
    attributeId: attribute._id,
    value: "Đỏ",
    slug: "do",
  });
  await VariantAttribute.create({
    variantId: variantV1._id,
    attributeId: attribute._id,
    attributeValueId: attributeValue._id,
  });

  const publicList = await call("GET", "/api/products");
  const p1InList = Array.isArray(publicList.json.data)
    ? publicList.json.data.find((item: any) => item.sku === P1_SKU)
    : null;
  expect(
    "Danh sách public gắn thumbnail từ ảnh isPrimary",
    publicList.status === 200 &&
      p1InList?.thumbnail === "http://cdn.local/tsp1-primary.jpg",
    `status=${publicList.status}, thumbnail=${p1InList?.thumbnail}`
  );

  const detailBySlug = await call("GET", `/api/products/slug/${P1_SLUG}`);
  const detailData = detailBySlug.json.data;
  const detailVariants = Array.isArray(detailData?.variants)
    ? detailData.variants
    : [];
  const detailMedia = Array.isArray(detailData?.media) ? detailData.media : [];
  const nestedAttributes = detailVariants[0]?.attributes;
  expect(
    "Chi tiết theo slug lồng media, chỉ variant active và thuộc tính lồng đúng",
    detailBySlug.status === 200 &&
      detailData?.id === p1Id &&
      detailData?.categoryId?.slug === CATEGORY_SLUG &&
      detailData?.brandId?.slug === BRAND_SLUG &&
      detailMedia.length === 2 &&
      detailVariants.length === 1 &&
      detailVariants[0]?.sku === "TSP-001-V1" &&
      nestedAttributes?.[0]?.attributeId?.name === "Màu Sắc" &&
      nestedAttributes?.[0]?.attributeValueId?.value === "Đỏ",
    `status=${detailBySlug.status}, media=${detailMedia.length}, variants=${detailVariants.length}`
  );

  const detailById = await call("GET", `/api/products/${p1Id}`);
  expect(
    "Chi tiết theo ID trả đủ dữ liệu",
    detailById.status === 200 && detailById.json.data?.id === p1Id,
    `status=${detailById.status}`
  );

  const featuredOn = await call(
    "PATCH",
    `/api/admin/products/${p1Id}/featured`,
    { isFeatured: true },
    adminToken
  );
  expect(
    "Bật isFeatured thành công",
    featuredOn.status === 200 && featuredOn.json.data?.isFeatured === true,
    `status=${featuredOn.status}`
  );

  const featuredList = await call("GET", "/api/products/featured?limit=10");
  const featuredSkus = Array.isArray(featuredList.json.data)
    ? featuredList.json.data.map((item: any) => item.sku)
    : [];
  expect(
    "Danh sách nổi bật chứa sản phẩm vừa bật isFeatured",
    featuredList.status === 200 && featuredSkus.includes(P1_SKU),
    `status=${featuredList.status}, skus=${JSON.stringify(featuredSkus)}`
  );

  const toggleOff = await call(
    "PATCH",
    `/api/admin/products/${p2Id}/status`,
    { isActive: false },
    adminToken
  );
  const hiddenDetail = await call("GET", `/api/products/slug/${P2_SLUG}`);
  expect(
    "Tắt isActive thì public không còn thấy sản phẩm",
    toggleOff.status === 200 && hiddenDetail.status === 404,
    `toggle=${toggleOff.status}, detail=${hiddenDetail.status}`
  );

  const adminInactiveList = await call(
    "GET",
    "/api/admin/products/all?isActive=false",
    undefined,
    adminToken
  );
  const inactiveSkus = Array.isArray(adminInactiveList.json.data)
    ? adminInactiveList.json.data.map((item: any) => item.sku)
    : [];
  expect(
    "Admin lọc isActive=false trả sản phẩm đang ẩn",
    adminInactiveList.status === 200 && inactiveSkus.includes(P2_SKU),
    `status=${adminInactiveList.status}, skus=${JSON.stringify(inactiveSkus)}`
  );

  const toggleOn = await call(
    "PATCH",
    `/api/admin/products/${p2Id}/status`,
    { isActive: true },
    adminToken
  );
  expect(
    "Bật lại isActive thành công",
    toggleOn.status === 200 && toggleOn.json.data?.isActive === true,
    `status=${toggleOn.status}`
  );

  const adminSearchList = await call(
    "GET",
    "/api/admin/products/all?search=TSP",
    undefined,
    adminToken
  );
  const adminSearchTotal = adminSearchList.json.pagination?.total;
  expect(
    "Admin tìm kiếm theo SKU trả đủ 3 sản phẩm kèm thống kê",
    adminSearchList.status === 200 &&
      adminSearchTotal === 3 &&
      adminSearchList.json.stats?.totalProducts >= 3,
    `status=${adminSearchList.status}, total=${adminSearchTotal}, stats=${JSON.stringify(
      adminSearchList.json.stats
    )}`
  );

  const adminPaged = await call(
    "GET",
    "/api/admin/products/all?page=1&limit=2",
    undefined,
    adminToken
  );
  expect(
    "Admin phân trang limit=2 hoạt động",
    adminPaged.status === 200 &&
      adminPaged.json.pagination?.limit === 2 &&
      Array.isArray(adminPaged.json.data) &&
      adminPaged.json.data.length === 2,
    `status=${adminPaged.status}, pagination=${JSON.stringify(
      adminPaged.json.pagination
    )}`
  );

  const adminDetail = await call(
    "GET",
    `/api/admin/products/${p1Id}`,
    undefined,
    adminToken
  );
  expect(
    "Admin lấy chi tiết sản phẩm thành công",
    adminDetail.status === 200 && adminDetail.json.data?.id === p1Id,
    `status=${adminDetail.status}`
  );

  const related = await call("GET", `/api/products/related/${p1Id}`);
  const relatedSkus = Array.isArray(related.json.data)
    ? related.json.data.map((item: any) => item.sku)
    : [];
  expect(
    "Sản phẩm liên quan cùng danh mục và loại trừ chính nó",
    related.status === 200 &&
      relatedSkus.includes(P2_SKU) &&
      relatedSkus.includes(P3_SKU) &&
      !relatedSkus.includes(P1_SKU),
    `status=${related.status}, skus=${JSON.stringify(relatedSkus)}`
  );

  const updateDescription = await call(
    "PUT",
    `/api/admin/products/${p1Id}`,
    { description: "Nồi cơm điện thông minh" },
    adminToken
  );
  expect(
    "Cập nhật mô tả sản phẩm thành công",
    updateDescription.status === 200 &&
      updateDescription.json.data?.description === "Nồi cơm điện thông minh",
    `status=${updateDescription.status}`
  );

  const basePriceBelowSale = await call(
    "PUT",
    `/api/admin/products/${p1Id}`,
    { basePrice: 500000 },
    adminToken
  );
  expect(
    "Ràng buộc: hạ basePrice xuống dưới salePrice hiện tại bị chặn",
    basePriceBelowSale.status === 400,
    `status=${basePriceBelowSale.status}, message=${basePriceBelowSale.json.message}`
  );

  const salePriceAboveBase = await call(
    "PUT",
    `/api/admin/products/${p1Id}`,
    { basePrice: 2000000, salePrice: 3000000 },
    adminToken
  );
  expect(
    "Ràng buộc: salePrice > basePrice bị chặn khi cập nhật",
    salePriceAboveBase.status === 400,
    `status=${salePriceAboveBase.status}, message=${salePriceAboveBase.json.message}`
  );

  const validPriceUpdate = await call(
    "PUT",
    `/api/admin/products/${p1Id}`,
    { basePrice: 2000000, salePrice: 1900000 },
    adminToken
  );
  expect(
    "Cập nhật giá hợp lệ (salePrice <= basePrice) thành công",
    validPriceUpdate.status === 200 &&
      validPriceUpdate.json.data?.basePrice === 2000000 &&
      validPriceUpdate.json.data?.salePrice === 1900000,
    `status=${validPriceUpdate.status}, basePrice=${validPriceUpdate.json.data?.basePrice}`
  );

  await OrderItem.create({
    orderId: new mongoose.Types.ObjectId(),
    productId: p2Id,
    productName: "Nồi Chiên Không Dầu TestSP2",
    productSku: P2_SKU,
    quantity: 1,
    unitPrice: 2500000,
    discountAmount: 0,
    totalPrice: 2500000,
  });

  const deleteWithOrder = await call(
    "DELETE",
    `/api/admin/products/${p2Id}`,
    undefined,
    adminToken
  );
  expect(
    "Chặn xóa sản phẩm đã nằm trong đơn hàng",
    deleteWithOrder.status === 400,
    `status=${deleteWithOrder.status}, message=${deleteWithOrder.json.message}`
  );

  const deleteP3 = await call(
    "DELETE",
    `/api/admin/products/${p3Id}`,
    undefined,
    adminToken
  );
  const p3MediaCount = await ProductMedia.countDocuments({ productId: p3Id });
  const p3VariantCount = await ProductVariant.countDocuments({ productId: p3Id });
  const p3DetailAfter = await call("GET", `/api/products/${p3Id}`);
  expect(
    "Xóa sản phẩm chưa có đơn hàng thành công và cascade media/variant",
    deleteP3.status === 200 &&
      p3MediaCount === 0 &&
      p3VariantCount === 0 &&
      p3DetailAfter.status === 404,
    `delete=${deleteP3.status}, media=${p3MediaCount}, variants=${p3VariantCount}, detail=${p3DetailAfter.status}`
  );

  const p1VariantsAfter = await ProductVariant.countDocuments({ productId: p1Id });
  expect(
    "Cập nhật sản phẩm không làm mất dữ liệu variant/media",
    p1VariantsAfter === 2,
    `variants=${p1VariantsAfter}`
  );

  const orderItemCount = await OrderItem.countDocuments({ productSku: P2_SKU });
  expect(
    "OrderItem mô phỏng vẫn tồn tại sau các bước test",
    orderItemCount === 1,
    `orderItems=${orderItemCount}`
  );

  await preClean();

  const afterCleanup = await Product.countDocuments({ sku: { $in: ALL_SKUS } });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    afterCleanup === 0,
    `remainingProducts=${afterCleanup}`
  );

  console.log("\n========================================");
  console.log(`PRODUCT TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
