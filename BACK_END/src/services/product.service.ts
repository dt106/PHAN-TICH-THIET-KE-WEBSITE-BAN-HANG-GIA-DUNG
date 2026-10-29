import Product, { IProduct } from "../models/Product.model";
import Category from "../models/Category.model";
import Brand from "../models/Brand.model";
import ProductMedia from "../models/ProductMedia.model";
import ProductVariant from "../models/ProductVariant.model";
import VariantAttribute from "../models/VariantAttribute.model";
import OrderItem from "../models/OrderItem.model";
import { generateSlug } from "./brand.service";
import { AppError } from "../utils/appError";

const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

type ProductSortOption =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "sales"
  | "rating";

export interface IProductQueryOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  search?: string;
  sort?: ProductSortOption;
}

interface CreateProductPayload {
  name: string;
  sku: string;
  categoryId: string;
  brandId?: string | null;
  slug?: string;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

interface UpdateProductPayload {
  name?: string;
  sku?: string;
  categoryId?: string;
  brandId?: string | null;
  slug?: string;
  description?: string | null;
  basePrice?: number;
  salePrice?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductQueryResult {
  products: Record<string, any>[];
  pagination: ProductPagination;
}

const buildSortOrder = (sort?: ProductSortOption): Record<string, 1 | -1> => {
  switch (sort) {
    case "price_asc":
      return { basePrice: 1, createdAt: -1 };
    case "price_desc":
      return { basePrice: -1, createdAt: -1 };
    case "sales":
      return { totalSales: -1, createdAt: -1 };
    case "rating":
      return { averageRating: -1, createdAt: -1 };
    case "newest":
    default:
      return { createdAt: -1 };
  }
};

const toPlainProduct = (product: IProduct): Record<string, any> => {
  const plain = product.toObject() as Record<string, any>;
  plain.id = product._id.toString();
  return plain;
};

const attachPrimaryThumbnails = async (
  products: IProduct[]
): Promise<Record<string, any>[]> => {
  const productIds = products.map((product) => product._id);

  const primaryMedias = await ProductMedia.find({
    productId: { $in: productIds },
    isPrimary: true,
  })
    .sort({ sortOrder: 1 })
    .lean();

  const thumbnailMap = new Map<string, string>();
  primaryMedias.forEach((media) => {
    const key = media.productId.toString();
    if (!thumbnailMap.has(key)) {
      thumbnailMap.set(key, media.mediaUrl);
    }
  });

  return products.map((product) => ({
    ...toPlainProduct(product),
    thumbnail: thumbnailMap.get(product._id.toString()) || null,
  }));
};

const assertSalePriceNotGreaterThanBasePrice = (
  basePrice: number,
  salePrice: number | null | undefined
): void => {
  if (salePrice !== null && salePrice !== undefined && salePrice > basePrice) {
    throw new AppError(400, "Giá khuyến mãi không được lớn hơn giá gốc.");
  }
};

export const getPublicProducts = async (
  options: IProductQueryOptions
): Promise<ProductQueryResult> => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const query: any = { isActive: true };
  if (options.categoryId) query.categoryId = options.categoryId;
  if (options.brandId) query.brandId = options.brandId;
  if (options.isFeatured !== undefined) query.isFeatured = options.isFeatured;

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    query.basePrice = {};
    if (options.minPrice !== undefined) query.basePrice.$gte = options.minPrice;
    if (options.maxPrice !== undefined) query.basePrice.$lte = options.maxPrice;
  }

  if (options.search) {
    query.$text = { $search: options.search };
  }

  const [products, total] = await Promise.all([
    Product.find(query)
      .populate("categoryId", "name slug")
      .populate("brandId", "name slug logo")
      .sort(buildSortOrder(options.sort))
      .skip(skip)
      .limit(limit),
    Product.countDocuments(query),
  ]);

  const formattedProducts = await attachPrimaryThumbnails(products);

