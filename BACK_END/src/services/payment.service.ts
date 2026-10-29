import crypto from "crypto";
import { AppError } from "../utils/appError";
import { Types } from "mongoose";
import Order, { IOrder, PaymentMethod } from "../models/Order.model";
import Payment, { IPayment } from "../models/Payment.model";
import {
  BANK_TRANSFER_INFO,
  CLIENT_URL,
  MOMO_CONFIG,
  ONLINE_METHODS,
  PAYMENT_ENV,
  VNPAY_CONFIG,
  ZALOPAY_CONFIG,
} from "../config/payment";

const SESSION_DURATION_MS = 15 * 60 * 1000;

const createHttpError = (statusCode: number, message: string): Error =>
  new AppError(statusCode, message);

const formatVnpDate = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

export const buildVnpaySignature = (
  params: Record<string, string>,
  hashSecret: string
): string => {
  const sortedKeys = Object.keys(params)
    .filter(
      (key) =>
        key !== "vnp_SecureHash" &&
        params[key] !== undefined &&
        params[key] !== null &&
        params[key] !== ""
    )
    .sort();
  const signData = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  return crypto
    .createHmac("sha512", hashSecret)
    .update(signData)
    .digest("hex")
    .toUpperCase();
};

export const verifyVnpayCallback = (
  query: Record<string, string>
): boolean => {
  const receivedHash = query.vnp_SecureHash;
  if (!receivedHash) {
    return false;
  }
  return (
    buildVnpaySignature(query, VNPAY_CONFIG.hashSecret) ===
    receivedHash.toUpperCase()
  );
};

export const verifyMomoCallback = (
  body: Record<string, string>
): boolean => {
  const receivedSignature = body.signature;
  if (!receivedSignature) {
    return false;
  }
  const dataToSign = Object.keys(body)
    .filter((key) => key !== "signature" && body[key] !== "" && body[key] !== undefined)
    .sort()
    .map((key) => `${key}=${body[key]}`)
    .join("&");
  const expected = crypto
    .createHmac("sha256", MOMO_CONFIG.secretKey)
    .update(dataToSign)
    .digest("hex");
  return expected === receivedSignature;
};

export const verifyZalopayCallback = (
  data: string,
  mac: string
): boolean => {
  if (!data || !mac) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", ZALOPAY_CONFIG.key2)
    .update(data)
    .digest("hex");
  return expected === mac;
};

const buildVnpayPaymentUrl = (
  order: IOrder
): { paymentUrl: string; expiredAt: Date } => {
  const createdAt = new Date();
  const expiredAt = new Date(createdAt.getTime() + SESSION_DURATION_MS);
  const params: Record<string, string> = {
    vnp_Version: VNPAY_CONFIG.version,
    vnp_Command: "pay",
    vnp_TmnCode: VNPAY_CONFIG.tmnCode,
    vnp_Amount: String(order.totalAmount * 100),
    vnp_CurrCode: "VND",
    vnp_TxnRef: order.orderNumber,
    vnp_OrderInfo: `Thanh toan don hang ${order.orderNumber}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",
    vnp_ReturnUrl: VNPAY_CONFIG.returnUrl,
    vnp_CreateDate: formatVnpDate(createdAt),
    vnp_ExpireDate: formatVnpDate(expiredAt),
  };
  const secureHash = buildVnpaySignature(params, VNPAY_CONFIG.hashSecret);
  const queryString = new URLSearchParams(params).toString();
  return {
    paymentUrl: `${VNPAY_CONFIG.payUrl}?${queryString}&vnp_SecureHash=${secureHash}`,
    expiredAt,
  };
};

const buildMockPaymentUrl = (
  order: IOrder
): { paymentUrl: string; expiredAt: Date } => ({
  paymentUrl: `mock://pay/${order.orderNumber}`,
  expiredAt: new Date(Date.now() + SESSION_DURATION_MS),
});

export const buildBankTransferInfo = (
  order: IOrder
): {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
} => ({
  ...BANK_TRANSFER_INFO,
  transferContent: order.orderNumber,
});

