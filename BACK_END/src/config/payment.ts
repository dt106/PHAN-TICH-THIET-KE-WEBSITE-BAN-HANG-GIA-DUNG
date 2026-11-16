export type PaymentEnvironment = "sandbox" | "production" | "mock";

const rawEnv = process.env.PAYMENT_ENV || "sandbox";

export const PAYMENT_ENV: PaymentEnvironment = (["sandbox", "production", "mock"] as const).includes(
  rawEnv as PaymentEnvironment
)
  ? (rawEnv as PaymentEnvironment)
  : "sandbox";

export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

export const VNPAY_CONFIG = {
  tmnCode: process.env.VNP_TMN_CODE || "SANDBOX_TMN_CODE",
  hashSecret: process.env.VNP_HASH_SECRET || "SANDBOX_HASH_SECRET",
  payUrl:
    process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
  returnUrl:
    process.env.VNP_RETURN_URL ||
    "http://localhost:5000/api/payments/vnpay/return",
  version: "2.1.0",
};

export const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE || "MOMOBKUN20180529",
  accessKey: process.env.MOMO_ACCESS_KEY || "",
  secretKey: process.env.MOMO_SECRET_KEY || "",
  endpoint: process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn",
  redirectUrl:
    process.env.MOMO_REDIRECT_URL ||
    "http://localhost:5000/api/payments/momo/return",
  ipnUrl:
    process.env.MOMO_IPN_URL || "http://localhost:5000/api/payments/momo/ipn",
};

export const ZALOPAY_CONFIG = {
  appId: Number(process.env.ZALOPAY_APP_ID || 2553),
  key1: process.env.ZALOPAY_KEY1 || "",
  key2: process.env.ZALOPAY_KEY2 || "",
  endpoint: process.env.ZALOPAY_ENDPOINT || "https://sandbox.zalopay.com.vn",
};

export const BANK_TRANSFER_INFO = {
  bankName: process.env.BANK_NAME || "Vietcombank",
  accountNumber: process.env.BANK_ACCOUNT_NO || "0000000000",
  accountHolder: process.env.BANK_ACCOUNT_HOLDER || "CONG TY GIA DUNG MAU",
};

export const ONLINE_METHODS = ["MOMO", "VNPAY", "ZALOPAY"] as const;
