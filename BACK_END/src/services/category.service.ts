import { Types } from "mongoose";

import Category, { ICategory } from "../models/Category.model";
import Product from "../models/Product.model";
import { generateSlug } from "./brand.service";
import { AppError } from "../utils/appError";

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export interface ICategoryTreeItem extends Record<string, any> {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  sortOrder: number;
  children: ICategoryTreeItem[];
}

interface CreateCategoryPayload {
  name: string;
  parentId?: string | null;
  slug?: string;
  description?: string | null;
  image?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

interface UpdateCategoryPayload {
  name?: string;
  parentId?: string | null;
  slug?: string;
  description?: string | null;
  image?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

interface ListCategoryOptions {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  parentId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const toPlainObject = (category: ICategory): Record<string, any> => {
  const plain = category.toObject() as Record<string, any>;
  if (plain.id) {
    plain.id = plain.id.toString();
  }
  if (plain.parentId instanceof Types.ObjectId) {
    plain.parentId = plain.parentId.toString();
  }
  return plain;
};

export const buildCategoryTree = (
  categories: Record<string, any>[],
  parentId: string | null = null
): ICategoryTreeItem[] => {
  const result: ICategoryTreeItem[] = [];

  for (const category of categories) {
    const categoryParentId = category.parentId ? category.parentId.toString() : null;
    if (categoryParentId === parentId) {
      const children = buildCategoryTree(categories, category.id);
      result.push({ ...category, children } as ICategoryTreeItem);
    }
  }

  return result.sort((a, b) => a.sortOrder - b.sortOrder);
};

const resolveParentIdFilter = (parentId?: string): string | null | undefined => {
  if (parentId === undefined) return undefined;
  return parentId === "null" ? null : parentId;
};

export const getPublicCategories = async (options: ListCategoryOptions) => {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };
  const parentIdFilter = resolveParentIdFilter(options.parentId);
  if (parentIdFilter !== undefined) {
    query.parentId = parentIdFilter;
  }
  if (options.search) {
    query.name = { $regex: escapeRegex(options.search), $options: "i" };
  }

  const sort: any = {};
  sort[options.sortBy || "sortOrder"] = options.sortOrder === "desc" ? -1 : 1;
  sort.createdAt = -1;

