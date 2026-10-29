import Brand, { IBrand } from "../models/Brand.model";
import { AppError } from "../utils/appError";
import Product from "../models/Product.model";

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const generateSlug = (str: string): string => {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

interface CreateBrandPayload {
  name: string;
  slug?: string;
  description?: string | null;
  logo?: string | null;
  isActive?: boolean;
}

interface UpdateBrandPayload {
  name?: string;
  slug?: string;
  description?: string | null;
  logo?: string | null;
  isActive?: boolean;
}

interface ListBrandOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const getPublicBrands = async (options: ListBrandOptions) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };
  if (options.search) {
    query.name = { $regex: escapeRegex(options.search), $options: "i" };
  }

  const sort: any = {};
  sort[options.sortBy || "createdAt"] = options.sortOrder === "asc" ? 1 : -1;

  const [brands, total] = await Promise.all([
    Brand.find(query).sort(sort).skip(skip).limit(limit),
    Brand.countDocuments(query),
  ]);

  return {
    brands,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPublicBrandById = async (id: string): Promise<IBrand> => {
  const brand = await Brand.findOne({ _id: id, isActive: true });
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại hoặc đã bị ẩn.");
  }
  return brand;
};

export const getPublicBrandBySlug = async (slug: string): Promise<IBrand> => {
  const brand = await Brand.findOne({ slug, isActive: true });
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại hoặc đã bị ẩn.");
  }
  return brand;
};

export const getAdminBrands = async (options: ListBrandOptions) => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  if (options.search) {
    query.name = { $regex: escapeRegex(options.search), $options: "i" };
  }

  const sort: any = {};
  sort[options.sortBy || "createdAt"] = options.sortOrder === "asc" ? 1 : -1;

  const [brands, total] = await Promise.all([
    Brand.find(query).sort(sort).skip(skip).limit(limit),
    Brand.countDocuments(query),
  ]);

  return {
    brands,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdminBrandById = async (id: string): Promise<IBrand> => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại.");
  }
  return brand;
};

export const createBrand = async (
  payload: CreateBrandPayload
): Promise<IBrand> => {
  const slug = payload.slug || generateSlug(payload.name);

  const existing = await Brand.findOne({ slug });
  if (existing) {
    throw new AppError(400, `Slug thương hiệu '${slug}' đã tồn tại.`);
  }

  const brand = await Brand.create({
    name: payload.name,
    slug,
    description: payload.description || null,
    logo: payload.logo || null,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  return brand;
};

export const updateBrand = async (
  id: string,
  payload: UpdateBrandPayload
): Promise<IBrand> => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại.");
  }

  if (payload.slug && payload.slug !== brand.slug) {
    const existing = await Brand.findOne({ slug: payload.slug });
    if (existing) {
      throw new AppError(400, `Slug thương hiệu '${payload.slug}' đã tồn tại.`);
    }
    brand.slug = payload.slug;
  }

  if (payload.name !== undefined) brand.name = payload.name;
  if (payload.description !== undefined) brand.description = payload.description;
  if (payload.logo !== undefined) brand.logo = payload.logo;
  if (payload.isActive !== undefined) brand.isActive = payload.isActive;

  await brand.save();
  return brand;
};

export const toggleBrandStatus = async (
  id: string,
  isActive?: boolean
): Promise<IBrand> => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại.");
  }

  brand.isActive = isActive !== undefined ? isActive : !brand.isActive;
  await brand.save();
  return brand;
};

export const deleteBrand = async (
  id: string
): Promise<{ message: string }> => {
  const brand = await Brand.findById(id);
  if (!brand) {
    throw new AppError(404, "Thương hiệu không tồn tại.");
  }

  const productCount = await Product.countDocuments({ brandId: id });
  if (productCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa thương hiệu vì đang có ${productCount} sản phẩm liên kết.`
    );
  }

  await Brand.findByIdAndDelete(id);
  return { message: "Đã xóa thương hiệu thành công." };
};
