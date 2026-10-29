import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Order from "../src/models/Order.model";
import OrderItem from "../src/models/OrderItem.model";

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
const userIdB = new mongoose.Types.ObjectId().toString();
const adminUserId = new mongoose.Types.ObjectId().toString();
const productOneId = new mongoose.Types.ObjectId().toString();
const productTwoId = new mongoose.Types.ObjectId().toString();

const tokenA = jwt.sign({ userId: userIdA, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const tokenB = jwt.sign({ userId: userIdB, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const adminToken = jwt.sign({ userId: adminUserId, role: "admin" }, JWT_SECRET, {
  expiresIn: "1h",
});

const cleanup = async (): Promise<void> => {
  const orders = await Order.find({
    userId: {
      $in: [
        new mongoose.Types.ObjectId(userIdA),
        new mongoose.Types.ObjectId(userIdB),
      ],
    },
  }).select("_id");
  const orderIds = orders.map((order) => order._id);
  await OrderItem.deleteMany({ orderId: { $in: orderIds } });
  await Order.deleteMany({ _id: { $in: orderIds } });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await cleanup();

  const orderA = await Order.create({
    orderNumber: `DH-TEST-${Date.now()}-A`,
    userId: new mongoose.Types.ObjectId(userIdA),
    customerName: "Khach Hang A",
    customerEmail: "a@giadung.vn",
    customerPhone: "0900000001",
    shippingAddress: "123 Duong A",
    subtotal: 950000,
    totalAmount: 950000,
    paymentMethod: "COD",
    status: "pending",
  });

  await OrderItem.create({
    orderId: orderA._id,
    productId: new mongoose.Types.ObjectId(productOneId),
    productName: "San pham mot",
    productSku: "OI-PRO-01",
    quantity: 1,
    unitPrice: 550000,
    totalPrice: 550000,
  });

  await OrderItem.create({
    orderId: orderA._id,
    productId: new mongoose.Types.ObjectId(productTwoId),
    productName: "San pham hai",
    productSku: "OI-PRO-02",
    quantity: 2,
    unitPrice: 200000,
    totalPrice: 400000,
  });

  const orderB = await Order.create({
    orderNumber: `DH-TEST-${Date.now()}-B`,
    userId: new mongoose.Types.ObjectId(userIdB),
    customerName: "Khach Hang B",
    customerEmail: "b@giadung.vn",
    customerPhone: "0900000002",
    shippingAddress: "456 Duong B",
    subtotal: 550000,
    totalAmount: 550000,
    paymentMethod: "BANK",
    status: "completed",
  });

  await OrderItem.create({
    orderId: orderB._id,
    productId: new mongoose.Types.ObjectId(productOneId),
    productName: "San pham mot",
    productSku: "OI-PRO-01",
    quantity: 1,
    unitPrice: 550000,
    totalPrice: 550000,
  });

  const noAuth = await call("GET", `/api/orders/${orderA._id}/items`);
  expect("Chua dang nhap", noAuth.status === 401, `HTTP ${noAuth.status}`);

  const ownerItems = await call(
    "GET",
    `/api/orders/${orderA._id}/items`,
    undefined,
    tokenA
  );
  expect(
    "Chu so huu xem items",
    ownerItems.status === 200 &&
      ownerItems.json.data.length === 2 &&
      ownerItems.json.data[0].productName === "San pham mot" &&
      ownerItems.json.data[1].totalPrice === 400000,
    `HTTP ${ownerItems.status} | items=${ownerItems.json.data?.length}`
  );

  const crossUser = await call(
    "GET",
    `/api/orders/${orderA._id}/items`,
    undefined,
    tokenB
  );
  expect("Bao mat cheo user", crossUser.status === 404, `HTTP ${crossUser.status}`);

  const adminView = await call(
    "GET",
    `/api/orders/${orderA._id}/items`,
    undefined,
    adminToken
  );
  expect(
    "Admin xem items don bat ky",
    adminView.status === 200 && adminView.json.data.length === 2,
    `HTTP ${adminView.status}`
  );

  const forbiddenAdmin = await call(
    "GET",
    "/api/admin/order-items",
    undefined,
    tokenA
  );
  expect(
    "Customer goi admin endpoint",
    forbiddenAdmin.status === 403,
    `HTTP ${forbiddenAdmin.status}`
  );

  const filterByOrder = await call(
    "GET",
    `/api/admin/order-items?orderId=${orderB._id}`,
    undefined,
    adminToken
  );
  expect(
    "Admin loc theo orderId",
    filterByOrder.status === 200 &&
      filterByOrder.json.data.items.length === 1 &&
      filterByOrder.json.data.meta.total === 1,
    `HTTP ${filterByOrder.status} | total=${filterByOrder.json.data?.meta?.total}`
  );

  const filterByProduct = await call(
    "GET",
    `/api/admin/order-items?productId=${productOneId}`,
    undefined,
    adminToken
  );
  expect(
    "Admin loc theo productId",
    filterByProduct.status === 200 &&
      filterByProduct.json.data.meta.total === 2 &&
      filterByProduct.json.data.items.every(
        (item: any) => item.productSku === "OI-PRO-01"
      ),
    `HTTP ${filterByProduct.status} | total=${filterByProduct.json.data?.meta?.total}`
  );

  const filterByDate = await call(
    "GET",
    `/api/admin/order-items?from=2020-01-01&to=2030-12-31&productId=${productOneId}`,
    undefined,
    adminToken
  );
  expect(
    "Admin loc theo thoi gian",
    filterByDate.status === 200 && filterByDate.json.data.meta.total === 2,
    `HTTP ${filterByDate.status} | total=${filterByDate.json.data?.meta?.total}`
  );

  const filterByDateOutside = await call(
    "GET",
    `/api/admin/order-items?from=1990-01-01&to=1999-12-31&productId=${productOneId}`,
    undefined,
    adminToken
  );
  expect(
    "Admin loc thoi gian ngoai pham vi",
    filterByDateOutside.status === 200 && filterByDateOutside.json.data.meta.total === 0,
    `HTTP ${filterByDateOutside.status} | total=${filterByDateOutside.json.data?.meta?.total}`
  );

  const summary = await call(
    "GET",
    `/api/admin/order-items?orderId=${orderA._id}`,
    undefined,
    adminToken
  );
  expect(
    "Admin thong ke summary",
    summary.status === 200 &&
      summary.json.data.summary.totalQuantity === 3 &&
      summary.json.data.summary.totalRevenue === 950000,
    `HTTP ${summary.status} | ${JSON.stringify(summary.json.data?.summary ?? {})}`
  );

  await cleanup();
  console.log(`\nTỔNG KẾT: PASS=${passed} | FAIL=${failed}`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("Lỗi chạy test order item:", error);
  await cleanup();
  await mongoose.disconnect();
  process.exit(1);
});
