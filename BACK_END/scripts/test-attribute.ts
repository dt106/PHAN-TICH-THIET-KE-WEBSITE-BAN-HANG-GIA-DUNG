import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Attribute from "../src/models/Attribute.model";
import AttributeValue from "../src/models/AttributeValue.model";
import VariantAttribute from "../src/models/VariantAttribute.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;
const ATTRIBUTE_NAME = "Màu Sắc Test";
const ATTRIBUTE_SLUG = "mau-sac-test";
const VALUE_RED = "Đỏ Test";
const VALUE_BLUE = "Xanh Dương Test";

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

const preClean = async (): Promise<void> => {
  const attribute = await Attribute.findOne({ slug: ATTRIBUTE_SLUG });
  if (attribute) {
    await VariantAttribute.deleteMany({ attributeId: attribute._id });
    await AttributeValue.deleteMany({ attributeId: attribute._id });
    await Attribute.deleteOne({ _id: attribute._id });
  }
};

const main = async (): Promise<void> => {
  await connectDatabase();
  await preClean();

  const adminToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "admin" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const customerToken = jwt.sign(
    { userId: new mongoose.Types.ObjectId().toString(), role: "customer" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const noAuth = await call("POST", "/api/admin/attributes", { name: "Test" });
  expect(
    "RBAC: tạo thuộc tính không có token bị chặn",
    noAuth.status === 401,
    `status=${noAuth.status}`
  );

  const customer = await call(
    "POST",
    "/api/admin/attributes",
    { name: "Test" },
    customerToken
  );
  expect(
    "RBAC: customer không được tạo thuộc tính",
    customer.status === 403,
    `status=${customer.status}`
  );

  const createAttribute = await call(
    "POST",
    "/api/admin/attributes",
    { name: ATTRIBUTE_NAME },
    adminToken
  );
  expect(
    "Tạo thuộc tính 'Màu Sắc Test' tự sinh slug",
    createAttribute.status === 201 && createAttribute.json.data?.slug === ATTRIBUTE_SLUG,
    `status=${createAttribute.status}, slug=${createAttribute.json.data?.slug}`
  );
  const attributeId = createAttribute.json.data?.id as string;

  const duplicateAttribute = await call(
    "POST",
    "/api/admin/attributes",
    { name: ATTRIBUTE_NAME },
    adminToken
  );
  expect(
    "Tạo trùng slug thuộc tính bị chặn",
    duplicateAttribute.status === 400,
    `status=${duplicateAttribute.status}, message=${duplicateAttribute.json.message}`
  );

  const invalidValue = await call(
    "POST",
    `/api/admin/attributes/${attributeId}/values`,
    { value: "" },
    adminToken
  );
  expect(
    "Validate: tạo giá trị rỗng trả 400",
    invalidValue.status === 400,
    `status=${invalidValue.status}`
  );

  const createRed = await call(
    "POST",
    `/api/admin/attributes/${attributeId}/values`,
    { value: VALUE_RED },
    adminToken
  );
  expect(
    "Tạo giá trị 'Đỏ Test' thành công",
    createRed.status === 201 && createRed.json.data?.slug === "do-test",
    `status=${createRed.status}, slug=${createRed.json.data?.slug}`
  );
  const redValueId = createRed.json.data?.id as string;

  const duplicateRed = await call(
    "POST",
    `/api/admin/attributes/${attributeId}/values`,
    { value: VALUE_RED },
    adminToken
  );
  expect(
    "Tạo giá trị trùng trong cùng thuộc tính bị chặn",
    duplicateRed.status === 400,
    `status=${duplicateRed.status}, message=${duplicateRed.json.message}`
  );

  const createBlue = await call(
    "POST",
    `/api/admin/attributes/${attributeId}/values`,
    { value: VALUE_BLUE },
    adminToken
  );
  expect(
    "Tạo giá trị 'Xanh Dương Test' tự bỏ dấu slug",
    createBlue.status === 201 && createBlue.json.data?.slug === "xanh-duong-test",
    `status=${createBlue.status}, slug=${createBlue.json.data?.slug}`
  );

  const publicList = await call("GET", "/api/attributes");
  const matchedAttribute = Array.isArray(publicList.json.data)
    ? publicList.json.data.find((item: any) => item.slug === ATTRIBUTE_SLUG)
    : null;
  expect(
    "GET public trả thuộc tính kèm mảng values lồng",
    publicList.status === 200 &&
      matchedAttribute &&
      matchedAttribute.values.length === 2,
    `status=${publicList.status}, values=${matchedAttribute?.values?.length}`
  );

  const byId = await call("GET", `/api/attributes/${attributeId}`);
  expect(
    "GET /:id trả chi tiết thuộc tính kèm values",
    byId.status === 200 && byId.json.data?.values?.length === 2,
    `status=${byId.status}, values=${byId.json.data?.values?.length}`
  );

  const updateAttribute = await call(
    "PUT",
    `/api/admin/attributes/${attributeId}`,
    { name: "Màu Sắc Đã Sửa" },
    adminToken
  );
  expect(
    "Cập nhật tên thuộc tính thành công",
    updateAttribute.status === 200 && updateAttribute.json.data?.name === "Màu Sắc Đã Sửa",
    `status=${updateAttribute.status}, name=${updateAttribute.json.data?.name}`
  );

  const updateRed = await call(
    "PUT",
    `/api/admin/attributes/values/${redValueId}`,
    { value: "Đỏ Đậm Test" },
    adminToken
  );
  expect(
    "Cập nhật giá trị tự sinh lại slug",
    updateRed.status === 200 && updateRed.json.data?.slug === "do-dam-test",
    `status=${updateRed.status}, slug=${updateRed.json.data?.slug}`
  );

  const fakeVariantId = new mongoose.Types.ObjectId();
  const linkedValue = await VariantAttribute.create({
    variantId: fakeVariantId,
    attributeId,
    attributeValueId: redValueId,
  });

  const deleteLinkedValue = await call(
    "DELETE",
    `/api/admin/attributes/values/${redValueId}`,
    undefined,
    adminToken
  );
  expect(
    "Chặn xóa giá trị đang được biến thể sử dụng",
    deleteLinkedValue.status === 400,
    `status=${deleteLinkedValue.status}, message=${deleteLinkedValue.json.message}`
  );

  const deleteLinkedAttribute = await call(
    "DELETE",
    `/api/admin/attributes/${attributeId}`,
    undefined,
    adminToken
  );
  expect(
    "Chặn xóa thuộc tính đang được biến thể sử dụng",
    deleteLinkedAttribute.status === 400,
    `status=${deleteLinkedAttribute.status}, message=${deleteLinkedAttribute.json.message}`
  );

  await VariantAttribute.deleteOne({ _id: linkedValue._id });

  const deleteBlue = await call(
    "DELETE",
    `/api/admin/attributes/values/${createBlue.json.data?.id}`,
    undefined,
    adminToken
  );
  expect(
    "Xóa giá trị không ràng buộc thành công",
    deleteBlue.status === 200,
    `status=${deleteBlue.status}`
  );

  const deleteAttribute = await call(
    "DELETE",
    `/api/admin/attributes/${attributeId}`,
    undefined,
    adminToken
  );
  expect(
    "Xóa thuộc tính cascade giá trị còn lại",
    deleteAttribute.status === 200,
    `status=${deleteAttribute.status}, message=${deleteAttribute.json.message}`
  );

  const orphanValues = await AttributeValue.countDocuments({ attributeId });
  expect(
    "Không còn giá trị mồ côi sau khi xóa thuộc tính",
    orphanValues === 0,
    `orphanValues=${orphanValues}`
  );

  const afterDelete = await call("GET", `/api/attributes/${attributeId}`);
  expect(
    "GET thuộc tính đã xóa trả 404",
    afterDelete.status === 404,
    `status=${afterDelete.status}`
  );

  console.log("\n========================================");
  console.log(`ATTRIBUTE TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
