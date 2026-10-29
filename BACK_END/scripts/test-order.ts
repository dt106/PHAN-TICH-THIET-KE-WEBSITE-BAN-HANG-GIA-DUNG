import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Coupon from "../src/models/Coupon.model";
import CouponUsage from "../src/models/CouponUsage.model";
import Order from "../src/models/Order.model";
import OrderItem from "../src/models/OrderItem.model";
import Payment from "../src/models/Payment.model";
import ProductVariant from "../src/models/ProductVariant.model";

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
    userId: {
      $in: [
        new mongoose.Types.ObjectId(userIdA),
        new mongoose.Types.ObjectId(userIdB),
      ],
    },
  }).select("_id");
  const orderIds = orders.map((order) => order._id);
  await OrderItem.deleteMany({ orderId: { $in: orderIds } });
  await CouponUsage.deleteMany({ orderId: { $in: orderIds } });
  await Payment.deleteMany({ orderId: { $in: orderIds } });
  await Order.deleteMany({ _id: { $in: orderIds } });
  await Coupon.deleteMany({ code: "TESTOD10" });
  await ProductVariant.deleteMany({ sku: /^OD-VAR-/ });
};

const seedOrder = async (
  userId: string,
  variantId: mongoose.Types.ObjectId | null,
  overrides: Record<string, unknown> = {}
): Promise<{ order: any; itemQuantity: number; unitPrice: number }> => {
  const order = await Order.create({
    orderNumber: `DH-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId: new mongoose.Types.ObjectId(userId),
    customerName: "Khach Hang Test",
    customerEmail: "testorder@giadung.vn",
    customerPhone: "0900000009",
    shippingAddress: "123 Duong Test",
    subtotal: 500000,
    discountAmount: 0,
    shippingFee: 0,
    taxAmount: 0,
    totalAmount: 500000,
    paymentMethod: "COD",
    paymentStatus: "pending",
    status: "pending",
    ...overrides,
  });

  await OrderItem.create({
    orderId: order._id,
    productId: order._id,
    variantId,
    productName: "San pham test order",
    productSku: "OD-PRO-01",
    variantSku: variantId ? "OD-VAR-01" : null,
    quantity: 2,
    unitPrice: 250000,
    totalPrice: 500000,
  });

  return { order, itemQuantity: 2, unitPrice: 250000 };
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await cleanup();

  const variant = await ProductVariant.create({
    productId: new mongoose.Types.ObjectId(),
    sku: `OD-VAR-01-${Date.now()}`,
    price: 250000,
    stockQuantity: 5,
    isActive: true,
  });
  const variantSku = variant.sku;

  const coupon = await Coupon.create({
    code: "TESTOD10",
    name: "Coupon test order",
    discountType: "fixed",
    discountValue: 50000,
    isActive: true,
  });

  const seededA = await seedOrder(userIdA, variant._id);
  const seededACompleted = await seedOrder(userIdA, null, {
    status: "completed",
    paymentStatus: "paid",
    paymentMethod: "BANK",
    completedAt: new Date(),
  });
  // Đơn paid cần có bản ghi Payment "paid" (như luồng thật: gateway/COD đã ghi).
  await Payment.create({
    orderId: seededACompleted.order._id,
    paymentMethod: "BANK",
    transactionCode: `TESTPAY-RET-${Date.now()}`,
    amount: 500000,
    status: "paid",
    paidAt: new Date(),
  });
  const seededB = await seedOrder(userIdB, variant._id);

  const noAuth = await call("GET", "/api/orders/my-orders");
  expect("Chua dang nhap", noAuth.status === 401, `HTTP ${noAuth.status}`);

  const myOrders = await call("GET", "/api/orders/my-orders", undefined, tokenA);
  expect(
    "Danh sach don cua toi",
    myOrders.status === 200 &&
      myOrders.json.data.orders.length === 2 &&
      myOrders.json.data.orders.every(
        (order: any) => order.userId === userIdA
      ),
    `HTTP ${myOrders.status} | total=${myOrders.json.data?.meta?.total}`
  );

  const filterCompleted = await call(
    "GET",
    "/api/orders/my-orders?status=completed",
    undefined,
    tokenA
  );
  expect(
    "Loc theo trang thai",
    filterCompleted.status === 200 &&
      filterCompleted.json.data.orders.length === 1 &&
      filterCompleted.json.data.orders[0].status === "completed",
    `HTTP ${filterCompleted.status}`
  );

  const detailOwner = await call(
    "GET",
    `/api/orders/${seededA.order._id}`,
    undefined,
    tokenA
  );
  expect(
    "Chi tiet don chu so huu",
    detailOwner.status === 200 && detailOwner.json.data.orderNumber,
    `HTTP ${detailOwner.status}`
  );

  const crossUser = await call(
    "GET",
    `/api/orders/${seededA.order._id}`,
    undefined,
    tokenB
  );
  expect("Bao mat cheo user (xem)", crossUser.status === 404, `HTTP ${crossUser.status}`);

  const couponUsageBefore = 1;
  await CouponUsage.create({
    couponId: coupon._id,
    userId: new mongoose.Types.ObjectId(userIdA),
    orderId: seededA.order._id,
    discountAmount: 50000,
  });
  await Coupon.updateOne({ _id: coupon._id }, { $set: { usedCount: couponUsageBefore } });
  const orderWithCoupon = await Order.findById(seededA.order._id);
  orderWithCoupon!.couponId = coupon._id;
  orderWithCoupon!.discountAmount = 50000;
  await orderWithCoupon!.save();

  const cancelOk = await call(
    "PUT",
    `/api/orders/${seededA.order._id}/cancel`,
    undefined,
    tokenA
  );
  const variantAfterCancel = await ProductVariant.findOne({ sku: variantSku });
  const couponAfterCancel = await Coupon.findById(coupon._id);
  const usageAfterCancel = await CouponUsage.countDocuments({
    orderId: seededA.order._id,
  });
  expect(
    "Huy don pending + hoan kho + hoan coupon",
    cancelOk.status === 200 &&
      cancelOk.json.data.status === "cancelled" &&
      Boolean(cancelOk.json.data.cancelledAt) &&
      variantAfterCancel?.stockQuantity === 7 &&
      couponAfterCancel?.usedCount === 0 &&
      usageAfterCancel === 0,
    `HTTP ${cancelOk.status} | stock=${variantAfterCancel?.stockQuantity} | usedCount=${couponAfterCancel?.usedCount}`
  );

  const cancelCross = await call(
    "PUT",
    `/api/orders/${seededB.order._id}/cancel`,
    undefined,
    tokenA
  );
  expect("Bao mat cheo user (huy)", cancelCross.status === 404, `HTTP ${cancelCross.status}`);

  const cancelCompleted = await call(
    "PUT",
    `/api/orders/${seededACompleted.order._id}/cancel`,
    undefined,
    tokenA
  );
  expect(
    "Chan huy don completed",
    cancelCompleted.status === 400,
    `HTTP ${cancelCompleted.status} | ${cancelCompleted.json.message}`
  );

  const forbiddenAdmin = await call(
    "GET",
    "/api/admin/orders",
    undefined,
    tokenA
  );
  expect("Customer goi admin", forbiddenAdmin.status === 403, `HTTP ${forbiddenAdmin.status}`);

  const adminList = await call(
    "GET",
    `/api/admin/orders?userId=${userIdB}`,
    undefined,
    adminToken
  );
  expect(
    "Admin loc theo userId",
    adminList.status === 200 &&
      adminList.json.data.orders.length === 1 &&
      adminList.json.data.orders[0].userId === userIdB,
    `HTTP ${adminList.status}`
  );

  const adminSearch = await call(
    "GET",
    `/api/admin/orders?search=${seededB.order.orderNumber}`,
    undefined,
    adminToken
  );
  expect(
    "Admin tim kiem theo ma don",
    adminSearch.status === 200 && adminSearch.json.data.meta.total === 1,
    `HTTP ${adminSearch.status} | total=${adminSearch.json.data?.meta?.total}`
  );

  const invalidTransition = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "shipping" },
    adminToken
  );
  expect(
    "Chuyen trang thai sai quy trinh",
    invalidTransition.status === 400,
    `HTTP ${invalidTransition.status} | ${invalidTransition.json.message}`
  );

  const confirmed = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "confirmed" },
    adminToken
  );
  const processing = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "processing" },
    adminToken
  );
  const shipping = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "shipping" },
    adminToken
  );
  const completed = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "completed" },
    adminToken
  );
  expect(
    "Vong doi don chuan",
    confirmed.status === 200 &&
      Boolean(confirmed.json.data.confirmedAt) &&
      processing.status === 200 &&
      shipping.status === 200 &&
      Boolean(shipping.json.data.shippedAt) &&
      completed.status === 200 &&
      Boolean(completed.json.data.completedAt),
    `confirmed=${confirmed.status} | processing=${processing.status} | shipping=${shipping.status} | completed=${completed.status}`
  );

  const seededD = await seedOrder(userIdB, variant._id);
  const dConfirmed = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "confirmed" },
    adminToken
  );
  const dProcessing = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "processing" },
    adminToken
  );
  const dShipping = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "shipping" },
    adminToken
  );
  const dDelivered = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "delivered" },
    adminToken
  );
  expect(
    "shipping -> delivered (da giao, COD ghi nhan tien tai day)",
    dConfirmed.status === 200 &&
      dProcessing.status === 200 &&
      dShipping.status === 200 &&
      dDelivered.status === 200 &&
      dDelivered.json.data.status === "delivered" &&
      Boolean(dDelivered.json.data.deliveredAt) &&
      dDelivered.json.data.paymentStatus === "paid",
    `confirmed=${dConfirmed.status} | processing=${dProcessing.status} | shipping=${dShipping.status} | delivered=${dDelivered.status} | deliveredAt=${Boolean(dDelivered.json.data?.deliveredAt)} | paymentStatus=${dDelivered.json.data?.paymentStatus}`
  );

  const dCancelFromDelivered = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "cancelled" },
    adminToken
  );
  expect(
    "Chan huy don da delivered (tu choi khach phai dung returned)",
    dCancelFromDelivered.status === 400,
    `HTTP ${dCancelFromDelivered.status} | ${dCancelFromDelivered.json.message}`
  );

  const dCompleted = await call(
    "PUT",
    `/api/admin/orders/${seededD.order._id}/status`,
    { status: "completed" },
    adminToken
  );
  expect(
    "delivered -> completed (khach xac nhan), payment giu la paid",
    dCompleted.status === 200 &&
      dCompleted.json.data.status === "completed" &&
      dCompleted.json.data.paymentStatus === "paid",
    `HTTP ${dCompleted.status} | status=${dCompleted.json.data?.status} | paymentStatus=${dCompleted.json.data?.paymentStatus}`
  );

  const returned = await call(
    "PUT",
    `/api/admin/orders/${seededACompleted.order._id}/status`,
    { status: "returned" },
    adminToken
  );
  const returnedPayment = await Payment.findOne({
    orderId: seededACompleted.order._id,
    status: "refunded",
  });
  expect(
    "Hoan tra don paid -> refunded (ca Order va Payment)",
    returned.status === 200 &&
      returned.json.data.paymentStatus === "refunded" &&
      Boolean(returnedPayment) &&
      returnedPayment?.refundAmount === 500000 &&
      Boolean(returnedPayment?.refundTransactionCode?.startsWith("RF-")),
    `HTTP ${returned.status} | orderPaymentStatus=${returned.json.data?.paymentStatus} | paymentRefunded=${Boolean(returnedPayment)} | refundAmount=${returnedPayment?.refundAmount} | code=${returnedPayment?.refundTransactionCode}`
  );

  // Admin hủy đơn đã thanh toán → tự động hoàn tiền (phương án c).
  const seededEPaidCancel = await seedOrder(userIdB, null, {
    status: "confirmed",
    paymentStatus: "paid",
    paymentMethod: "BANK",
  });
  await Payment.create({
    orderId: seededEPaidCancel.order._id,
    paymentMethod: "BANK",
    transactionCode: `TESTPAY-CXL-${Date.now()}`,
    amount: 500000,
    status: "paid",
    paidAt: new Date(),
  });
  const paidCancel = await call(
    "PUT",
    `/api/admin/orders/${seededEPaidCancel.order._id}/status`,
    { status: "cancelled" },
    adminToken
  );
  const paidCancelPayment = await Payment.findOne({
    orderId: seededEPaidCancel.order._id,
    status: "refunded",
  });
  expect(
    "Admin huy don da paid -> tu dong refund (Order + Payment)",
    paidCancel.status === 200 &&
      paidCancel.json.data.paymentStatus === "refunded" &&
      Boolean(paidCancelPayment) &&
      paidCancelPayment?.refundAmount === 500000,
    `HTTP ${paidCancel.status} | orderPaymentStatus=${paidCancel.json.data?.paymentStatus} | paymentRefunded=${Boolean(paidCancelPayment)} | refundAmount=${paidCancelPayment?.refundAmount}`
  );

  const terminalTransition = await call(
    "PUT",
    `/api/admin/orders/${seededB.order._id}/status`,
    { status: "confirmed" },
    adminToken
  );
  expect(
    "Chan chuyen tu trang thai final",
    terminalTransition.status === 400,
    `HTTP ${terminalTransition.status}`
  );

  await cleanup();
  console.log(`\nTỔNG KẾT: PASS=${passed} | FAIL=${failed}`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("Lỗi chạy test order:", error);
  await cleanup();
  await mongoose.disconnect();
  process.exit(1);
});
