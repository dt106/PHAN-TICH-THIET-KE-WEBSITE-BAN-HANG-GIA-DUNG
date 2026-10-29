import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Order from "../src/models/Order.model";
import Payment from "../src/models/Payment.model";
import { buildVnpaySignature } from "../src/services/payment.service";

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
    orderNumber: { $regex: "^DH-TEST-PAY-" },
  }).select("_id");
  const orderIds = orders.map((order) => order._id);
  await Payment.deleteMany({ orderId: { $in: orderIds } });
  await Order.deleteMany({ _id: { $in: orderIds } });
};

const seedOrder = async (
  userId: string,
  orderNumber: string,
  overrides: Record<string, unknown> = {}
): Promise<any> =>
  Order.create({
    orderNumber,
    userId: new mongoose.Types.ObjectId(userId),
    customerName: "Khach Hang Test",
    customerEmail: "paytest@giadung.vn",
    customerPhone: "0900000009",
    shippingAddress: "123 Duong Test",
    subtotal: 1000000,
    totalAmount: 1000000,
    paymentMethod: "VNPAY",
    paymentStatus: "pending",
    status: "pending",
    ...overrides,
  });

const main = async (): Promise<void> => {
  await connectDatabase();
  await cleanup();

  const signatureOne = buildVnpaySignature(
    { vnp_Amount: "100000000", vnp_TxnRef: "X1", vnp_OrderInfo: "test" },
    "secret-a"
  );
  const signatureTwo = buildVnpaySignature(
    { vnp_Amount: "999999999", vnp_TxnRef: "X1", vnp_OrderInfo: "test" },
    "secret-a"
  );
  expect(
    "Chu ky HMAC phu thuoc du lieu",
    signatureOne !== signatureTwo && signatureOne.length === 128,
    `len=${signatureOne.length}`
  );

  const orderA = await seedOrder(userIdA, `DH-TEST-PAY-A-${Date.now()}`);
  const orderB = await seedOrder(userIdB, `DH-TEST-PAY-B-${Date.now()}`, {
    paymentMethod: "COD",
  });
  const orderCod = await seedOrder(userIdA, `DH-TEST-PAY-C-${Date.now()}`, {
    paymentMethod: "COD",
  });

  const noAuth = await call("POST", "/api/payments", { orderId: orderA._id });
  expect("Chua dang nhap", noAuth.status === 401, `HTTP ${noAuth.status}`);

  const crossUser = await call(
    "POST",
    "/api/payments",
    { orderId: orderA._id },
    tokenB
  );
  expect("Bao mat cheo user", crossUser.status === 404, `HTTP ${crossUser.status}`);

  const created = await call(
    "POST",
    "/api/payments",
    { orderId: orderA._id },
    tokenA
  );
  expect(
    "Tao phien thanh toan mock",
    created.status === 201 &&
      created.json.data.paymentUrl?.startsWith("mock://pay/") === true &&
      created.json.data.payment.status === "pending",
    `HTTP ${created.status}`
  );

  const completed = await call("POST", "/api/payments/mock/complete", {
    orderNumber: orderA.orderNumber,
    amount: orderA.totalAmount,
    success: true,
  });
  expect(
    "Mock thanh cong ghi nhan tien",
    completed.status === 200 &&
      completed.json.data.payment.status === "paid" &&
      Boolean(completed.json.data.payment.paidAt),
    `HTTP ${completed.status}`
  );

  const orderAfterPaid = await Order.findById(orderA._id);
  expect(
    "Don hang dong bo paid",
    orderAfterPaid?.paymentStatus === "paid",
    `paymentStatus=${orderAfterPaid?.paymentStatus}`
  );

  const replay = await call("POST", "/api/payments/mock/complete", {
    orderNumber: orderA.orderNumber,
    amount: orderA.totalAmount,
    success: true,
  });
  const paidCount = await Payment.countDocuments({
    orderId: orderA._id,
    status: "paid",
  });
  expect(
    "Idempotency khong ghi kep",
    replay.status === 200 && paidCount === 1,
    `paidCount=${paidCount}`
  );

  const payAgain = await call(
    "POST",
    "/api/payments",
    { orderId: orderA._id },
    tokenA
  );
  expect("Chan thanh toan lai don da paid", payAgain.status === 400, `HTTP ${payAgain.status}`);

  const amountMismatch = await call("POST", "/api/payments/mock/complete", {
    orderNumber: orderCod.orderNumber,
    amount: 123,
    success: true,
  });
  expect(
    "Chan so tien khong khop",
    amountMismatch.status === 400,
    `HTTP ${amountMismatch.status} | ${amountMismatch.json.message}`
  );

  const myPayments = await call(
    "GET",
    "/api/payments/my-payments",
    undefined,
    tokenA
  );
  expect(
    "Lich su thanh toan cua toi",
    myPayments.status === 200 &&
      myPayments.json.data.length === 1 &&
      myPayments.json.data[0].order.orderNumber === orderA.orderNumber,
    `HTTP ${myPayments.status} | count=${myPayments.json.data?.length}`
  );

  const completedCod = await call(
    "PUT",
    `/api/admin/orders/${orderCod._id}/status`,
    { status: "confirmed" },
    adminToken
  );
  const completedCod2 = await call(
    "PUT",
    `/api/admin/orders/${orderCod._id}/status`,
    { status: "processing" },
    adminToken
  );
  const completedCod3 = await call(
    "PUT",
    `/api/admin/orders/${orderCod._id}/status`,
    { status: "shipping" },
    adminToken
  );
  const completedCod4 = await call(
    "PUT",
    `/api/admin/orders/${orderCod._id}/status`,
    { status: "completed" },
    adminToken
  );
  const codPayment = await Payment.findOne({ orderId: orderCod._id });
  expect(
    "COD tu ghi nhan khi hoan thanh don",
    completedCod.status === 200 &&
      completedCod2.status === 200 &&
      completedCod3.status === 200 &&
      completedCod4.status === 200 &&
      codPayment?.status === "paid" &&
      codPayment?.transactionCode === `COD-${orderCod.orderNumber}`,
    `status=${codPayment?.status} | txn=${codPayment?.transactionCode}`
  );

  const forbiddenAdmin = await call(
    "GET",
    "/api/admin/payments",
    undefined,
    tokenA
  );
  expect("Customer goi admin", forbiddenAdmin.status === 403, `HTTP ${forbiddenAdmin.status}`);

  const adminList = await call(
    "GET",
    "/api/admin/payments?status=paid",
    undefined,
    adminToken
  );
  expect(
    "Admin doi soat tong tien",
    adminList.status === 200 &&
      adminList.json.summary.totalPaidAmount ===
        orderA.totalAmount + orderCod.totalAmount &&
      adminList.json.summary.totalPaidCount === 2,
    `HTTP ${adminList.status} | ${JSON.stringify(adminList.json.summary ?? {})}`
  );

  const refunded = await call(
    "POST",
    `/api/admin/payments/${codPayment?._id}/refund`,
    { reason: "Test hoan tien" },
    adminToken
  );
  const orderCodAfterRefund = await Order.findById(orderCod._id);
  expect(
    "Hoan tien dong bo don hang",
    refunded.status === 200 &&
      refunded.json.data.status === "refunded" &&
      refunded.json.data.refundAmount === orderCod.totalAmount &&
      orderCodAfterRefund?.paymentStatus === "refunded",
    `HTTP ${refunded.status} | orderPaymentStatus=${orderCodAfterRefund?.paymentStatus}`
  );

  await cleanup();
  console.log(`\nTỔNG KẾT: PASS=${passed} | FAIL=${failed}`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("Lỗi chạy test payment:", error);
  await cleanup();
  await mongoose.disconnect();
  process.exit(1);
});