  return {
    products: formattedProducts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const getPublicProductDetail = async (identifier: {
  id?: string;
  slug?: string;
}): Promise<Record<string, any>> => {
  const query: any = { isActive: true };
  if (identifier.id) query._id = identifier.id;
  if (identifier.slug) query.slug = identifier.slug.toLowerCase();

  const product = await Product.findOne(query)
    .populate("categoryId", "name slug")
    .populate("brandId", "name slug logo");

  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
  }

  const [mediaList, variants] = await Promise.all([
    ProductMedia.find({ productId: product._id }).sort({ sortOrder: 1 }),
    ProductVariant.find({ productId: product._id, isActive: true }),
  ]);

  const variantIds = variants.map((variant) => variant._id);
  const variantAttributes = await VariantAttribute.find({
    variantId: { $in: variantIds },
  })
    .populate("attributeId", "name slug")
    .populate("attributeValueId", "value slug");

  const productPlain = toPlainProduct(product);
  productPlain.media = mediaList.map((media) => media.toObject());
  productPlain.variants = variants.map((variant) => {
    const variantPlain = variant.toObject() as Record<string, any>;
    variantPlain.attributes = variantAttributes
      .filter((attr) => attr.variantId.toString() === variant._id.toString())
      .map((attr) => attr.toObject());
    return variantPlain;
  });

  return productPlain;
};

export const getFeaturedProducts = async (
  limit: number = 8
): Promise<ProductQueryResult> => {
  return getPublicProducts({ isFeatured: true, limit, sort: "newest" });
};

export const getRelatedProducts = async (
  productId: string,
  limit: number = 4
): Promise<ProductQueryResult> => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  const relatedConditions: Record<string, any>[] = [
    { categoryId: product.categoryId },
  ];
  if (product.brandId) {
    relatedConditions.push({ brandId: product.brandId });
  }

  const relatedProducts = await Product.find({
    isActive: true,
    _id: { $ne: product._id },
    $or: relatedConditions,
  })
    .populate("categoryId", "name slug")
    .populate("brandId", "name slug logo")
    .sort({ totalSales: -1, averageRating: -1, createdAt: -1 })
    .limit(limit);

  const products = await attachPrimaryThumbnails(relatedProducts);

  return {
    products,
    pagination: { page: 1, limit, total: products.length, totalPages: 1 },
  };
};

export const getAdminProducts = async (
  options: IProductQueryOptions
): Promise<ProductQueryResult & { stats: Record<string, number> }> => {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (options.categoryId) query.categoryId = options.categoryId;
  if (options.brandId) query.brandId = options.brandId;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  if (options.isFeatured !== undefined) query.isFeatured = options.isFeatured;
  if (options.search) {
    const searchPattern = new RegExp(escapeRegex(options.search), "i");
    query.$or = [{ name: searchPattern }, { sku: searchPattern }];
  }

  const [products, total, totalProducts, activeProducts, featuredProducts] =
    await Promise.all([
      Product.find(query)
        .populate("categoryId", "name slug")
        .populate("brandId", "name slug logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
      Product.countDocuments({}),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isFeatured: true }),
    ]);

  return {
    products: products.map((product) => toPlainProduct(product)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      featuredProducts,
    },
  };
};

export const getAdminProductById = async (
  id: string
): Promise<Record<string, any>> => {
  const product = await Product.findById(id)
    .populate("categoryId", "name slug")
    .populate("brandId", "name slug logo");

  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  return toPlainProduct(product);
};

export const createProduct = async (
  payload: CreateProductPayload
): Promise<IProduct> => {
  const category = await Category.findById(payload.categoryId);
  if (!category) {
    throw new AppError(400, "Danh mục không tồn tại.");
  }

  if (payload.brandId) {
    const brand = await Brand.findById(payload.brandId);
    if (!brand) {
      throw new AppError(400, "Thương hiệu không tồn tại.");
    }
  }

  const sku = payload.sku.toUpperCase().trim();
  const existingSku = await Product.findOne({ sku });
  if (existingSku) {
    throw new AppError(400, `Mã SKU '${sku}' đã tồn tại.`);
  }

  const slug = payload.slug || generateSlug(payload.name);
  const existingSlug = await Product.findOne({ slug });
  if (existingSlug) {
    throw new AppError(400, `Slug '${slug}' đã tồn tại.`);
  }

  assertSalePriceNotGreaterThanBasePrice(payload.basePrice, payload.salePrice);

  return Product.create({
    categoryId: payload.categoryId,
    brandId: payload.brandId || null,
    name: payload.name,
    slug,
    sku,
    description: payload.description || null,
    basePrice: payload.basePrice,
    salePrice: payload.salePrice || null,
    metaTitle: payload.metaTitle || null,
    metaDescription: payload.metaDescription || null,
    isFeatured: payload.isFeatured !== undefined ? payload.isFeatured : false,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });
};

