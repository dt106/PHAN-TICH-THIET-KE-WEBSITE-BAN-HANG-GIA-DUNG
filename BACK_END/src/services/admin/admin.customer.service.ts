/**
 * FILE: BACK_END/src/services/admin/admin.customer.service.ts
 *
 * NHIỆM VỤ:
 * - Lấy danh sách khách hàng có phân trang.
 * - Tìm kiếm theo tên, email, số điện thoại.
 * - Lọc theo trạng thái.
 * - Sắp xếp danh sách.
 * - Lấy chi tiết khách hàng.
 * - Cập nhật trạng thái khách hàng.
 *
 * KHÔNG XỬ LÝ:
 * - Thống kê khách hàng.
 * - Lấy tất cả khách hàng không phân trang.
 * - Quản lý tài khoản admin.
 * - Xóa tài khoản khách hàng.
 */

import { Types } from "mongoose";
import { AppError } from "../../utils/appError";
import { User } from "../../models";

type CustomerStatus = "active" | "inactive" | "blocked";
type CustomerSortField = "createdAt" | "name" | "email";
type SortOrder = "asc" | "desc";

interface GetAdminCustomersParams {
  keyword?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}

/**
 * Chỉ cho phép từ khóa được hiểu là văn bản thông thường,
 * không cho phép người dùng chèn biểu thức regex tùy ý.
 */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Chuẩn hóa số nguyên dương.
 */
const normalizePositiveInteger = (
  value: number | undefined,
  defaultValue: number,
  maxValue?: number
): number => {
  if (
    value === undefined ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    return defaultValue;
  }

  return maxValue === undefined
    ? value
    : Math.min(value, maxValue);
};

/**
 * LẤY DANH SÁCH KHÁCH HÀNG
 *
 * GET /api/admin/customers
 *
 * Query:
 * - keyword
 * - status
 * - page
 * - limit
 * - sortBy
 * - sortOrder
 *
 * Luôn phân trang, không có chế độ lấy tất cả.
 */
export const getAdminCustomersService = async (
  params: GetAdminCustomersParams
) => {
  const {
    keyword,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = params;

  const page = normalizePositiveInteger(params.page, 1);
  const limit = normalizePositiveInteger(params.limit, 10, 100);

  // Luôn giới hạn truy vấn ở tài khoản khách hàng.
  const filter: Record<string, unknown> = {
    role: "customer",
  };

  // Lọc theo trạng thái nếu có.
  if (status) {
    filter.status = status;
  }

  // Tìm kiếm không phân biệt chữ hoa, chữ thường.
  const normalizedKeyword = keyword?.trim();

  if (normalizedKeyword) {
    const searchRegex = new RegExp(
      escapeRegex(normalizedKeyword),
      "i"
    );

    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  // Chỉ chấp nhận các trường sắp xếp được cho phép.
  const allowedSortFields: CustomerSortField[] = [
    "createdAt",
    "name",
    "email",
  ];

  const safeSortBy: CustomerSortField =
    allowedSortFields.includes(sortBy as CustomerSortField)
      ? (sortBy as CustomerSortField)
      : "createdAt";

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (page - 1) * limit;

  const [customers, totalCustomers] = await Promise.all([
    User.find(filter)
      .select(
        "_id name email phone avatar role status emailVerifiedAt createdAt updatedAt"
      )
      .sort({ [safeSortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  return {
    customers,
    pagination: {
      page,
      limit,
      total: totalCustomers,
      totalPages: Math.ceil(totalCustomers / limit),
    },
  };
};

/**
 * LẤY CHI TIẾT KHÁCH HÀNG
 *
 * Chỉ tìm tài khoản có role = customer.
 * Trả về null nếu ID không hợp lệ hoặc không tìm thấy.
 */
export const getAdminCustomerByIdService = async (
  customerId: string
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    return null;
  }

  return User.findOne({
    _id: customerId,
    role: "customer",
  })
    .select(
      "_id name email phone avatar role status emailVerifiedAt createdAt updatedAt"
    )
    .lean();
};

/**
 * CẬP NHẬT TRẠNG THÁI KHÁCH HÀNG
 *
 * active   : tài khoản hoạt động.
 * inactive : tài khoản ngừng hoạt động.
 * blocked  : tài khoản bị khóa.
 *
 * Không cho phép thao tác lên tài khoản admin.
 */
export const updateAdminCustomerStatusService = async (
  customerId: string,
  status: CustomerStatus
) => {
  if (!Types.ObjectId.isValid(customerId)) {
    return null;
  }

  const allowedStatuses: CustomerStatus[] = [
    "active",
    "inactive",
    "blocked",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(400, "Trạng thái khách hàng không hợp lệ.");
  }

  return User.findOneAndUpdate(
    {
      _id: customerId,
      role: "customer",
    },
    {
      $set: { status },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .select(
      "_id name email phone avatar role status emailVerifiedAt createdAt updatedAt"
    )
    .lean();
};