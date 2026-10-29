import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Cart from "../src/models/Cart.model";
import Category from "../src/models/Category.model";
import Coupon from "../src/models/Coupon.model";
import Product from "../src/models/Product.model";
import Wishlist from "../src/models/Wishlist.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-session4-category";
const SKU_MAIN = "SES4-001";
const COUPON_CODE = "SES4TET300";

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
const customerId = new mongoose.Types.ObjectId().toString();

const userAToken = jwt.sign({ userId: userIdA, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const userBToken = jwt.sign({ userId: userIdB, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const customerToken = jwt.sign({ userId: customerId, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});

const testUserObjectIds = () => [
  new mongoose.Types.ObjectId(userIdA),
  new mongoose.Types.ObjectId(userIdB),
  new mongoose.Types.ObjectId(customerId),
];

const preClean = async (): Promise<void> => {
  await Wishlist.deleteMany({ userId: { $in: testUserObjectIds() } });
  await Cart.deleteMany({ userId: { $in: testUserObjectIds() } });
  await Product.deleteMany({ sku: SKU_MAIN });
  await Category.deleteMany({ slug: CATEGORY_SLUG });
  await Coupon.deleteMany({ code: COUPON_CODE });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Wishlist.syncIndexes();
  await Cart.syncIndexes();
  await preClean();

  const category = await Category.create({
    name: "Test Session4 Category",
    slug: CATEGORY_SLUG,
  });

  const product = await Product.create({
    categoryId: category._id,
    name: "Máy Lọc Nước Ses4",
    slug: "may-loc-nuoc-ses4",
    sku: SKU_MAIN,
    basePrice: 300000,
    isActive: true,
  });

  await Coupon.create({
    code: COUPON_CODE,
    name: "Giảm 10% dịp khai trương Ses4",
    description: "Áp dụng cho đơn từ 100.000đ",
    discountType: "percentage",
    discountValue: 10,
    minimumOrderAmount: 100000,
  });

  console.log("--- KỊCH BẢN 1: WISHLIST -> CART ---");

  const addWishlist = await call(
    "POST",
    "/api/wishlist",
    { productId: product._id.toString() },
    userAToken
  );
  const wishlistId = addWishlist.json.data?.id as string;
  expect(
    "Kịch bản 1.1 - Thêm sản phẩm vào wishlist thành công",
    addWishlist.status === 201 && wishlistId !== "",
    `status=${addWishlist.status}, wishlistId=${wishlistId}`
  );

  const wishlistView = await call("GET", "/api/wishlist", undefined, userAToken);
  const wishlistItem = (wishlistView.json.data ?? []).find(
    (item: any) => item.productId === product._id.toString()
  );
  expect(
    "Kịch bản 1.2 - GET wishlist hiển thị sản phẩm vừa thêm",
    wishlistView.status === 200 && Boolean(wishlistItem),
    `status=${wishlistView.status}, found=${Boolean(wishlistItem)}`
  );

  const moveToCart = await call(
    "POST",
    `/api/wishlist/${wishlistId}/move-to-cart`,
    {},
    userAToken
  );
  expect(
    "Kịch bản 1.3 - move-to-cart chuyển sản phẩm sang giỏ thành công",
    moveToCart.status === 200,
    `status=${moveToCart.status}`
  );

  const cartAfterMove = await call("GET", "/api/cart", undefined, userAToken);
  const wishlistAfterMove = await call("GET", "/api/wishlist", undefined, userAToken);
  const cartHasProduct = (cartAfterMove.json.data?.items ?? []).some(
    (item: any) => item.productId === product._id.toString()
  );
  expect(
    "Kịch bản 1.4 - Sản phẩm nằm trong giỏ và biến mất khỏi wishlist",
    cartHasProduct &&
      cartAfterMove.json.data?.subtotal === 300000 &&
      Array.isArray(wishlistAfterMove.json.data) &&
      wishlistAfterMove.json.data.length === 0,
    `inCart=${cartHasProduct}, subtotal=${cartAfterMove.json.data?.subtotal}, wishlistLen=${wishlistAfterMove.json.data?.length}`
  );

  console.log("--- KỊCH BẢN 2: CART -> COUPON ---");

  await call("DELETE", "/api/cart", undefined, userAToken);
  const addCart300 = await call(
    "POST",
    "/api/cart",
    { productId: product._id.toString(), quantity: 1 },
    userAToken
  );
  const cartForCoupon = await call("GET", "/api/cart", undefined, userAToken);
  expect(
    "Kịch bản 2.1 - Giỏ hàng đạt subtotal 300000",
    addCart300.status === 201 && cartForCoupon.json.data?.subtotal === 300000,
    `status=${addCart300.status}, subtotal=${cartForCoupon.json.data?.subtotal}`
  );

  const publicCoupons = await call("GET", "/api/coupons/public");
  const publicCoupon = (publicCoupons.json.data ?? []).find(
    (c: any) => c.code === COUPON_CODE
  );
  expect(
    "Kịch bản 2.2 - Lấy được mã SES4TET300 từ danh sách công khai",
    publicCoupons.status === 200 && Boolean(publicCoupon),
    `status=${publicCoupons.status}, code=${publicCoupon?.code}`
  );

  const checkCoupon = await call(
    "POST",
    "/api/coupons/check",
    { code: publicCoupon?.code ?? COUPON_CODE, orderAmount: 300000 },
    userAToken
  );
  expect(
    "Kịch bản 2.3 - Check mã giảm đúng 30000, còn phải trả 270000",
    checkCoupon.status === 200 &&
      checkCoupon.json.data?.discountAmount === 30000 &&
      checkCoupon.json.data?.finalAmount === 270000,
    `status=${checkCoupon.status}, discount=${checkCoupon.json.data?.discountAmount}, final=${checkCoupon.json.data?.finalAmount}`
  );

  console.log("--- KỊCH BẢN 3: BẢO MẬT DỮ LIỆU CHÉO USER ---");

  const userBWishlistAdd = await call(
    "POST",
    "/api/wishlist",
    { productId: product._id.toString() },
    userBToken
  );
  await call("DELETE", "/api/cart", undefined, userBToken);
  await call("DELETE", "/api/wishlist", undefined, userBToken);

  const cartAItem = (await call("GET", "/api/cart", undefined, userAToken)).json.data
    ?.items?.[0]?.id as string;

  const addWishlistA = await call(
    "POST",
    "/api/wishlist",
    { productId: product._id.toString() },
    userAToken
  );
  const wishlistAId = addWishlistA.json.data?.id as string;

  const cartOfB = await call("GET", "/api/cart", undefined, userBToken);
  const wishlistOfB = await call("GET", "/api/wishlist", undefined, userBToken);
  expect(
    "Kịch bản 3.1 - User B không thấy giỏ hàng và wishlist của User A",
    cartOfB.status === 200 &&
      cartOfB.json.data?.items?.length === 0 &&
      wishlistOfB.status === 200 &&
      wishlistOfB.json.data?.length === 0,
    `cartB=${cartOfB.json.data?.items?.length}, wishlistB=${wishlistOfB.json.data?.length}`
  );

  const bUpdateACart = await call(
    "PUT",
    `/api/cart/${cartAItem}`,
    { quantity: 1 },
    userBToken
  );
  const bDeleteACart = await call("DELETE", `/api/cart/${cartAItem}`, undefined, userBToken);
  const bDeleteAWishlist = await call(
    "DELETE",
    `/api/wishlist/${wishlistAId}`,
    undefined,
    userBToken
  );
  const cartOfAAfter = await call("GET", "/api/cart", undefined, userAToken);
  const wishlistOfAAfter = await call("GET", "/api/wishlist", undefined, userAToken);
  expect(
    "Kịch bản 3.2 - User B bị chặn sửa/xóa dữ liệu của User A",
    bUpdateACart.status === 400 &&
      bDeleteACart.status === 400 &&
      bDeleteAWishlist.status === 400 &&
      cartOfAAfter.json.data?.items?.length === 1 &&
      wishlistOfAAfter.json.data?.length === 1,
    `put=${bUpdateACart.status}, delCart=${bDeleteACart.status}, delWish=${bDeleteAWishlist.status}, cartA=${cartOfAAfter.json.data?.items?.length}, wishA=${wishlistOfAAfter.json.data?.length}`
  );

  const customerAdminList = await call("GET", "/api/admin/coupons", undefined, customerToken);
  const customerAdminCreate = await call(
    "POST",
    "/api/admin/coupons",
    { code: "NOPE01", name: "Không được", discountType: "fixed", discountValue: 1000 },
    customerToken
  );
  const anyCoupon = await Coupon.findOne({ code: COUPON_CODE });
  const customerAdminDetail = await call(
    "GET",
    `/api/admin/coupons/${anyCoupon?._id.toString()}`,
    undefined,
    customerToken
  );
  const customerAdminUsages = await call(
    "GET",
    `/api/admin/coupons/${anyCoupon?._id.toString()}/usages`,
    undefined,
    customerToken
  );
  const customerAdminToggle = await call(
    "PATCH",
    `/api/admin/coupons/${anyCoupon?._id.toString()}/status`,
    undefined,
    customerToken
  );
  const customerAdminDelete = await call(
    "DELETE",
    `/api/admin/coupons/${anyCoupon?._id.toString()}`,
    undefined,
    customerToken
  );
  expect(
    "Kịch bản 3.3 - User thường bị chặn 403 toàn bộ endpoint /api/admin/coupons*",
    customerAdminList.status === 403 &&
      customerAdminCreate.status === 403 &&
      customerAdminDetail.status === 403 &&
      customerAdminUsages.status === 403 &&
      customerAdminToggle.status === 403 &&
      customerAdminDelete.status === 403,
    `list=${customerAdminList.status}, create=${customerAdminCreate.status}, detail=${customerAdminDetail.status}, usages=${customerAdminUsages.status}, toggle=${customerAdminToggle.status}, delete=${customerAdminDelete.status}`
  );

  const createdHack = await Coupon.countDocuments({ code: "NOPE01" });
  expect(
    "Kịch bản 3.4 - Không có coupon nào được tạo trái phép",
    createdHack === 0,
    `nopeCount=${createdHack}`
  );

  await call("DELETE", "/api/cart", undefined, userAToken);
  await call("DELETE", "/api/wishlist", undefined, userAToken);
  await call("DELETE", "/api/wishlist", undefined, userBToken);
  await preClean();

  const remainingProducts = await Product.countDocuments({ sku: SKU_MAIN });
  const remainingCoupons = await Coupon.countDocuments({ code: COUPON_CODE });
  const remainingCarts = await Cart.countDocuments({
    userId: { $in: testUserObjectIds() },
  });
  const remainingWishlists = await Wishlist.countDocuments({
    userId: { $in: testUserObjectIds() },
  });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingProducts === 0 &&
      remainingCoupons === 0 &&
      remainingCarts === 0 &&
      remainingWishlists === 0,
    `products=${remainingProducts}, coupons=${remainingCoupons}, carts=${remainingCarts}, wishlists=${remainingWishlists}`
  );

  console.log("\n========================================");
  console.log(`SESSION 4 INTEGRATION SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