export const updateProduct = async (
  id: string,
  payload: UpdateProductPayload
): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  if (payload.sku !== undefined) {
    const sku = payload.sku.toUpperCase().trim();
    if (sku !== product.sku) {
      const existingSku = await Product.findOne({ sku, _id: { $ne: id } });
      if (existingSku) {
        throw new AppError(400, `Mã SKU '${sku}' đã tồn tại.`);
      }
      product.sku = sku;
    }
  }

  if (payload.slug !== undefined && payload.slug !== product.slug) {
    const existingSlug = await Product.findOne({
      slug: payload.slug,
      _id: { $ne: id },
    });
    if (existingSlug) {
      throw new AppError(400, `Slug '${payload.slug}' đã tồn tại.`);
    }
    product.slug = payload.slug;
  }

  if (payload.categoryId !== undefined) {
    const category = await Category.findById(payload.categoryId);
    if (!category) {
      throw new AppError(400, "Danh mục không tồn tại.");
    }
    product.categoryId = payload.categoryId as any;
  }

  if (payload.brandId !== undefined) {
    if (payload.brandId !== null) {
      const brand = await Brand.findById(payload.brandId);
      if (!brand) {
        throw new AppError(400, "Thương hiệu không tồn tại.");
      }
    }
    product.brandId = payload.brandId as any;
  }

  if (payload.name !== undefined) product.name = payload.name;
  if (payload.description !== undefined) {
    product.description = payload.description;
  }
  if (payload.basePrice !== undefined) product.basePrice = payload.basePrice;
  if (payload.salePrice !== undefined) product.salePrice = payload.salePrice;
  if (payload.metaTitle !== undefined) product.metaTitle = payload.metaTitle;
  if (payload.metaDescription !== undefined) {
    product.metaDescription = payload.metaDescription;
  }
  if (payload.isFeatured !== undefined) product.isFeatured = payload.isFeatured;
  if (payload.isActive !== undefined) product.isActive = payload.isActive;

  assertSalePriceNotGreaterThanBasePrice(
    product.basePrice,
    product.salePrice ?? null
  );

  await product.save();
  return product;
};

export const toggleProductStatus = async (
  id: string,
  isActive?: boolean
): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  product.isActive = isActive !== undefined ? isActive : !product.isActive;
  await product.save();
  return product;
};

export const toggleProductFeatured = async (
  id: string,
  isFeatured?: boolean
): Promise<IProduct> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  product.isFeatured =
    isFeatured !== undefined ? isFeatured : !product.isFeatured;
  await product.save();
  return product;
};

export const deleteProduct = async (
  id: string
): Promise<{ message: string }> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, "Sản phẩm không tồn tại.");
  }

  const orderItemCount = await OrderItem.countDocuments({ productId: id });
  if (orderItemCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa sản phẩm đã có ${orderItemCount} giao dịch đơn hàng. Hãy chuyển trạng thái isActive sang false.`
    );
  }

  const variants = await ProductVariant.find({ productId: id });
  const variantIds = variants.map((variant) => variant._id);

  await Promise.all([
    VariantAttribute.deleteMany({ variantId: { $in: variantIds } }),
    ProductVariant.deleteMany({ productId: id }),
    ProductMedia.deleteMany({ productId: id }),
    Product.findByIdAndDelete(id),
  ]);

  return { message: "Đã xóa sản phẩm và dữ liệu liên quan thành công." };
};
