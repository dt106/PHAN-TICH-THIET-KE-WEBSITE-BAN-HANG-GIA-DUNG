import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/payment.service";
import { PAYMENT_ENV } from "../config/payment";

// Trích message lỗi; chỉ dùng cho body giao thức gateway (vnpay/momo/zalopay luôn trả HTTP 200).
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Lỗi không xác định.";

const toPositiveInt = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const createPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await paymentService.createPayment(userId, req.body.orderId);
    return res.status(201).json({
      success: true,
      message: "Tạo phiên thanh toán thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payments = await paymentService.getMyPayments(req.user!.userId);
    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử thanh toán thành công.",
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

export const vnpayReturn = async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query as Record<string, string>;

  if (!paymentService.verifyVnpayCallback(query)) {
    return res.redirect(paymentService.buildPaymentResultRedirect(query.vnp_TxnRef ?? "", "invalid"));
  }

  const success = query.vnp_ResponseCode === "00";

  try {
    await paymentService.applyGatewayResult({
      gateway: "VNPAY",
      transactionCode: query.vnp_TransactionNo ?? query.vnp_TxnRef,
      orderNumber: query.vnp_TxnRef,
      amount: Number(query.vnp_Amount) / 100,
      success,
      message: query.vnp_Message,
      rawPayload: query,
    });
  } catch (error) {
    return res.redirect(paymentService.buildPaymentResultRedirect(query.vnp_TxnRef, "invalid"));
  }

  return res.redirect(
    paymentService.buildPaymentResultRedirect(query.vnp_TxnRef, success ? "success" : "failed")
  );
};

export const vnpayIpn = async (req: Request, res: Response, next: NextFunction) => {
  const query = req.query as Record<string, string>;

  if (!paymentService.verifyVnpayCallback(query)) {
    return res.status(200).json({ RspCode: "97", Message: "Invalid Checksum" });
  }

  try {
    const result = await paymentService.applyGatewayResult({
      gateway: "VNPAY",
      transactionCode: query.vnp_TransactionNo ?? query.vnp_TxnRef,
      orderNumber: query.vnp_TxnRef,
      amount: Number(query.vnp_Amount) / 100,
      success: query.vnp_ResponseCode === "00",
      message: query.vnp_Message,
      rawPayload: query,
    });

    if (result.alreadyProcessed) {
      return res.status(200).json({ RspCode: "02", Message: "Order already confirmed" });
    }

    return res.status(200).json({ RspCode: "00", Message: "Confirm Success" });
  } catch (error) {
    return res.status(200).json({ RspCode: "99", Message: getErrorMessage(error) });
  }
};

export const momoIpn = async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body as Record<string, string>;

  if (!paymentService.verifyMomoCallback(body)) {
    return res.status(200).json({ resultCode: 42, message: "Invalid signature" });
  }

  const orderNumber = String(body.orderId ?? "").replace(/-\d+$/, "");

  try {
    await paymentService.applyGatewayResult({
      gateway: "MOMO",
      transactionCode: String(body.transId ?? body.orderId),
      orderNumber,
      amount: Number(body.amount),
      success: Number(body.resultCode) === 0,
      message: body.message,
      rawPayload: body,
    });
    return res.status(200).json({ resultCode: 0, message: "Thành công" });
  } catch (error) {
    return res.status(200).json({ resultCode: 99, message: getErrorMessage(error) });
  }
};

export const zalopayCallback = async (req: Request, res: Response, next: NextFunction) => {
  const { data, mac } = req.body as { data?: string; mac?: string };

  if (!paymentService.verifyZalopayCallback(data ?? "", mac ?? "")) {
    return res.status(200).json({ return_code: 0, return_message: "mac not equal" });
  }

  const parsed = JSON.parse(data ?? "{}") as {
    apptransid?: string;
    zptransid?: string;
    amount?: number;
    status?: number;
  };
  const orderNumber = String(parsed.apptransid ?? "").split("_").slice(1).join("_");

  try {
    await paymentService.applyGatewayResult({
      gateway: "ZALOPAY",
      transactionCode: String(parsed.zptransid ?? parsed.apptransid),
      orderNumber,
      amount: Number(parsed.amount),
      success: Number(parsed.status) === 1,
      message: `ZaloPay status ${parsed.status}`,
      rawPayload: parsed as unknown as Record<string, unknown>,
    });
    return res.status(200).json({ return_code: 1, return_message: "Thành công" });
  } catch (error) {
    return res.status(200).json({ return_code: 0, return_message: getErrorMessage(error) });
  }
};

export const mockComplete = async (req: Request, res: Response, next: NextFunction) => {
  if (PAYMENT_ENV !== "mock") {
    return res.status(404).json({ success: false, message: "API không tồn tại" });
  }

  try {
    const success = req.body.success !== false;
    const result = await paymentService.applyGatewayResult({
      gateway: "VNPAY",
      transactionCode: `MOCK-${req.body.orderNumber}`,
      orderNumber: req.body.orderNumber,
      amount: Number(req.body.amount),
      success,
      message: success ? "Mock success" : "Mock failed",
      rawPayload: { source: "mock", ...req.body },
    });
    return res.status(200).json({
      success: true,
      message: "Đã áp dụng kết quả thanh toán mock.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPaymentsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await paymentService.getAllPaymentsAdmin({
      paymentMethod: req.query.paymentMethod as string | undefined,
      status: req.query.status as string | undefined,
      orderId: req.query.orderId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: toPositiveInt(req.query.page),
      limit: toPositiveInt(req.query.limit),
    });
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thanh toán thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refundPaymentAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await paymentService.refundPaymentAdmin(
      String(req.params.id),
      req.body.amount,
      req.body.reason
    );
    return res.status(200).json({
      success: true,
      message: "Hoàn tiền giao dịch thành công.",
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};
