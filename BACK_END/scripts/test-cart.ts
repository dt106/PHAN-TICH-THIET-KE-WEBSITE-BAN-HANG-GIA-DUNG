import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Cart from "../src/models/Cart.model";
import Category from "../src/models/Category.model";
import Product from "../src/models/Product.model";
import ProductVariant from "../src/models/ProductVariant.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const CATEGORY_SLUG = "test-cart-category";
const SKU_SIMPLE = "CART-001";
const SKU_VARIANT = "CART-002";

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
const adminToken = jwt.sign(
  { userId: new mongoose.Types.ObjectId().toString(), role: "admin" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const preClean = async (): Promise<void> => {
  await Cart.deleteMany({
    userId: {
      $in: [
        new mongoose.Types.ObjectId(userIdA),
        new mongoose.Types.ObjectId(userIdB),
      ],
    },
  });
  await ProductVariant.deleteMany({ sku: { $in: ["CART-002-BAC"] } });
  await Product.deleteMany({ sku: { $in: [SKU_SIMPLE, SKU_VARIANT] } });
  await Category.deleteMany({ slug: CATEGORY_SLUG });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Cart.syncIndexes();
  await preClean();

  const category = await Category.create({
    name: "Test Cart Category",
    slug: CATEGORY_SLUG,
  });

  const simpleProduct = await Product.create({
    categoryId: category._id,
    name: "Chảo Chống Dính Cart Test",
    slug: "chao-chong-dinh-cart-test",
    sku: SKU_SIMPLE,
    basePrice: 200000,
    salePrice: 150000,
    isActive: true,
  });

  const variantProduct = await Product.create({
    categoryId: category._id,
    name: "Nồi Chiên Không Dầu Cart Test",
    slug: "noi-chien-khong-dau-cart-test",
    sku: SKU_VARIANT,
    basePrice: 900000,
    isActive: true,
  });

  const variant = await ProductVariant.create({
    productId: variantProduct._id,
    sku: "CART-002-BAC",
    price: 850000,
    stockQuantity: 10,
    isActive: true,
  });

  const noToken = await call("GET", "/api/cart");
  expect(
    "GET /api/cart không kèm token bị chặn 401",
    noToken.status === 401,
    `status=${noToken.status}`
  );

  const addVariantFirst = await call(
    "POST",
    "/api/cart",
    { productId: variantProduct._id.toString(), variantId: variant._id.toString(), quantity: 2 },
    userAToken
  );
  const cartItemId = addVariantFirst.json.data?.id as string;
  expect(
    "POST /api/cart thêm biến thể quantity 2 thành công 201",
    addVariantFirst.status === 201 &&
      cartItemId !== "" &&
      addVariantFirst.json.data?.quantity === 2,
    `status=${addVariantFirst.status}, cartItemId=${cartItemId}`
  );

  const addDuplicate = await call(
    "POST",
    "/api/cart",
    { productId: variantProduct._id.toString(), variantId: variant._id.toString(), quantity: 1 },
    userAToken
  );
  expect(
    "POST /api/cart thêm trùng lặp tự cộng dồn lên quantity 3",
    addDuplicate.status === 201 && addDuplicate.json.data?.quantity === 3,
    `status=${addDuplicate.status}, quantity=${addDuplicate.json.data?.quantity}`
  );

  const addOverStock = await call(
    "POST",
    "/api/cart",
    { productId: variantProduct._id.toString(), variantId: variant._id.toString(), quantity: 99999 },
    userAToken
  );
  expect(
    "POST /api/cart vượt tồn kho bị chặn 400",
    addOverStock.status === 400 &&
      String(addOverStock.json.message).includes("tồn kho"),
    `status=${addOverStock.status}, message=${addOverStock.json.message}`
  );

  const addSimple = await call(
    "POST",
    "/api/cart",
    { productId: simpleProduct._id.toString(), quantity: 1 },
    userAToken
  );
  const simpleItemId = addSimple.json.data?.id as string;
  expect(
    "POST /api/cart thêm sản phẩm thường thành công 201",
    addSimple.status === 201 && simpleItemId !== "",
    `status=${addSimple.status}, cartItemId=${simpleItemId}`
  );

  const cartView = await call("GET", "/api/cart", undefined, userAToken);
  const simpleItem = (cartView.json.data?.items ?? []).find(
    (item: any) => item.id === simpleItemId
  );
  expect(
    "GET /api/cart tính đúng subtotal 2700000, tổng số lượng 4, 2 dòng",
    cartView.status === 200 &&
      cartView.json.data?.subtotal === 2700000 &&
      cartView.json.data?.totalQuantity === 4 &&
      cartView.json.data?.totalUniqueItems === 2,
    `subtotal=${cartView.json.data?.subtotal}, totalQuantity=${cartView.json.data?.totalQuantity}, unique=${cartView.json.data?.totalUniqueItems}`
  );
  expect(
    "Sản phẩm thường dùng salePrice làm đơn giá và basePrice làm giá gốc",
    simpleItem?.unitPrice === 150000 &&
      simpleItem?.originalPrice === 200000 &&
      simpleItem?.isAvailable === true,
    `unitPrice=${simpleItem?.unitPrice}, originalPrice=${simpleItem?.originalPrice}`
  );

  const updateQuantity = await call(
    "PUT",
    `/api/cart/${simpleItemId}`,
    { quantity: 5 },
    userAToken
  );
  expect(
    "PUT /api/cart/:id cập nhật số lượng 5 thành công",
    updateQuantity.status === 200 && updateQuantity.json.data?.quantity === 5,
    `status=${updateQuantity.status}, quantity=${updateQuantity.json.data?.quantity}`
  );

  const updateOverStock = await call(
    "PUT",
    `/api/cart/${cartItemId}`,
    { quantity: 99999 },
    userAToken
  );
  expect(
    "PUT /api/cart/:id số lượng vượt tồn kho bị chặn 400",
    updateOverStock.status === 400,
    `status=${updateOverStock.status}`
  );

  const updateInvalid = await call(
    "PUT",
    `/api/cart/${simpleItemId}`,
    { quantity: 0 },
    userAToken
  );
  expect(
    "PUT /api/cart/:id quantity 0 bị chặn validation 400",
    updateInvalid.status === 400,
    `status=${updateInvalid.status}`
  );

  const crossUpdate = await call(
    "PUT",
    `/api/cart/${cartItemId}`,
    { quantity: 1 },
    userBToken
  );
  const crossDelete = await call("DELETE", `/api/cart/${cartItemId}`, undefined, userBToken);
  const ownerStillHas = await call("GET", "/api/cart", undefined, userAToken);
  expect(
    "User B không thể sửa/xóa item của User A (404) và dữ liệu nguyên vẹn",
    crossUpdate.status === 404 &&
      crossDelete.status === 404 &&
      ownerStillHas.json.data?.totalUniqueItems === 2,
    `put=${crossUpdate.status}, delete=${crossDelete.status}, unique=${ownerStillHas.json.data?.totalUniqueItems}`
  );

  const removeItem = await call("DELETE", `/api/cart/${simpleItemId}`, undefined, userAToken);
  const afterRemove = await call("GET", "/api/cart", undefined, userAToken);
  expect(
    "DELETE /api/cart/:id xóa 1 item còn lại 1 dòng",
    removeItem.status === 200 && afterRemove.json.data?.totalUniqueItems === 1,
    `status=${removeItem.status}, unique=${afterRemove.json.data?.totalUniqueItems}`
  );

  const clearCart = await call("DELETE", "/api/cart", undefined, userAToken);
  const afterClear = await call("GET", "/api/cart", undefined, userAToken);
  expect(
    "DELETE /api/cart làm trống giỏ hàng về items rỗng",
    clearCart.status === 200 &&
      Array.isArray(afterClear.json.data?.items) &&
      afterClear.json.data.items.length === 0,
    `status=${clearCart.status}, items=${afterClear.json.data?.items?.length}`
  );

  await preClean();

  const remainingCarts = await Cart.countDocuments({
    userId: { $in: [new mongoose.Types.ObjectId(userIdA), new mongoose.Types.ObjectId(userIdB)] },
  });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingCarts === 0,
    `carts=${remainingCarts}`
  );

  console.log("\n========================================");
  console.log(`CART TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
