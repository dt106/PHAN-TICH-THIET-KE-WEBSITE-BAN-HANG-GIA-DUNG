import { Request, Response, NextFunction } from "express";

import * as attributeService from "../services/attribute.service";

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const getAllAttributes = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const attributes = await attributeService.getAllAttributesWithValues();

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thuộc tính thành công.",
      data: attributes,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttributeById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attribute = await attributeService.getAttributeById(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết thuộc tính thành công.",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
};

export const createAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attribute = await attributeService.createAttribute(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo thuộc tính mới thành công.",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attribute = await attributeService.updateAttribute(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật thuộc tính thành công.",
      data: attribute,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttribute = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attributeService.deleteAttribute(getPathParam(req.params.id));

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const createAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const value = await attributeService.createAttributeValue(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Thêm giá trị thuộc tính thành công.",
      data: value,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const value = await attributeService.updateAttributeValue(
      getPathParam(req.params.valueId),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật giá trị thuộc tính thành công.",
      data: value,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttributeValue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await attributeService.deleteAttributeValue(
      getPathParam(req.params.valueId)
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
