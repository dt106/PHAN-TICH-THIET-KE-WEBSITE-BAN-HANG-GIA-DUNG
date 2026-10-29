import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Cart from "../src/models/Cart.model";
import Category from "../src/models/Category.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import Wishlist from "../src/models/Wishlist.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-wishlist-category";
const SKU_ACTIVE = "WIS-001";
const SKU_INACTIVE = "WIS-002";
const MEDIA_PRIMARY = "http://cdn.local/wis-primary.jpg";

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

const userIdA = new mongoose.Types.ObjectId().toString();
const userIdB = new mongoose.Types.ObjectId().toString();

const userAToken = jwt.sign({ userId: userIdA, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const userBToken = jwt.sign({ userId: userIdB, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});

const testUserObjectIds = () => [
  new mongoose.Types.ObjectId(userIdA),
  new mongoose.Types.ObjectId(userIdB),
];

const preClean = async (): Promise<void> => {
  await Wishlist.deleteMany({ userId: { $in: testUserObjectIds() } });
  await Cart.deleteMany({ userId: { $in: testUserObjectIds() } });
  await ProductMedia.deleteMany({ mediaUrl: MEDIA_PRIMARY });
  await Product.deleteMany({ sku: { $in: [SKU_ACTIVE, SKU_INACTIVE] } });
  await Category.deleteMany({ slug: CATEGORY_SLUG });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Wishlist.syncIndexes();
  await preClean();

  const category = await Category.create({
    name: "Test Wishlist Category",
    slug: CATEGORY_SLUG,
  });

  const activeProduct = await Product.create({
    categoryId: category._id,
    name: "Máy Xay Sinh Tố Wishlist Test",
    slug: "may-xay-sinh-to-wishlist-test",
    sku: SKU_ACTIVE,
    basePrice: 800000,
    salePrice: 650000,
    minPrice: 650000,
    maxPrice: 650000,
    averageRating: 4.5,
    totalReviews: 12,
    isFeatured: true,
    isActive: true,
  });

  const inactiveProduct = await Product.create({
    categoryId: category._id,
    name: "Bàn Ủi Inactive Wishlist Test",
    slug: "ban-ui-inactive-wishlist-test",
    sku: SKU_INACTIVE,
    basePrice: 300000,
    isActive: false,
  });

  await ProductMedia.create({
    productId: activeProduct._id,
    mediaType: "image",
    mediaUrl: MEDIA_PRIMARY,
    isPrimary: true,
    sortOrder: 0,
  });

  const noToken = await call("GET", "/api/wishlist");
  expect(
    "GET /api/wishlist không kèm token bị chặn 401",
    noToken.status === 401,
    `status=${noToken.status}`
  );

  const addFirst = await call(
    "POST",
    "/api/wishlist",
    { productId: activeProduct._id.toString() },
    userAToken
  );
  const wishlistItemId = addFirst.json.data?.id as string;
  expect(
    "POST /api/wishlist thêm sản phẩm thành công 201",
    addFirst.status === 201 && wishlistItemId !== "",
    `status=${addFirst.status}, wishlistItemId=${wishlistItemId}`
  );

  const addDuplicate = await call(
    "POST",
    "/api/wishlist",
    { productId: activeProduct._id.toString() },
    userAToken
  );
  const totalRecords = await Wishlist.countDocuments({
    userId: new mongoose.Types.ObjectId(userIdA),
  });
  expect(
    "POST /api/wishlist thêm trùng là idempotent không phát sinh bản ghi rác",
    addDuplicate.status === 201 &&
      addDuplicate.json.data?.id === wishlistItemId &&
      totalRecords === 1,
    `status=${addDuplicate.status}, sameId=${addDuplicate.json.data?.id === wishlistItemId}, records=${totalRecords}`
  );

  const addInactive = await call(
    "POST",
    "/api/wishlist",
    { productId: inactiveProduct._id.toString() },
    userAToken
  );
  expect(
    "POST /api/wishlist sản phẩm inactive bị chặn 404",
    addInactive.status === 404,
    `status=${addInactive.status}`
  );

  const checkStatus = await call(
    "GET",
    `/api/wishlist/check/${activeProduct._id.toString()}`,
    undefined,
    userAToken
  );
  expect(
    "GET /api/wishlist/check/:productId trả isInWishlist true kèm id",
    checkStatus.status === 200 &&
      checkStatus.json.data?.isInWishlist === true &&
      checkStatus.json.data?.wishlistId === wishlistItemId,
    `status=${checkStatus.status}, isInWishlist=${checkStatus.json.data?.isInWishlist}`
  );

  const listView = await call("GET", "/api/wishlist", undefined, userAToken);
  const firstItem = Array.isArray(listView.json.data) ? listView.json.data[0] : null;
  expect(
    "GET /api/wishlist trả item kèm giá, ảnh chính, đánh giá",
    listView.status === 200 &&
      firstItem?.name === "Máy Xay Sinh Tố Wishlist Test" &&
      firstItem?.basePrice === 800000 &&
      firstItem?.salePrice === 650000 &&
      firstItem?.primaryImage === MEDIA_PRIMARY &&
      firstItem?.averageRating === 4.5 &&
      firstItem?.isFeatured === true,
    `name=${firstItem?.name}, image=${firstItem?.primaryImage}, rating=${firstItem?.averageRating}`
  );

  const crossDelete = await call(
    "DELETE",
    `/api/wishlist/${wishlistItemId}`,
    undefined,
    userBToken
  );
  const crossMove = await call(
    "POST",
    `/api/wishlist/${wishlistItemId}/move-to-cart`,
    {},
    userBToken
  );
  const stillExists = await Wishlist.findById(wishlistItemId);
  expect(
    "User B không thể xóa/move-to-cart item của User A (404)",
    crossDelete.status === 404 &&
      crossMove.status === 404 &&
      Boolean(stillExists),
    `delete=${crossDelete.status}, move=${crossMove.status}`
  );

  const moveToCart = await call(
    "POST",
    `/api/wishlist/${wishlistItemId}/move-to-cart`,
    { quantity: 2 },
    userAToken
  );
  const cartAfterMove = await call("GET", "/api/cart", undefined, userAToken);
  const wishlistAfterMove = await call("GET", "/api/wishlist", undefined, userAToken);
  expect(
    "POST move-to-cart tạo cartItem quantity 2 và xóa khỏi wishlist",
    moveToCart.status === 200 &&
      moveToCart.json.data?.quantity === 2 &&
      cartAfterMove.json.data?.totalQuantity === 2 &&
      Array.isArray(wishlistAfterMove.json.data) &&
      wishlistAfterMove.json.data.length === 0,
    `status=${moveToCart.status}, cartQty=${cartAfterMove.json.data?.totalQuantity}, wishlistLen=${wishlistAfterMove.json.data?.length}`
  );

  const reAdd = await call(
    "POST",
    "/api/wishlist",
    { productId: activeProduct._id.toString() },
    userAToken
  );
  const removeByProduct = await call(
    "DELETE",
    `/api/wishlist/product/${activeProduct._id.toString()}`,
    undefined,
    userAToken
  );
  const afterRemoveByProduct = await call("GET", "/api/wishlist", undefined, userAToken);
  expect(
    "DELETE /api/wishlist/product/:productId xóa theo product thành công",
    reAdd.status === 201 &&
      removeByProduct.status === 200 &&
      afterRemoveByProduct.json.data?.length === 0,
    `status=${removeByProduct.status}, len=${afterRemoveByProduct.json.data?.length}`
  );

  await call(
    "POST",
    "/api/wishlist",
    { productId: activeProduct._id.toString() },
    userAToken
  );
  const clearWishlist = await call("DELETE", "/api/wishlist", undefined, userAToken);
  const afterClear = await call("GET", "/api/wishlist", undefined, userAToken);
  expect(
    "DELETE /api/wishlist làm trống danh sách yêu thích",
    clearWishlist.status === 200 && afterClear.json.data?.length === 0,
    `status=${clearWishlist.status}, len=${afterClear.json.data?.length}`
  );

  await preClean();

  const remainingWishlists = await Wishlist.countDocuments({
    userId: { $in: testUserObjectIds() },
  });
  const remainingCarts = await Cart.countDocuments({
    userId: { $in: testUserObjectIds() },
  });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingWishlists === 0 && remainingCarts === 0,
    `wishlists=${remainingWishlists}, carts=${remainingCarts}`
  );

  console.log("\n========================================");
  console.log(`WISHLIST TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
