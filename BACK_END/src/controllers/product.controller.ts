import { Request, Response, NextFunction } from "express";

import * as productService from "../services/product.service";
import type { IProductQueryOptions } from "../services/product.service";

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

const getNumberParam = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const getBooleanParam = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return undefined;
};

const getPathParam = (value: unknown): string => {
  return typeof value === "string" ? value : "";
};

const buildQueryOptions = (req: Request): IProductQueryOptions => {
  return {
    page: getNumberParam(req.query.page),
    limit: getNumberParam(req.query.limit),
    categoryId: getQueryParam(req.query.categoryId),
    brandId: getQueryParam(req.query.brandId),
    minPrice: getNumberParam(req.query.minPrice),
    maxPrice: getNumberParam(req.query.maxPrice),
    isFeatured: getBooleanParam(req.query.isFeatured),
    isActive: getBooleanParam(req.query.isActive),
    search: getQueryParam(req.query.search),
    sort: getQueryParam(req.query.sort) as IProductQueryOptions["sort"],
  };
};

export const getPublicProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await productService.getPublicProducts(buildQueryOptions(req));

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm thành công.",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicProductDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getPublicProductDetail({
      id: getPathParam(req.params.id),
    });

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicProductBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getPublicProductDetail({
      slug: getPathParam(req.params.slug),
    });

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = getNumberParam(req.query.limit) ?? 8;
    const result = await productService.getFeaturedProducts(limit);

    return res.status(200).json({
      success: true,
      message: "Lấy sản phẩm nổi bật thành công.",
      data: result.products,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = getNumberParam(req.query.limit) ?? 4;
    const result = await productService.getRelatedProducts(
      getPathParam(req.params.id),
      limit
    );

    return res.status(200).json({
      success: true,
      message: "Lấy sản phẩm liên quan thành công.",
      data: result.products,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await productService.getAdminProducts(buildQueryOptions(req));

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sản phẩm quản trị thành công.",
      data: result.products,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.getAdminProductById(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết sản phẩm quản trị thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.createProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Tạo sản phẩm mới thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.updateProduct(
      getPathParam(req.params.id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProductStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.toggleProductStatus(
      getPathParam(req.params.id),
      req.body.isActive
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái hiển thị thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleProductFeatured = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productService.toggleProductFeatured(
      getPathParam(req.params.id),
      req.body.isFeatured
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái nổi bật thành công.",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await productService.deleteProduct(
      getPathParam(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
