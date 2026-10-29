import { Request, Response, NextFunction } from "express";
import * as checkoutService from "../services/checkout.service";

export const previewCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const summary = await checkoutService.reviewCheckout(userId, req.body);
    return res.status(200).json({
      success: true,
      message: "Xem trước thông tin đơn hàng thành công.",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const submitCheckout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await checkoutService.placeOrder(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công.",
      data: { order: result.order, items: result.items },
    });
  } catch (error) {
    next(error);
  }
};