export const createPayment = async (
  userId: string,
  orderId: string
): Promise<{
  payment: IPayment;
  paymentUrl: string | null;
  bankTransferInfo: ReturnType<typeof buildBankTransferInfo> | null;
}> => {
  const order = await Order.findOne({
    _id: new Types.ObjectId(orderId),
    userId: new Types.ObjectId(userId),
  });

  if (!order) {
    throw createHttpError(404, "Đơn hàng không tồn tại hoặc không thuộc về bạn.");
  }

  if (!["pending", "confirmed"].includes(order.status)) {
    throw createHttpError(400, "Đơn hàng hiện không ở trạng thái có thể thanh toán.");
  }

  if (order.paymentStatus === "paid") {
    throw createHttpError(400, "Đơn hàng đã được thanh toán.");
  }

  const activePayment = await Payment.findOne({
    orderId: order._id,
    status: { $in: ["pending"] },
  }).sort({ createdAt: -1 });

  if (
    activePayment?.paymentUrl &&
    activePayment.expiredAt &&
    activePayment.expiredAt.getTime() > Date.now()
  ) {
    return {
      payment: activePayment,
      paymentUrl: activePayment.paymentUrl,
      bankTransferInfo:
        order.paymentMethod === "BANK" ? buildBankTransferInfo(order) : null,
    };
  }

  if (activePayment) {
    activePayment.status = "failed";
    activePayment.failedReason = "Phiên thanh toán hết hạn.";
    await activePayment.save();
  }

  let paymentUrl: string | null = null;
  let expiredAt: Date | null = null;
  let gatewayOrderId: string | null = null;

  if ((ONLINE_METHODS as readonly string[]).includes(order.paymentMethod)) {
    if (PAYMENT_ENV === "mock") {
      const session = buildMockPaymentUrl(order);
      paymentUrl = session.paymentUrl;
      expiredAt = session.expiredAt;
    } else if (order.paymentMethod === "VNPAY") {
      const session = buildVnpayPaymentUrl(order);
      paymentUrl = session.paymentUrl;
      expiredAt = session.expiredAt;
    } else if (order.paymentMethod === "MOMO") {
      gatewayOrderId = `${order.orderNumber}-${Date.now()}`;
    } else if (order.paymentMethod === "ZALOPAY") {
      gatewayOrderId = `${formatVnpDate(new Date()).slice(4)}_${order.orderNumber}`;
    }
  }

  const payment = await Payment.create({
    orderId: order._id,
    paymentMethod: order.paymentMethod,
    amount: order.totalAmount,
    currency: "VND",
    orderInfo: `Thanh toan don hang ${order.orderNumber}`,
    paymentUrl,
    expiredAt,
    gatewayOrderId,
    status: "pending",
  });

  return {
    payment,
    paymentUrl,
    bankTransferInfo:
      order.paymentMethod === "BANK" ? buildBankTransferInfo(order) : null,
  };
};

export interface GatewayResultInput {
  gateway: PaymentMethod;
  transactionCode: string;
  orderNumber: string;
  amount: number;
  success: boolean;
  message: string;
  rawPayload: Record<string, unknown>;
}

export const applyGatewayResult = async (
  input: GatewayResultInput
): Promise<{ alreadyProcessed: boolean; payment: IPayment }> => {
  const order = await Order.findOne({ orderNumber: input.orderNumber });

  if (!order) {
    throw createHttpError(404, `Không tìm thấy đơn hàng ${input.orderNumber}.`);
  }

  const existingByTransaction = await Payment.findOne({
    transactionCode: input.transactionCode,
  });

  if (existingByTransaction && existingByTransaction.status === "paid") {
    return { alreadyProcessed: true, payment: existingByTransaction };
  }

  if (input.amount !== order.totalAmount) {
    throw createHttpError(
      400,
      "Số tiền giao dịch không khớp với giá trị đơn hàng."
    );
  }

  let payment =
    existingByTransaction ??
    (await Payment.findOne({
      orderId: order._id,
      status: { $in: ["pending"] },
    }).sort({ createdAt: -1 }));

  if (!payment) {
    payment = new Payment({
      orderId: order._id,
      paymentMethod: input.gateway,
      amount: order.totalAmount,
      currency: "VND",
      status: "pending",
    });
  }

  payment.transactionCode = input.transactionCode;
  payment.gatewayResponse = JSON.stringify(input.rawPayload);

  if (input.success) {
    payment.status = "paid";
    payment.paidAt = new Date();
    payment.failedReason = null;
    order.paymentStatus = "paid";
  } else {
    payment.status = "failed";
    payment.failedReason = input.message || "Giao dịch không thành công.";
    if (order.paymentStatus !== "paid") {
      order.paymentStatus = "failed";
    }
  }

  await Promise.all([payment.save(), order.save()]);

  return { alreadyProcessed: false, payment };
};

export const recordCodPayment = async (order: IOrder): Promise<void> => {
  const existing = await Payment.findOne({
    orderId: order._id,
    status: "paid",
  });

  if (existing) {
    return;
  }

  await Payment.create({
    orderId: order._id,
    paymentMethod: "COD",
    transactionCode: `COD-${order.orderNumber}`,
    amount: order.totalAmount,
    currency: "VND",
    orderInfo: `Thanh toán COD đơn hàng ${order.orderNumber}`,
    status: "paid",
    paidAt: new Date(),
  });

  order.paymentStatus = "paid";
  await order.save();
};

