/**
 * FILE: BACK_END/src/controllers/admin/admin.customer.controller.ts
 *
 * NHIỆM VỤ:
 * - Nhận request từ routes.
 * - Lấy và chuyển đổi query/body.
 * - Gọi service xử lý nghiệp vụ.
 * - Trả response JSON thống nhất.
 */

import type {
  Request,
  Response,
  NextFunction,
} from "express";

import {
  getAdminCustomersService,
  getAdminCustomerByIdService,
  updateAdminCustomerStatusService,
} from "../../services/admin/admin.customer.service";

type CustomerStatus = "active" | "inactive" | "blocked";
type CustomerSortField = "createdAt" | "name" | "email";
type SortOrder = "asc" | "desc";

/**
 * Đọc query string an toàn.
 */
const getQueryString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value.trim() : undefined;
};

/**
 * LẤY DANH SÁCH KHÁCH HÀNG
 *
 * GET /api/admin/customers?page=1&limit=10
 */
export const getAdminCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const keyword = getQueryString(req.query.keyword);
    const statusValue = getQueryString(req.query.status);
    const pageValue = getQueryString(req.query.page);
    const limitValue = getQueryString(req.query.limit);
    const sortByValue = getQueryString(req.query.sortBy);
    const sortOrderValue = getQueryString(req.query.sortOrder);

    const data = await getAdminCustomersService({
      keyword,
      status: statusValue as CustomerStatus | undefined,
      page: pageValue === undefined ? 1 : Number(pageValue),
      limit: limitValue === undefined ? 10 : Number(limitValue),
      sortBy: sortByValue as CustomerSortField | undefined,
      sortOrder: sortOrderValue as SortOrder | undefined,
    });

    res.status(200).json({
      success: true,
      message: "Lấy danh sách khách hàng thành công.",
      data: data.customers,
      pagination: data.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * LẤY CHI TIẾT KHÁCH HÀNG
 *
 * GET /api/admin/customers/:id
 */
export const getAdminCustomerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.params.id;

    if (typeof customerId !== "string") {
      res.status(400).json({
        success: false,
        message: "ID khách hàng không hợp lệ.",
      });
      return;
    }

    const customer =
      await getAdminCustomerByIdService(customerId);

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Lấy thông tin khách hàng thành công.",
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * CẬP NHẬT TRẠNG THÁI KHÁCH HÀNG
 *
 * PATCH /api/admin/customers/:id/status
 *
 * Body:
 * {
 *   "status": "blocked"
 * }
 */
export const updateAdminCustomerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const customerId = req.params.id;

    if (typeof customerId !== "string") {
      res.status(400).json({
        success: false,
        message: "ID khách hàng không hợp lệ.",
      });
      return;
    }

    const status = req.body.status as CustomerStatus;

    const customer = await updateAdminCustomerStatusService(
      customerId,
      status
    );

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng.",
      });
      return;
    }

    const statusMessages: Record<CustomerStatus, string> = {
      active: "Khôi phục tài khoản khách hàng thành công.",
      inactive: "Ngừng hoạt động tài khoản khách hàng thành công.",
      blocked: "Khóa tài khoản khách hàng thành công.",
    };

    res.status(200).json({
      success: true,
      message: statusMessages[status],
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};