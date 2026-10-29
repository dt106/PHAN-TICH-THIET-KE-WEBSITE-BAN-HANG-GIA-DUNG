import { Request, Response, NextFunction } from "express";

import * as mediaService from "../services/product-media.service";

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const getMediaByProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mediaList = await mediaService.getMediaByProduct(
      getPathParam(req.params.productId)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách media thành công.",
      data: mediaList,
    });
  } catch (error) {
    next(error);
  }
};

export const createMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const media = await mediaService.createMedia(
      getPathParam(req.params.productId),
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Thêm media mới thành công.",
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const createBatchMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mediaList = await mediaService.createBatchMedia(
      getPathParam(req.params.productId),
      req.body.mediaList
    );

    return res.status(201).json({
      success: true,
      message: "Thêm danh sách media thành công.",
      data: mediaList,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const media = await mediaService.updateMedia(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật media thành công.",
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const setPrimaryMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const media = await mediaService.setPrimaryMedia(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Đã đặt làm ảnh chính của sản phẩm.",
      data: media,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMediaSortOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mediaService.updateMediaSortOrder(
      getPathParam(req.params.productId),
      req.body.sortOrders
    );

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const deleteMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mediaService.deleteMedia(
      getPathParam(req.params.id)
    );

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};

export const deleteBatchMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await mediaService.deleteBatchMedia(
      getPathParam(req.params.productId),
      req.body.mediaIds
    );

    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};
