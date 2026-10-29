import { Request, Response, NextFunction } from "express";

import * as variantService from "../services/product-variant.service";

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const getPublicVariantsByProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variants = await variantService.getPublicVariantsByProduct(
      getPathParam(req.params.productId)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách biến thể thành công.",
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicVariantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await variantService.getPublicVariantById(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin biến thể thành công.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminVariantsByProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const variants = await variantService.getAdminVariantsByProduct(
      getPathParam(req.params.productId)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy toàn bộ biến thể (Admin) thành công.",
      data: variants,
    });
  } catch (error) {
    next(error);
  }
};

export const createVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await variantService.createVariant(
      getPathParam(req.params.productId),
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Tạo biến thể mới thành công.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await variantService.updateVariant(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật biến thể thành công.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateVariantStock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await variantService.updateVariantStock(
      getPathParam(req.params.id),
      Number(req.body.stockQuantity)
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật tồn kho thành công.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleVariantStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const variant = await variantService.toggleVariantStatus(
      getPathParam(req.params.id),
      req.body.isActive
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái hiển thị thành công.",
      data: variant,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVariant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await variantService.deleteVariant(
      getPathParam(req.params.id)
    );

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};
