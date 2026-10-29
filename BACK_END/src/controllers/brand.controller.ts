import { Request, Response, NextFunction } from "express";

import * as brandService from "../services/brand.service";

const getQueryParam = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return undefined;
};

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

export const getPublicBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await brandService.getPublicBrands({
      page: getQueryParam(req.query.page)
        ? Number(getQueryParam(req.query.page))
        : undefined,
      limit: getQueryParam(req.query.limit)
        ? Number(getQueryParam(req.query.limit))
        : undefined,
      search: getQueryParam(req.query.search),
      sortBy: getQueryParam(req.query.sortBy),
      sortOrder: getQueryParam(req.query.sortOrder) as "asc" | "desc" | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thương hiệu thành công.",
      data: result.brands,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBrandById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.getPublicBrandById(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết thương hiệu thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicBrandBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.getPublicBrandBySlug(
      getPathParam(req.params.slug)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết thương hiệu thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await brandService.getAdminBrands({
      page: getQueryParam(req.query.page)
        ? Number(getQueryParam(req.query.page))
        : undefined,
      limit: getQueryParam(req.query.limit)
        ? Number(getQueryParam(req.query.limit))
        : undefined,
      search: getQueryParam(req.query.search),
      isActive: getQueryParam(req.query.isActive) as boolean | undefined,
      sortBy: getQueryParam(req.query.sortBy),
      sortOrder: getQueryParam(req.query.sortOrder) as "asc" | "desc" | undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thương hiệu (Admin) thành công.",
      data: result.brands,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminBrandById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.getAdminBrandById(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết thương hiệu (Admin) thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.createBrand(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo thương hiệu mới thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.updateBrand(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật thương hiệu thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleBrandStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandService.toggleBrandStatus(
      getPathParam(req.params.id),
      req.body.isActive
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thương hiệu thành công.",
      data: brand,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await brandService.deleteBrand(getPathParam(req.params.id));

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
