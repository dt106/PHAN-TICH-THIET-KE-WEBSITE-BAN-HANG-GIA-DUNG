import assert from "node:assert/strict";
import crypto from "node:crypto";

process.env.MOMO_ACCESS_KEY = "test-access";
process.env.MOMO_SECRET_KEY = "test-secret";

const main = async () => {
  const { verifyMomoCallback, momoOrderNumber } =
    (await import("../src/services/payment.service.js")) as any;

  const result: Record<string, string> = {
    partnerCode: "MOMO",
    orderId: "DH-20261116-123456-1763300000000",
    requestId: "DH-20261116-123456-1763300000000",
    amount: "694200",
    orderInfo: "Thanh toan don hang DH-20261116-123456",
    orderType: "momo_wallet",
    transId: "4088878653",
    resultCode: "0",
    message: "Thành công.",
    payType: "qr",
    responseTime: "1763300012345",
    extraData: "",
  };

  // Chuỗi ký viết tay đúng như tài liệu MoMo, không dùng lại code đang test.
  const raw =
    `accessKey=test-access&amount=${result.amount}&extraData=&message=${result.message}` +
    `&orderId=${result.orderId}&orderInfo=${result.orderInfo}&orderType=${result.orderType}` +
    `&partnerCode=${result.partnerCode}&payType=${result.payType}&requestId=${result.requestId}` +
    `&responseTime=${result.responseTime}&resultCode=${result.resultCode}&transId=${result.transId}`;
  const signature = crypto
    .createHmac("sha256", "test-secret")
    .update(raw)
    .digest("hex");

  assert.equal(
    verifyMomoCallback({ ...result, signature }),
    true,
    "chữ ký hợp lệ phải qua",
  );
  assert.equal(
    verifyMomoCallback({ ...result, amount: "1", signature }),
    false,
    "sửa số tiền phải bị chặn",
  );
  assert.equal(verifyMomoCallback(result), false, "thiếu chữ ký phải bị chặn");
  assert.equal(momoOrderNumber(result.orderId), "DH-20261116-123456");

  console.log("✅ MoMo signature: OK");
};

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
