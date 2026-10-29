import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDatabase from "../src/config/database";
import Category from "../src/models/Category.model";

dotenv.config();

const BASE_URL = `http://127.0.0.1:${process.env.PORT || 5000}`;
const JWT_SECRET = process.env.JWT_SECRET as string;
const PARENT_SLUG = "do-gia-dung-bep";
const CHILD_SLUG = "noi-com-dien";
const GRANDCHILD_SLUG = "noi-chien";

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
  await Category.deleteMany({ slug: { $in: [PARENT_SLUG, CHILD_SLUG, GRANDCHILD_SLUG] } });
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

  const noAuth = await call("POST", "/api/admin/categories", { name: "Test" });
  expect(
    "RBAC: tạo danh mục không có token bị chặn",
    noAuth.status === 401,
    `status=${noAuth.status}`
  );

  const customer = await call(
    "POST",
    "/api/admin/categories",
    { name: "Test" },
    customerToken
  );
  expect(
    "RBAC: customer không được tạo danh mục",
    customer.status === 403,
    `status=${customer.status}`
  );

  const invalidBody = await call("POST", "/api/admin/categories", {}, adminToken);
  expect(
    "Validate: tạo thiếu tên danh mục trả 400",
    invalidBody.status === 400,
    `status=${invalidBody.status}`
  );

  const createParent = await call(
    "POST",
    "/api/admin/categories",
    { name: "Đồ Gia Dụng Bếp", description: "Danh mục gốc" },
    adminToken
  );
  expect(
    "Tạo danh mục gốc 'Đồ Gia Dụng Bếp'",
    createParent.status === 201 &&
      createParent.json.data?.slug === PARENT_SLUG &&
      createParent.json.data?.isActive === true,
    `status=${createParent.status}, slug=${createParent.json.data?.slug}`
  );
  const parentId = createParent.json.data?.id as string;

  const duplicateSlug = await call(
    "POST",
    "/api/admin/categories",
    { name: "Đồ Gia Dụng Bếp" },
    adminToken
  );
  expect(
    "Tạo trùng slug danh mục bị chặn",
    duplicateSlug.status === 400,
    `status=${duplicateSlug.status}, message=${duplicateSlug.json.message}`
  );

  const createChild = await call(
    "POST",
    "/api/admin/categories",
    { name: "Nồi Cơm Điện", parentId, sortOrder: 2 },
    adminToken
  );
  expect(
    "Tạo danh mục con 'Nồi Cơm Điện' có parentId",
    createChild.status === 201 && createChild.json.data?.slug === CHILD_SLUG,
    `status=${createChild.status}, slug=${createChild.json.data?.slug}`
  );
  const childId = createChild.json.data?.id as string;

  const createGrandchild = await call(
    "POST",
    "/api/admin/categories",
    { name: "Nồi Chiên Không Dầu", parentId: childId },
    adminToken
  );
  expect(
    "Tạo danh mục cấp 3 'Nồi Chiên Không Dầu'",
    createGrandchild.status === 201,
    `status=${createGrandchild.status}`
  );
  const grandchildId = createGrandchild.json.data?.id as string;

  const tree = await call("GET", "/api/categories/tree");
  const parentNode = Array.isArray(tree.json.data)
    ? tree.json.data.find((node: any) => node.slug === PARENT_SLUG)
    : null;
  const childNode = parentNode?.children?.find((node: any) => node.slug === CHILD_SLUG);
  expect(
    "GET /tree trả về cây cha-con lồng đúng",
    tree.status === 200 && Boolean(parentNode) && childNode?.slug === CHILD_SLUG,
    `status=${tree.status}, children=${JSON.stringify(parentNode?.children?.map((c: any) => c.slug))}`
  );

  const publicList = await call("GET", "/api/categories");
  const publicSlugs = Array.isArray(publicList.json.data)
    ? publicList.json.data.map((item: any) => item.slug)
    : [];
  expect(
    "GET public danh sách chỉ chứa danh mục đang active",
    publicList.status === 200 &&
      publicSlugs.includes(PARENT_SLUG) &&
      publicSlugs.includes(CHILD_SLUG),
    `status=${publicList.status}, total=${publicList.json.pagination?.total}`
  );

  const bySlug = await call("GET", `/api/categories/slug/${PARENT_SLUG}`);
  const subSlugs = Array.isArray(bySlug.json.data?.subCategories)
    ? bySlug.json.data.subCategories.map((item: any) => item.slug)
    : [];
  expect(
    "GET /slug/:slug trả chi tiết kèm danh mục con",
    bySlug.status === 200 && subSlugs.includes(CHILD_SLUG),
    `status=${bySlug.status}, subCategories=${JSON.stringify(subSlugs)}`
  );

  const byId = await call("GET", `/api/categories/${parentId}`);
  expect(
    "GET /:id trả chi tiết danh mục",
    byId.status === 200 && byId.json.data?.id === parentId,
    `status=${byId.status}`
  );

  const adminListNoAuth = await call("GET", "/api/admin/categories/all");
  expect(
    "RBAC: admin list không có token bị chặn",
    adminListNoAuth.status === 401,
    `status=${adminListNoAuth.status}`
  );

  const adminList = await call(
    "GET",
    "/api/admin/categories/all?page=1&limit=10",
    undefined,
    adminToken
  );
  expect(
    "GET /admin/all phân trang cho admin",
    adminList.status === 200 && adminList.json.pagination?.limit === 10,
    `status=${adminList.status}, total=${adminList.json.pagination?.total}`
  );

  const selfParent = await call(
    "PUT",
    `/api/admin/categories/${parentId}`,
    { parentId },
    adminToken
  );
  expect(
    "Chặn gán chính nó làm danh mục cha",
    selfParent.status === 400,
    `status=${selfParent.status}, message=${selfParent.json.message}`
  );

  const cycleUpdate = await call(
    "PUT",
    `/api/admin/categories/${childId}`,
    { parentId: grandchildId },
    adminToken
  );
  expect(
    "Chặn vòng lặp cha-con gián tiếp (con trỏ lên cháu)",
    cycleUpdate.status === 400,
    `status=${cycleUpdate.status}, message=${cycleUpdate.json.message}`
  );

  const updateCategory = await call(
    "PUT",
    `/api/admin/categories/${childId}`,
    { description: "Nồi cơm điện thông minh" },
    adminToken
  );
  expect(
    "Cập nhật danh mục thành công",
    updateCategory.status === 200 &&
      updateCategory.json.data?.description === "Nồi cơm điện thông minh",
    `status=${updateCategory.status}`
  );

  const toggleOff = await call(
    "PATCH",
    `/api/admin/categories/${childId}/status`,
    { isActive: false },
    adminToken
  );
  const hiddenDetail = await call("GET", `/api/categories/slug/${CHILD_SLUG}`);
  expect(
    "Ẩn danh mục thì public không còn thấy",
    toggleOff.status === 200 && hiddenDetail.status === 404,
    `toggle=${toggleOff.status}, detail=${hiddenDetail.status}`
  );

  const toggleOn = await call(
    "PATCH",
    `/api/admin/categories/${childId}/status`,
    { isActive: true },
    adminToken
  );
  expect(
    "Bật lại danh mục thành công",
    toggleOn.status === 200 && toggleOn.json.data?.isActive === true,
    `status=${toggleOn.status}`
  );

  const sortUpdate = await call(
    "PUT",
    "/api/admin/categories/sort-order",
    { items: [{ id: childId, sortOrder: 7 }] },
    adminToken
  );
  const sortedDetail = await call("GET", `/api/categories/${childId}`);
  expect(
    "Cập nhật thứ tự sắp xếp hàng loạt",
    sortUpdate.status === 200 && sortedDetail.json.data?.sortOrder === 7,
    `sort=${sortUpdate.status}, sortOrder=${sortedDetail.json.data?.sortOrder}`
  );

  const deleteParentWithChildren = await call(
    "DELETE",
    `/api/admin/categories/${parentId}`,
    undefined,
    adminToken
  );
  expect(
    "Chặn xóa danh mục còn danh mục con",
    deleteParentWithChildren.status === 400,
    `status=${deleteParentWithChildren.status}, message=${deleteParentWithChildren.json.message}`
  );

  const deleteGrandchild = await call(
    "DELETE",
    `/api/admin/categories/${grandchildId}`,
    undefined,
    adminToken
  );
  const deleteChild = await call(
    "DELETE",
    `/api/admin/categories/${childId}`,
    undefined,
    adminToken
  );
  const deleteParent = await call(
    "DELETE",
    `/api/admin/categories/${parentId}`,
    undefined,
    adminToken
  );
  expect(
    "Xóa lá rồi xóa cha thành công (dọn dữ liệu)",
    deleteGrandchild.status === 200 &&
      deleteChild.status === 200 &&
      deleteParent.status === 200,
    `grandchild=${deleteGrandchild.status}, child=${deleteChild.status}, parent=${deleteParent.status}`
  );

  const afterDelete = await call("GET", `/api/categories/${parentId}`);
  expect(
    "GET danh mục đã xóa trả 404",
    afterDelete.status === 404,
    `status=${afterDelete.status}`
  );

  console.log("\n========================================");
  console.log(`CATEGORY TEST SUMMARY: ${passed} PASS, ${failed} FAIL`);
  console.log("========================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
};

main().catch(async (error) => {
  console.error("LỖI CHẠY TEST:", error);
  await mongoose.disconnect();
  process.exit(1);
});