  const [categories, total] = await Promise.all([
    Category.find(query).populate("parentId", "name slug").sort(sort).skip(skip).limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPublicCategoryTree = async (): Promise<ICategoryTreeItem[]> => {
  const activeCategories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
  return buildCategoryTree(activeCategories.map((category) => toPlainObject(category)));
};

export const getPublicCategoryById = async (id: string) => {
  const category = await Category.findOne({ _id: id, isActive: true }).populate(
    "parentId",
    "name slug"
  );
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại hoặc đã bị ẩn.");
  }

  const subCategories = await Category.find({ parentId: id, isActive: true }).sort({
    sortOrder: 1,
    createdAt: -1,
  });

  return { ...toPlainObject(category), subCategories };
};

export const getPublicCategoryBySlug = async (slug: string) => {
  const category = await Category.findOne({ slug, isActive: true }).populate(
    "parentId",
    "name slug"
  );
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại hoặc đã bị ẩn.");
  }

  const subCategories = await Category.find({ parentId: category._id, isActive: true }).sort({
    sortOrder: 1,
    createdAt: -1,
  });

  return { ...toPlainObject(category), subCategories };
};

export const getAdminCategories = async (options: ListCategoryOptions) => {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  const parentIdFilter = resolveParentIdFilter(options.parentId);
  if (parentIdFilter !== undefined) {
    query.parentId = parentIdFilter;
  }
  if (options.search) {
    query.name = { $regex: escapeRegex(options.search), $options: "i" };
  }

  const sort: any = {};
  sort[options.sortBy || "sortOrder"] = options.sortOrder === "desc" ? -1 : 1;
  sort.createdAt = -1;

  const [categories, total] = await Promise.all([
    Category.find(query).populate("parentId", "name slug").sort(sort).skip(skip).limit(limit),
    Category.countDocuments(query),
  ]);

  return {
    categories,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAdminCategoryById = async (id: string): Promise<ICategory> => {
  const category = await Category.findById(id).populate("parentId", "name slug");
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại.");
  }
  return category;
};

const ensureAncestorChainIsClean = async (
  categoryId: string,
  parentId: string
): Promise<void> => {
  let currentParentId: string | null = parentId;

  while (currentParentId) {
    if (currentParentId === categoryId) {
      throw new AppError(400, "Không thể gán danh mục cha vì sẽ tạo vòng lặp danh mục.");
    }

    const parent: ICategory | null = await Category.findById(currentParentId);
    if (!parent) {
      throw new AppError(400, "Danh mục cha không tồn tại.");
    }

    currentParentId = parent.parentId ? parent.parentId.toString() : null;
  }
};

export const createCategory = async (
  payload: CreateCategoryPayload
): Promise<ICategory> => {
  if (payload.parentId) {
    const parent = await Category.findById(payload.parentId);
    if (!parent) {
      throw new AppError(400, "Danh mục cha không tồn tại.");
    }
  }

  const slug = payload.slug || generateSlug(payload.name);

  const existing = await Category.findOne({ slug });
  if (existing) {
    throw new AppError(400, `Slug danh mục '${slug}' đã tồn tại.`);
  }

  const category = await Category.create({
    name: payload.name,
    parentId: payload.parentId || null,
    slug,
    description: payload.description || null,
    image: payload.image || null,
    metaTitle: payload.metaTitle || null,
    metaDescription: payload.metaDescription || null,
    sortOrder: payload.sortOrder || 0,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  return category;
};

export const updateCategory = async (
  id: string,
  payload: UpdateCategoryPayload
): Promise<ICategory> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại.");
  }

  if (payload.parentId !== undefined && payload.parentId !== null) {
    await ensureAncestorChainIsClean(id, payload.parentId);
    category.parentId = payload.parentId as any;
  } else if (payload.parentId === null) {
    category.parentId = null;
  }

  if (payload.slug && payload.slug !== category.slug) {
    const existing = await Category.findOne({ slug: payload.slug, _id: { $ne: id } });
    if (existing) {
      throw new AppError(400, `Slug danh mục '${payload.slug}' đã tồn tại.`);
    }
    category.slug = payload.slug;
  }

  if (payload.name !== undefined) category.name = payload.name;
  if (payload.description !== undefined) category.description = payload.description;
  if (payload.image !== undefined) category.image = payload.image;
  if (payload.metaTitle !== undefined) category.metaTitle = payload.metaTitle;
  if (payload.metaDescription !== undefined) category.metaDescription = payload.metaDescription;
  if (payload.sortOrder !== undefined) category.sortOrder = payload.sortOrder;
  if (payload.isActive !== undefined) category.isActive = payload.isActive;

  await category.save();
  return category;
};

export const toggleCategoryStatus = async (
  id: string,
  isActive?: boolean
): Promise<ICategory> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại.");
  }

  category.isActive = isActive !== undefined ? isActive : !category.isActive;
  await category.save();
  return category;
};

export const updateSortOrder = async (
  items: Array<{ id: string; sortOrder: number }>
): Promise<{ message: string }> => {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { sortOrder: item.sortOrder } },
    },
  }));

  await Category.bulkWrite(bulkOps);
  return { message: "Cập nhật thứ tự sắp xếp thành công." };
};

export const deleteCategory = async (id: string): Promise<{ message: string }> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new AppError(404, "Danh mục không tồn tại.");
  }

  const childrenCount = await Category.countDocuments({ parentId: id });
  if (childrenCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa danh mục này vì có ${childrenCount} danh mục con trực thuộc. Vui lòng di chuyển hoặc xóa danh mục con trước.`
    );
  }

  const productCount = await Product.countDocuments({ categoryId: id });
  if (productCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa danh mục này vì đang có ${productCount} sản phẩm liên kết.`
    );
  }

  await Category.findByIdAndDelete(id);
  return { message: "Đã xóa danh mục thành công." };
};
