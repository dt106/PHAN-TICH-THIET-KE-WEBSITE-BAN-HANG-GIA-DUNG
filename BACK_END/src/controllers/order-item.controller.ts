import { Request, Response, NextFunction } from "express";
import * as orderItemService from "../services/order-item.service";

const toPositiveInt = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const getOrderItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requester = {
      userId: req.user!.userId,
      role: req.user!.role,
    };
    const items = await orderItemService.getOrderItems(requester, String(req.params.id));
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm trong đơn hàng thành công.",
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrderItemsAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderItemService.getAllOrderItemsAdmin({
      orderId: req.query.orderId as string | undefined,
      productId: req.query.productId as string | undefined,
      variantId: req.query.variantId as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: toPositiveInt(req.query.page),
      limit: toPositiveInt(req.query.limit),
    });
    return res.status(200).json({
      success: true,
      message: "Lấy danh sách chi tiết đơn hàng thành công.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
