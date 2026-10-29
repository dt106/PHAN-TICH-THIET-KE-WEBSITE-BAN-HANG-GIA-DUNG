import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Category from "../src/models/Category.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-media-category";
const CATEGORY_NAME = "Test Media Category";
const PRODUCT_SKU = "TPM-001";
const PRODUCT_NAME = "Nồi Cơm Điện Sunhouse TPM1";

const MEDIA_1_URL = "http://cdn.local/tpm-1.jpg";
const MEDIA_2_URL = "http://cdn.local/tpm-2.jpg";
const MEDIA_3_URL = "http://cdn.local/tpm-3.jpg";
const MEDIA_4_URL = "http://cdn.local/tpm-4.jpg";
const MEDIA_5_URL = "http://cdn.local/tpm-5.jpg";
const MEDIA_VIDEO_URL = "http://cdn.local/tpm-video.mp4";

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

  await Promise.all([
    ProductMedia.deleteMany({ productId: { $in: productIds } }),
    Product.deleteMany({ sku: PRODUCT_SKU }),
    Category.deleteMany({ slug: CATEGORY_SLUG }),
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

  const fakeProductId = new mongoose.Types.ObjectId().toString();

  const noAuthCreate = await call(
    "POST",
    `/api/admin/products/${fakeProductId}/media`,
    { mediaType: "image", mediaUrl: MEDIA_1_URL }
  );
  expect(
    "RBAC: thêm media không có token bị chặn",
    noAuthCreate.status === 401,
    `status=${noAuthCreate.status}`
  );

  const customerCreate = await call(
    "POST",
    `/api/admin/products/${fakeProductId}/media`,
    { mediaType: "image", mediaUrl: MEDIA_1_URL },
    customerToken
  );
  expect(
    "RBAC: customer không được thêm media",
    customerCreate.status === 403,
    `status=${customerCreate.status}`
  );

  const noAuthDelete = await call("DELETE", `/api/admin/media/${fakeProductId}`);
  expect(
    "RBAC: xóa media không có token bị chặn",
    noAuthDelete.status === 401,
    `status=${noAuthDelete.status}`
  );

  const categoryRes = await call(
    "POST",
    "/api/admin/categories",
    { name: CATEGORY_NAME },
    adminToken
  );
  const categoryId = categoryRes.json.data?.id as string;

  const productRes = await call(
    "POST",
    "/api/admin/products",
    {
      name: PRODUCT_NAME,
      sku: PRODUCT_SKU,
      categoryId,
      basePrice: 1200000,
    },
    adminToken
  );
  const productId = productRes.json.data?.id as string;
  expect(
    "Tạo category + sản phẩm TPM-001 cho luồng media thành công",
    productRes.status === 201 && Boolean(productId),
    `product=${productRes.status}, productId=${productId}`
  );

  const adminMediaPath = `/api/admin/products/${productId}/media`;
  const publicMediaPath = `/api/products/${productId}/media`;

  const missingUrl = await call(
    "POST",
    adminMediaPath,
    { mediaType: "image" },
    adminToken
  );
  expect(
    "Validate: thêm media thiếu mediaUrl trả 400",
    missingUrl.status === 400,
    `status=${missingUrl.status}`
  );

  const badMediaType = await call(
    "POST",
    adminMediaPath,
    { mediaType: "gif", mediaUrl: MEDIA_1_URL },
    adminToken
  );
  expect(
    "Validate: mediaType 'gif' không hợp lệ trả 400",
    badMediaType.status === 400,
    `status=${badMediaType.status}`
  );

  const badProductId = await call(
    "POST",
    "/api/admin/products/not-a-mongo-id/media",
    { mediaType: "image", mediaUrl: MEDIA_1_URL },
    adminToken
  );
  expect(
    "Validate: productId sai định dạng trả 400",
    badProductId.status === 400,
    `status=${badProductId.status}`
  );

  const createMedia1 = await call(
    "POST",
    adminMediaPath,
    { mediaType: "image", mediaUrl: MEDIA_1_URL },
    adminToken
  );
  const media1Id = createMedia1.json.data?.id as string;
  expect(
    "Ảnh đầu tiên tự động thành ảnh chính (isPrimary) với sortOrder 0",
    createMedia1.status === 201 &&
      createMedia1.json.data?.isPrimary === true &&
      createMedia1.json.data?.sortOrder === 0,
    `status=${createMedia1.status}, isPrimary=${createMedia1.json.data?.isPrimary}, sortOrder=${createMedia1.json.data?.sortOrder}`
  );

  const createMedia2 = await call(
    "POST",
    adminMediaPath,
    { mediaType: "image", mediaUrl: MEDIA_2_URL },
    adminToken
  );
  const media2Id = createMedia2.json.data?.id as string;
  expect(
    "Ảnh thứ hai không chiếm primary và sortOrder tự tăng 1",
    createMedia2.status === 201 &&
      createMedia2.json.data?.isPrimary === false &&
      createMedia2.json.data?.sortOrder === 1,
    `status=${createMedia2.status}, isPrimary=${createMedia2.json.data?.isPrimary}, sortOrder=${createMedia2.json.data?.sortOrder}`
  );

  const createMedia3 = await call(
    "POST",
    adminMediaPath,
    { mediaType: "image", mediaUrl: MEDIA_3_URL, isPrimary: true },
    adminToken
  );
  const media3Id = createMedia3.json.data?.id as string;
  const publicList3 = await call("GET", publicMediaPath);
  const list3 = Array.isArray(publicList3.json.data)
    ? publicList3.json.data
    : [];
  const othersNotPrimary3 = list3
    .filter((media: any) => media.id !== media3Id)
    .every((media: any) => media.isPrimary === false);
  expect(
    "Đặt isPrimary khi tạo: ảnh 3 lên đầu public, các ảnh khác mất primary",
    createMedia3.status === 201 &&
      createMedia3.json.data?.isPrimary === true &&
      publicList3.status === 200 &&
      list3[0]?.id === media3Id &&
      othersNotPrimary3,
    `create=${createMedia3.status}, list=${publicList3.status}, first=${list3[0]?.mediaUrl}`
  );

  const createBatch = await call(
    "POST",
    `${adminMediaPath}/batch`,
    {
      mediaList: [
        { mediaType: "image", mediaUrl: MEDIA_4_URL },
        { mediaType: "image", mediaUrl: MEDIA_5_URL },
      ],
    },
    adminToken
  );
  const batchList = Array.isArray(createBatch.json.data)
    ? createBatch.json.data
    : [];
  const media4Id = batchList[0]?.id as string;
  const media5Id = batchList[1]?.id as string;
  expect(
    "Batch thêm 2 ảnh thành công với sortOrder tự tăng tiếp (3, 4)",
    createBatch.status === 201 &&
      batchList.length === 2 &&
      batchList[0]?.sortOrder === 3 &&
      batchList[1]?.sortOrder === 4,
    `status=${createBatch.status}, count=${batchList.length}, sortOrders=${batchList
      .map((media: any) => media.sortOrder)
      .join(",")}`
  );

  const createVideo = await call(
    "POST",
    adminMediaPath,
    { mediaType: "video", mediaUrl: MEDIA_VIDEO_URL },
    adminToken
  );
  const videoId = createVideo.json.data?.id as string;
  const setVideoPrimary = await call(
    "PATCH",
    `/api/admin/media/${videoId}/primary`,
    undefined,
    adminToken
  );
  expect(
    "Video không tự thành primary và chặn đặt video làm ảnh chính",
    createVideo.status === 201 &&
      createVideo.json.data?.isPrimary === false &&
      setVideoPrimary.status === 400 &&
      String(setVideoPrimary.json.message).includes("hình ảnh"),
    `create=${createVideo.status}, patch=${setVideoPrimary.status}, message=${setVideoPrimary.json.message}`
  );

  const setMedia2Primary = await call(
    "PATCH",
    `/api/admin/media/${media2Id}/primary`,
    undefined,
    adminToken
  );
  const publicListAfterPrimary = await call("GET", publicMediaPath);
  const listAfterPrimary = Array.isArray(publicListAfterPrimary.json.data)
    ? publicListAfterPrimary.json.data
    : [];
  const media2After = listAfterPrimary.find(
    (media: any) => media.id === media2Id
  );
  const media3After = listAfterPrimary.find(
    (media: any) => media.id === media3Id
  );
  expect(
    "PATCH primary: ảnh 2 thành ảnh chính, ảnh 3 mất primary",
    setMedia2Primary.status === 200 &&
      media2After?.isPrimary === true &&
      media3After?.isPrimary === false,
    `patch=${setMedia2Primary.status}, media2=${media2After?.isPrimary}, media3=${media3After?.isPrimary}`
  );

  const publicListBeforeSort = await call("GET", publicMediaPath);
  const listBeforeSort = Array.isArray(publicListBeforeSort.json.data)
    ? publicListBeforeSort.json.data
    : [];
  const reversedSortOrders = [...listBeforeSort]
    .reverse()
    .map((media: any, index: number) => ({ id: media.id, sortOrder: index }));
  const expectedSortOrder = new Map<string, number>();
  listBeforeSort.forEach((media: any, index: number) => {
    expectedSortOrder.set(media.id, listBeforeSort.length - 1 - index);
  });
  const updateSortOrder = await call(
    "PUT",
    `${adminMediaPath}/sort-order`,
    { sortOrders: reversedSortOrders },
    adminToken
  );
  const publicListAfterSort = await call("GET", publicMediaPath);
  const listAfterSort = Array.isArray(publicListAfterSort.json.data)
    ? publicListAfterSort.json.data
    : [];
  const sortApplied = listAfterSort.every(
    (media: any) => media.sortOrder === expectedSortOrder.get(media.id)
  );
  expect(
    "Cập nhật thứ tự media đảo ngược và public áp dụng sortOrder mới",
    updateSortOrder.status === 200 &&
      publicListAfterSort.status === 200 &&
      listAfterSort.length === listBeforeSort.length &&
      sortApplied,
    `put=${updateSortOrder.status}, list=${publicListAfterSort.status}, sortOrders=${listAfterSort
      .map((media: any) => media.sortOrder)
      .join(",")}`
  );

  const updateAltText = await call(
    "PUT",
    `/api/admin/media/${media1Id}`,
    { altText: "Ảnh nội cơm" },
    adminToken
  );
  expect(
    "Cập nhật altText của media thành công",
    updateAltText.status === 200 &&
      updateAltText.json.data?.altText === "Ảnh nội cơm",
    `status=${updateAltText.status}, altText=${updateAltText.json.data?.altText}`
  );

  const deletePrimary = await call(
    "DELETE",
    `/api/admin/media/${media2Id}`,
    undefined,
    adminToken
  );
  const publicListAfterDelete = await call("GET", publicMediaPath);
  const listAfterDelete = Array.isArray(publicListAfterDelete.json.data)
    ? publicListAfterDelete.json.data
    : [];
  const inheritedPrimary = listAfterDelete.find(
    (media: any) => media.isPrimary === true
  );
  expect(
    "Xóa ảnh chính: một ảnh khác tự động kế thừa primary",
    deletePrimary.status === 200 &&
      listAfterDelete.length === 5 &&
      Boolean(inheritedPrimary) &&
      inheritedPrimary?.mediaUrl === MEDIA_5_URL,
    `delete=${deletePrimary.status}, remaining=${listAfterDelete.length}, primary=${inheritedPrimary?.mediaUrl}`
  );

  const remainingIds = listAfterDelete
    .filter((media: any) => media.id !== inheritedPrimary?.id)
    .map((media: any) => media.id);
  const deleteBatchKeepOne = await call(
    "DELETE",
    adminMediaPath,
    { mediaIds: remainingIds },
    adminToken
  );
  const publicListKeepOne = await call("GET", publicMediaPath);
  const listKeepOne = Array.isArray(publicListKeepOne.json.data)
    ? publicListKeepOne.json.data
    : [];
  expect(
    "Batch xóa nhiều media: ảnh cuối cùng còn lại tự giữ primary",
    deleteBatchKeepOne.status === 200 &&
      listKeepOne.length === 1 &&
      listKeepOne[0]?.isPrimary === true &&
      listKeepOne[0]?.mediaUrl === MEDIA_5_URL,
    `delete=${deleteBatchKeepOne.status}, remaining=${listKeepOne.length}, primary=${listKeepOne[0]?.isPrimary}`
  );

  const deleteLastMedia = await call(
    "DELETE",
    adminMediaPath,
    { mediaIds: [listKeepOne[0].id] },
    adminToken
  );
  const publicListEmpty = await call("GET", publicMediaPath);
  const listEmpty = Array.isArray(publicListEmpty.json.data)
    ? publicListEmpty.json.data
    : null;
  expect(
    "Xóa nốt media cuối cùng: danh sách public rỗng",
    deleteLastMedia.status === 200 &&
      publicListEmpty.status === 200 &&
      Array.isArray(listEmpty) &&
      listEmpty.length === 0,
    `delete=${deleteLastMedia.status}, list=${publicListEmpty.status}, count=${listEmpty?.length}`
  );

  await preClean();

  const remainingProducts = await Product.countDocuments({ sku: PRODUCT_SKU });
  const remainingCategories = await Category.countDocuments({
    slug: CATEGORY_SLUG,
  });
  const remainingMedia =
    productId && mongoose.Types.ObjectId.isValid(productId)
      ? await ProductMedia.countDocuments({ productId })
      : 0;
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingProducts === 0 && remainingCategories === 0 && remainingMedia === 0,
    `products=${remainingProducts}, categories=${remainingCategories}, media=${remainingMedia}`
  );

  console.log("\n========================================");
  console.log(`PRODUCT MEDIA TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
