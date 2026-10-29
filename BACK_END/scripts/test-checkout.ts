import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Cart from "../src/models/Cart.model";
import Category from "../src/models/Category.model";
import Coupon from "../src/models/Coupon.model";
import CouponUsage from "../src/models/CouponUsage.model";
import Order from "../src/models/Order.model";
import OrderItem from "../src/models/OrderItem.model";
import Product from "../src/models/Product.model";
import ProductVariant from "../src/models/ProductVariant.model";
import User from "../src/models/User.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

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
const userAToken = jwt.sign({ userId: userIdA, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});

const cleanup = async (): Promise<void> => {
  await User.deleteOne({ _id: new mongoose.Types.ObjectId(userIdA) });
  await Cart.deleteMany({ userId: new mongoose.Types.ObjectId(userIdA) });
  const orders = await Order.find({
    userId: new mongoose.Types.ObjectId(userIdA),
  }).select("_id");
  const orderIds = orders.map((order) => order._id);
  await OrderItem.deleteMany({ orderId: { $in: orderIds } });
  await CouponUsage.deleteMany({ userId: new mongoose.Types.ObjectId(userIdA) });
  await Order.deleteMany({ userId: new mongoose.Types.ObjectId(userIdA) });
  await Coupon.deleteMany({ code: { $in: ["TESTCK10", "TESTCKEX"] } });
  await ProductVariant.deleteMany({ sku: { $in: ["CK-VAR-01"] } });
  await Product.deleteMany({ sku: { $in: ["CK-PRO-01", "CK-PRO-02"] } });
  await Category.deleteMany({ slug: "test-checkout-category" });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await cleanup();

  await User.create({
    _id: new mongoose.Types.ObjectId(userIdA),
    name: "Khach Hang Test Checkout",
    email: "test-checkout@giadung.vn",
    password: "123456",
  });

  const noAuth = await call("POST", "/api/checkout", {
    paymentMethod: "COD",
  });
  expect(
    "Chưa đăng nhập",
    noAuth.status === 401,
    `HTTP ${noAuth.status}`
  );

  const emptyCart = await call(
    "POST",
    "/api/checkout",
    {
      paymentMethod: "COD",
      customerName: "Nguyen Van A",
      customerPhone: "0900000001",
      shippingAddress: "123 Duong Test",
    },
    userAToken
  );
  expect("Giỏ trống", emptyCart.status === 400, `HTTP ${emptyCart.status}`);

  const category = await Category.create({
    name: "Danh mục test checkout",
    slug: "test-checkout-category",
  });

  const productSimple = await Product.create({
    categoryId: category._id,
    name: "San pham khong bien the",
    slug: "san-pham-khong-bien-the-ck",
    sku: "CK-PRO-01",
    basePrice: 400000,
    salePrice: 300000,
    isActive: true,
  });

  const productVariant = await Product.create({
    categoryId: category._id,
    name: "San pham co bien the",
    slug: "san-pham-co-bien-the-ck",
    sku: "CK-PRO-02",
    basePrice: 250000,
    isActive: true,
  });

  const variant = await ProductVariant.create({
    productId: productVariant._id,
    sku: "CK-VAR-01",
    price: 200000,
    stockQuantity: 5,
    isActive: true,
  });

  const cartSimple = await Cart.create({
    userId: new mongoose.Types.ObjectId(userIdA),
    productId: productSimple._id,
    variantId: null,
    quantity: 2,
  });

  const cartVariant = await Cart.create({
    userId: new mongoose.Types.ObjectId(userIdA),
    productId: productVariant._id,
    variantId: variant._id,
    quantity: 1,
  });

  const coupon = await Coupon.create({
    code: "TESTCK10",
    name: "Giam 10% test checkout",
    discountType: "percentage",
    discountValue: 10,
    minimumOrderAmount: 200000,
    maximumDiscountAmount: 50000,
    isActive: true,
  });

  await Coupon.create({
    code: "TESTCKEX",
    name: "Coupon het han test checkout",
    discountType: "fixed",
    discountValue: 100000,
    expiresAt: new Date("2025-12-31T23:59:59.000Z"),
    isActive: true,
  });

  const checkoutBody = {
    customerName: "Nguyen Van A",
    customerPhone: "0900000001",
    shippingAddress: "123 Duong Test",
    shippingProvince: "Ho Chi Minh",
    couponCode: "TESTCK10",
    paymentMethod: "COD",
    shippingFee: 30000,
  };

  const preview = await call(
    "POST",
    "/api/checkout/preview",
    checkoutBody,
    userAToken
  );
  expect(
    "Preview tong tien",
    preview.status === 200 &&
      preview.json.data.subtotal === 800000 &&
      preview.json.data.discountAmount === 50000 &&
      preview.json.data.totalAmount === 780000,
    `HTTP ${preview.status} | ${JSON.stringify(preview.json.data ?? {})}`
  );

  const previewExpired = await call(
    "POST",
    "/api/checkout/preview",
    { ...checkoutBody, couponCode: "TESTCKEX" },
    userAToken
  );
  expect(
    "Preview coupon het han",
    previewExpired.status === 400,
    `HTTP ${previewExpired.status} | ${previewExpired.json.message}`
  );

  const placed = await call("POST", "/api/checkout", checkoutBody, userAToken);
  expect(
    "Dat hang thanh cong",
    placed.status === 201 &&
      placed.json.data.order.status === "pending" &&
      placed.json.data.order.orderNumber.startsWith("DH-") &&
      placed.json.data.items.length === 2,
    `HTTP ${placed.status} | ${JSON.stringify(placed.json)}`
  );

  const variantAfter = await ProductVariant.findById(variant._id);
  expect(
    "Tru ton kho bien the",
    variantAfter?.stockQuantity === 4,
    `Stock=${variantAfter?.stockQuantity}`
  );

  const couponAfter = await Coupon.findById(coupon._id);
  const usageCount = await CouponUsage.countDocuments({
    couponId: coupon._id,
    userId: new mongoose.Types.ObjectId(userIdA),
  });
  expect(
    "Ghi nhan CouponUsage",
    couponAfter?.usedCount === 1 && usageCount === 1,
    `usedCount=${couponAfter?.usedCount} | usages=${usageCount}`
  );

  const cartAfter = await Cart.countDocuments({
    userId: new mongoose.Types.ObjectId(userIdA),
  });
  expect("Gio hang da trong", cartAfter === 0, `cartItems=${cartAfter}`);

  const missingAddress = await call(
    "POST",
    "/api/checkout",
    { paymentMethod: "COD" },
    userAToken
  );
  expect(
    "Thieu thong tin dia chi",
    missingAddress.status === 400,
    `HTTP ${missingAddress.status} | ${missingAddress.json.message}`
  );

  const invalidPayment = await call(
    "POST",
    "/api/checkout",
    {
      customerName: "Nguyen Van A",
      customerPhone: "0900000001",
      shippingAddress: "123 Duong Test",
      paymentMethod: "CASH",
    },
    userAToken
  );
  expect(
    "Phuong thuc thanh toan sai",
    invalidPayment.status === 400,
    `HTTP ${invalidPayment.status}`
  );

  const cartSimpleAgain = await Cart.create({
    userId: new mongoose.Types.ObjectId(userIdA),
    productId: productSimple._id,
    variantId: null,
    quantity: 1,
  });
  await Cart.create({
    userId: new mongoose.Types.ObjectId(userIdA),
    productId: productVariant._id,
    variantId: variant._id,
    quantity: 1,
  });

  const partial = await call(
    "POST",
    "/api/checkout",
    {
      customerName: "Nguyen Van A",
      customerPhone: "0900000001",
      shippingAddress: "123 Duong Test",
      selectedCartItemIds: [cartSimpleAgain._id.toString()],
      paymentMethod: "BANK",
    },
    userAToken
  );
  const remainCart = await Cart.countDocuments({
    userId: new mongoose.Types.ObjectId(userIdA),
  });
  expect(
    "Chon mot phan gio hang",
    partial.status === 201 &&
      partial.json.data.items.length === 1 &&
      remainCart === 1,
    `HTTP ${partial.status} | remainCart=${remainCart}`
  );

  await cleanup();
  console.log(`\nTỔNG KẾT: PASS=${passed} | FAIL=${failed}`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("Lỗi chạy test checkout:", error);
  await cleanup();
  await mongoose.disconnect();
  process.exit(1);
});