export const getMyPayments = async (
  userId: string
): Promise<IPayment[]> => {
  const orders = await Order.find({
    userId: new Types.ObjectId(userId),
  }).select("_id orderNumber status paymentStatus");

  const orderMap = new Map(
    orders.map((order): [string, IOrder] => [order._id.toString(), order])
  );

  const payments = await Payment.find({
    orderId: { $in: orders.map((order) => order._id) },
  })
    .sort({ createdAt: -1 })
    .lean();

  return payments.map((payment) => ({
    ...payment,
    order: orderMap.get(payment.orderId.toString())
      ? {
          orderNumber: orderMap.get(payment.orderId.toString())!.orderNumber,
          status: orderMap.get(payment.orderId.toString())!.status,
        }
      : null,
  })) as unknown as IPayment[];
};

export const getAllPaymentsAdmin = async (query: {
  paymentMethod?: string;
  status?: string;
  orderId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{
  payments: IPayment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { totalPaidAmount: number; totalPaidCount: number; totalRefundedAmount: number };
}> => {
  const page = query.page && query.page > 0 ? query.page : 1;
  const limit = query.limit && query.limit > 0 ? query.limit : 10;

  const filter: any = {};
  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.orderId) {
    filter.orderId = new Types.ObjectId(query.orderId);
  }
  if (query.from || query.to) {
    const createdAtRange: { $gte?: Date; $lte?: Date } = {};
    if (query.from) {
      createdAtRange.$gte = new Date(query.from);
    }
    if (query.to) {
      createdAtRange.$lte = new Date(query.to);
    }
    filter.createdAt = createdAtRange;
  }

  const [payments, total, aggregated] = await Promise.all([
    Payment.find(filter)
      .populate({ path: "orderId", select: "orderNumber customerName status" })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Payment.countDocuments(filter),
    Payment.aggregate<{
      _id: null;
      totalPaidAmount: number;
      totalPaidCount: number;
      totalRefundedAmount: number;
    }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPaidAmount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
          },
          totalPaidCount: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
          },
          totalRefundedAmount: {
            $sum: { $cond: [{ $eq: ["$status", "refunded"] }, "$refundAmount", 0] },
          },
        },
      },
    ]),
  ]);

  const summary = aggregated[0] ?? {
    totalPaidAmount: 0,
    totalPaidCount: 0,
    totalRefundedAmount: 0,
  };

  return {
    payments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary,
  };
};

/**
 * Đánh dấu một giao dịch là đã hoàn tiền và đồng bộ Order liên quan.
 * Dùng chung cho: hoàn tiền thủ công của admin, hủy đơn đã paid, hoàn trả hàng.
 */
const markPaymentRefunded = async (
  payment: IPayment,
  refundAmount: number,
  reason?: string
): Promise<void> => {
  payment.status = "refunded";
  payment.refundAmount = refundAmount;
  payment.refundedAt = new Date();
  payment.refundTransactionCode = `RF-${payment.transactionCode ?? payment._id.toString()}`;
  if (reason) {
    payment.failedReason = reason;
  }
  await payment.save();

  const order = await Order.findById(payment.orderId);
  if (order && order.paymentStatus === "paid") {
    order.paymentStatus = "refunded";
    await order.save();
  }
};

export const refundPaymentAdmin = async (
  paymentId: string,
  refundAmountInput?: number,
  reason?: string
): Promise<IPayment> => {
  const payment = await Payment.findById(new Types.ObjectId(paymentId));

  if (!payment) {
    throw createHttpError(404, "Giao dịch thanh toán không tồn tại.");
  }

  if (payment.status !== "paid") {
    throw createHttpError(400, "Chỉ giao dịch đã thanh toán mới có thể hoàn tiền.");
  }

  const refundAmount =
    refundAmountInput && refundAmountInput <= payment.amount
      ? Math.round(refundAmountInput)
      : payment.amount;

  await markPaymentRefunded(payment, refundAmount, reason);

  return payment;
};

/**
 * Tự động hoàn tiền toàn bộ cho giao dịch "paid" mới nhất của một đơn hàng.
 * Không lỗi khi đơn chưa có giao dịch nào đã thanh toán (bỏ qua im lặng).
 */
export const refundPaidPaymentForOrder = async (
  orderId: Types.ObjectId,
  reason?: string
): Promise<void> => {
  const payment = await Payment.findOne({ orderId, status: "paid" }).sort({
    createdAt: -1,
  });

  if (!payment) {
    return;
  }

  await markPaymentRefunded(payment, payment.amount, reason);
};

export const buildPaymentResultRedirect = (
  orderNumber: string,
  status: "success" | "failed" | "invalid"
): string => {
  return `${CLIENT_URL}/payment/result?order=${encodeURIComponent(orderNumber)}&status=${status}`;
};
