import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Coupon from "../src/models/Coupon.model";
import CouponUsage from "../src/models/CouponUsage.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;

const COUPON_CODES = [
  "SALE10",
  "FIX50K",
  "EXPIRED10",
  "FUTURE10",
  "GLOBAL1",
  "PERUSER1",
  "USED10",
  "TEMP05",
];

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

const customerId = new mongoose.Types.ObjectId().toString();

const customerToken = jwt.sign({ userId: customerId, role: "customer" }, JWT_SECRET, {
  expiresIn: "1h",
});
const adminToken = jwt.sign(
  { userId: new mongoose.Types.ObjectId().toString(), role: "admin" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const preClean = async (): Promise<void> => {
  const coupons = await Coupon.find({ code: { $in: COUPON_CODES } });
  const couponIds = coupons.map((coupon) => coupon._id);
  await CouponUsage.deleteMany({ couponId: { $in: couponIds } });
  await Coupon.deleteMany({ code: { $in: COUPON_CODES } });
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await Coupon.syncIndexes();
  await preClean();

  const publicNoAuth = await call("GET", "/api/coupons/public");
  expect(
    "GET /api/coupons/public không cần token trả 200 danh sách",
    publicNoAuth.status === 200 && Array.isArray(publicNoAuth.json.data),
    `status=${publicNoAuth.status}, type=${Array.isArray(publicNoAuth.json.data)}`
  );

  const createSale10 = await call(
    "POST",
    "/api/admin/coupons",
    {
      code: "SALE10",
      name: "Giảm 10% đơn từ 100k tối đa 50k",
      discountType: "percentage",
      discountValue: 10,
      minimumOrderAmount: 100000,
      maximumDiscountAmount: 50000,
    },
    adminToken
  );
  const sale10Id = createSale10.json.data?.id as string;
  expect(
    "Admin tạo coupon percentage SALE10 thành công 201",
    createSale10.status === 201 && createSale10.json.data?.code === "SALE10",
    `status=${createSale10.status}, id=${sale10Id}`
  );

  const createFix50k = await call(
    "POST",
    "/api/admin/coupons",
    {
      code: "FIX50K",
      name: "Giảm thẳng 50.000đ",
      discountType: "fixed",
      discountValue: 50000,
    },
    adminToken
  );
  expect(
    "Admin tạo coupon fixed FIX50K thành công 201",
    createFix50k.status === 201,
    `status=${createFix50k.status}`
  );

  const duplicateCode = await call(
    "POST",
    "/api/admin/coupons",
    {
      code: "sale10",
      name: "Trùng mã thường",
      discountType: "fixed",
      discountValue: 1000,
    },
    adminToken
  );
  expect(
    "Admin tạo trùng code sale10 bị chặn 400",
    duplicateCode.status === 400 &&
      String(duplicateCode.json.message).includes("đã tồn tại"),
    `status=${duplicateCode.status}, message=${duplicateCode.json.message}`
  );

  const invalidPercentage = await call(
    "POST",
    "/api/admin/coupons",
    {
      code: "BADPCT",
      name: "Phần trăm sai",
      discountType: "percentage",
      discountValue: 150,
    },
    adminToken
  );
  expect(
    "Tạo coupon percentage 150% bị chặn validation 400",
    invalidPercentage.status === 400,
    `status=${invalidPercentage.status}`
  );

  const badCodeChars = await call(
    "POST",
    "/api/admin/coupons",
    {
      code: "BAD CODE!!",
      name: "Mã chứa ký tự lạ",
      discountType: "fixed",
      discountValue: 1000,
    },
    adminToken
  );
  expect(
    "Tạo coupon chứa ký tự đặc biệt bị chặn validation 400",
    badCodeChars.status === 400,
    `status=${badCodeChars.status}`
  );

  await Coupon.create({
    code: "EXPIRED10",
    name: "Mã đã hết hạn",
    discountType: "percentage",
    discountValue: 10,
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  await Coupon.create({
    code: "FUTURE10",
    name: "Mã chưa mở",
    discountType: "percentage",
    discountValue: 10,
    startsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const global1 = await Coupon.create({
    code: "GLOBAL1",
    name: "Mã hết lượt toàn hệ thống",
    discountType: "percentage",
    discountValue: 5,
    usageLimit: 1,
  });
  await Coupon.findByIdAndUpdate(global1._id, { usedCount: 1 });

  const perUser1 = await Coupon.create({
    code: "PERUSER1",
    name: "Mã giới hạn 1 lần mỗi user",
    discountType: "percentage",
    discountValue: 5,
    perUserLimit: 1,
  });
  await CouponUsage.create({
    couponId: perUser1._id,
    userId: new mongoose.Types.ObjectId(customerId),
    orderId: new mongoose.Types.ObjectId(),
    discountAmount: 5000,
  });

  const used10 = await Coupon.create({
    code: "USED10",
    name: "Mã đã có đơn áp dụng",
    discountType: "percentage",
    discountValue: 8,
  });
  await CouponUsage.create({
    couponId: used10._id,
    userId: new mongoose.Types.ObjectId(customerId),
    orderId: new mongoose.Types.ObjectId(),
    discountAmount: 8000,
  });

  await Coupon.create({
    code: "TEMP05",
    name: "Mã tạm để update toggle delete",
    discountType: "fixed",
    discountValue: 20000,
  });

  const publicList = await call("GET", "/api/coupons/public");
  const publicCodes = (publicList.json.data ?? []).map((c: any) => c.code);
  expect(
    "Public list chỉ chứa SALE10/FIX50K/PERUSER1/USED10, ẩn hết hạn/chưa mở/hết lượt",
    publicList.status === 200 &&
      publicCodes.includes("SALE10") &&
      publicCodes.includes("FIX50K") &&
      publicCodes.includes("PERUSER1") &&
      publicCodes.includes("USED10") &&
      !publicCodes.includes("EXPIRED10") &&
      !publicCodes.includes("FUTURE10") &&
      !publicCodes.includes("GLOBAL1"),
    `codes=${JSON.stringify(publicCodes)}`
  );

  const checkSuccess = await call(
    "POST",
    "/api/coupons/check",
    { code: "SALE10", orderAmount: 200000 },
    customerToken
  );
  expect(
    "Check SALE10 đơn 200000 giảm đúng 20000 còn 180000",
    checkSuccess.status === 200 &&
      checkSuccess.json.data?.discountAmount === 20000 &&
      checkSuccess.json.data?.finalAmount === 180000,
    `status=${checkSuccess.status}, discount=${checkSuccess.json.data?.discountAmount}, final=${checkSuccess.json.data?.finalAmount}`
  );

  const checkBelowMin = await call(
    "POST",
    "/api/coupons/check",
    { code: "SALE10", orderAmount: 50000 },
    customerToken
  );
  expect(
    "Check SALE10 đơn dưới mức tối thiểu bị chặn 400",
    checkBelowMin.status === 400 &&
      String(checkBelowMin.json.message).includes("tối thiểu"),
    `status=${checkBelowMin.status}, message=${checkBelowMin.json.message}`
  );

  const checkCap = await call(
    "POST",
    "/api/coupons/check",
    { code: "SALE10", orderAmount: 1000000 },
    customerToken
  );
  expect(
    "Check SALE10 đơn 1000000 bị chặn trần giảm tối đa 50000",
    checkCap.status === 200 &&
      checkCap.json.data?.discountAmount === 50000 &&
      checkCap.json.data?.finalAmount === 950000,
    `status=${checkCap.status}, discount=${checkCap.json.data?.discountAmount}`
  );

  const checkFixedOverAmount = await call(
    "POST",
    "/api/coupons/check",
    { code: "FIX50K", orderAmount: 30000 },
    customerToken
  );
  expect(
    "Check FIX50K đơn 30000 chỉ giảm tối đa bằng giá trị đơn còn 0",
    checkFixedOverAmount.status === 200 &&
      checkFixedOverAmount.json.data?.discountAmount === 30000 &&
      checkFixedOverAmount.json.data?.finalAmount === 0,
    `status=${checkFixedOverAmount.status}, discount=${checkFixedOverAmount.json.data?.discountAmount}`
  );

  const checkExpired = await call(
    "POST",
    "/api/coupons/check",
    { code: "EXPIRED10", orderAmount: 500000 },
    customerToken
  );
  expect(
    "Check mã hết hạn bị chặn 400",
    checkExpired.status === 400 && String(checkExpired.json.message).includes("hết hạn"),
    `status=${checkExpired.status}, message=${checkExpired.json.message}`
  );

  const checkFuture = await call(
    "POST",
    "/api/coupons/check",
    { code: "FUTURE10", orderAmount: 500000 },
    customerToken
  );
  expect(
    "Check mã chưa mở bị chặn 400",
    checkFuture.status === 400 && String(checkFuture.json.message).includes("chưa"),
    `status=${checkFuture.status}, message=${checkFuture.json.message}`
  );

  const checkGlobalLimit = await call(
    "POST",
    "/api/coupons/check",
    { code: "GLOBAL1", orderAmount: 500000 },
    customerToken
  );
  expect(
    "Check mã hết lượt toàn hệ thống bị chặn 400",
    checkGlobalLimit.status === 400 &&
      String(checkGlobalLimit.json.message).includes("hết lượt"),
    `status=${checkGlobalLimit.status}, message=${checkGlobalLimit.json.message}`
  );

  const checkPerUserLimit = await call(
    "POST",
    "/api/coupons/check",
    { code: "PERUSER1", orderAmount: 500000 },
    customerToken
  );
  expect(
    "Check mã vượt giới hạn từng user bị chặn 400",
    checkPerUserLimit.status === 400 &&
      String(checkPerUserLimit.json.message).includes("số lần cho phép"),
    `status=${checkPerUserLimit.status}, message=${checkPerUserLimit.json.message}`
  );

  const checkUnknown = await call(
    "POST",
    "/api/coupons/check",
    { code: "KHONGTONTAI99", orderAmount: 500000 },
    customerToken
  );
  expect(
    "Check mã không tồn tại bị chặn 400",
    checkUnknown.status === 404 &&
      String(checkUnknown.json.message).includes("không tồn tại"),
    `status=${checkUnknown.status}`
  );

  const customerCreate = await call(
    "POST",
    "/api/admin/coupons",
    { code: "HACK01", name: "User thường tạo mã", discountType: "fixed", discountValue: 1000 },
    customerToken
  );
  const customerList = await call("GET", "/api/admin/coupons", undefined, customerToken);
  const noAuthList = await call("GET", "/api/admin/coupons");
  expect(
    "User thường bị chặn 403 và không đăng nhập bị chặn 401 trên admin routes",
    customerCreate.status === 403 && customerList.status === 403 && noAuthList.status === 401,
    `create=${customerCreate.status}, list=${customerList.status}, noAuth=${noAuthList.status}`
  );

  const adminListSearch = await call(
    "GET",
    "/api/admin/coupons?search=SALE10&page=1&limit=10",
    undefined,
    adminToken
  );
  expect(
    "Admin list tìm kiếm SALE10 kèm phân trang",
    adminListSearch.status === 200 &&
      adminListSearch.json.pagination?.page === 1 &&
      (adminListSearch.json.data ?? []).some((c: any) => c.code === "SALE10"),
    `status=${adminListSearch.status}, total=${adminListSearch.json.pagination?.total}`
  );

  const adminDetail = await call("GET", `/api/admin/coupons/${sale10Id}`, undefined, adminToken);
  expect(
    "Admin chi tiết coupon SALE10 kèm tổng tiền đã giảm = 0",
    adminDetail.status === 200 &&
      adminDetail.json.data?.code === "SALE10" &&
      adminDetail.json.data?.totalDiscountAmountGiven === 0,
    `status=${adminDetail.status}, given=${adminDetail.json.data?.totalDiscountAmountGiven}`
  );

  const adminUsages = await call(
    "GET",
    `/api/admin/coupons/${used10._id.toString()}/usages`,
    undefined,
    adminToken
  );
  expect(
    "Admin xem lịch sử Used10 có 1 lượt dùng",
    adminUsages.status === 200 &&
      (adminUsages.json.data ?? []).length === 1 &&
      adminUsages.json.pagination?.total === 1,
    `status=${adminUsages.status}, items=${(adminUsages.json.data ?? []).length}`
  );

  const temp05 = await Coupon.findOne({ code: "TEMP05" });
  const updateCoupon = await call(
    "PUT",
    `/api/admin/coupons/${temp05?._id.toString()}`,
    { name: "Mã tạm đã cập nhật", minimumOrderAmount: 50000 },
    adminToken
  );
  expect(
    "PUT cập nhật coupon đổi tên và min order thành công",
    updateCoupon.status === 200 &&
      updateCoupon.json.data?.name === "Mã tạm đã cập nhật" &&
      updateCoupon.json.data?.minimumOrderAmount === 50000,
    `status=${updateCoupon.status}, name=${updateCoupon.json.data?.name}`
  );

  const toggleStatus = await call(
    "PATCH",
    `/api/admin/coupons/${temp05?._id.toString()}/status`,
    undefined,
    adminToken
  );
  expect(
    "PATCH status toggle isActive true -> false",
    toggleStatus.status === 200 && toggleStatus.json.data?.isActive === false,
    `status=${toggleStatus.status}, isActive=${toggleStatus.json.data?.isActive}`
  );

  const adminListInactive = await call(
    "GET",
    "/api/admin/coupons?isActive=false&limit=100",
    undefined,
    adminToken
  );
  expect(
    "Admin list lọc isActive=false chứa TEMP05",
    adminListInactive.status === 200 &&
      (adminListInactive.json.data ?? []).some((c: any) => c.code === "TEMP05"),
    `status=${adminListInactive.status}`
  );

  const deleteUsed = await call(
    "DELETE",
    `/api/admin/coupons/${used10._id.toString()}`,
    undefined,
    adminToken
  );
  expect(
    "DELETE coupon đã phát sinh lượt dùng bị chặn 400",
    deleteUsed.status === 400 &&
      String(deleteUsed.json.message).includes("Không thể xóa"),
    `status=${deleteUsed.status}, message=${deleteUsed.json.message}`
  );

  const deleteUnused = await call(
    "DELETE",
    `/api/admin/coupons/${temp05?._id.toString()}`,
    undefined,
    adminToken
  );
  const temp05AfterDelete = await Coupon.countDocuments({ code: "TEMP05" });
  expect(
    "DELETE coupon chưa sử dụng thành công",
    deleteUnused.status === 200 && temp05AfterDelete === 0,
    `status=${deleteUnused.status}, remaining=${temp05AfterDelete}`
  );

  await preClean();

  const remainingCoupons = await Coupon.countDocuments({ code: { $in: COUPON_CODES } });
  expect(
    "Dọn dữ liệu test sạch sẽ",
    remainingCoupons === 0,
    `coupons=${remainingCoupons}`
  );

  console.log("\n========================================");
  console.log(`COUPON TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
