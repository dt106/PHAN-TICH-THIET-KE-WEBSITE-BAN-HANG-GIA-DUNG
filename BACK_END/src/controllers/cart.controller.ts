import { Request, Response, NextFunction } from "express";
import * as cartService from "../services/cart.service";

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const cart = await cartService.getUserCart(userId);
    return res.status(200).json({
      success: true,
      message: "Lấy thông tin giỏ hàng thành công.",
      data: cart,
    });
  } catch (error) {
    next(error);
  }
};

export const addToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const cartItem = await cartService.addToCart(userId, req.body);
    return res.status(201).json({
      success: true,
      message: "Thêm vào giỏ hàng thành công.",
      data: cartItem,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const updated = await cartService.updateCartItemQuantity(
      userId,
      getPathParam(req.params.id),
      Number(req.body.quantity)
    );
    return res.status(200).json({
      success: true,
      message: "Cập nhật số lượng sản phẩm thành công.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await cartService.removeCartItem(userId, getPathParam(req.params.id));
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const result = await cartService.clearUserCart(userId);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};
