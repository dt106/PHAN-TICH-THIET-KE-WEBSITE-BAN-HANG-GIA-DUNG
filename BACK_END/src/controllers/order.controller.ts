import { Request, Response, NextFunction } from "express";
import * as orderService from "../services/order.service";
import { OrderStatus } from "../models/Order.model";

const toPositiveInt = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await orderService.getMyOrders(userId, {
      status: req.query.status as string | undefined,
      page: toPositiveInt(req.query.page),
      limit: toPositiveInt(req.query.limit),
    });
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng của bạn thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const order = await orderService.getOrderDetailForUser(userId, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công.",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelMyOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const order = await orderService.cancelMyOrder(userId, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công.",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.getAllOrdersAdmin({
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      paymentStatus: req.query.paymentStatus as string | undefined,
      paymentMethod: req.query.paymentMethod as string | undefined,
      userId: req.query.userId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: toPositiveInt(req.query.page),
      limit: toPositiveInt(req.query.limit),
    });
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderDetailAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.getOrderByIdAdmin(String(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công.",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatusAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderService.updateOrderStatusAdmin(
      String(req.params.id),
      req.body.status as OrderStatus
    );
    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công.",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};
