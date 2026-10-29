import ProductVariant from "../models/ProductVariant.model";
import VariantAttribute from "../models/VariantAttribute.model";
import Product from "../models/Product.model";
import AttributeValue from "../models/AttributeValue.model";
import OrderItem from "../models/OrderItem.model";
import { AppError } from "../utils/appError";

interface VariantAttributePayload {
  attributeId: string;
  attributeValueId: string;
}

export interface CreateVariantPayload {
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  weight?: number | null;
  image?: string | null;
  isActive?: boolean;
  attributes?: VariantAttributePayload[];
}

export interface UpdateVariantPayload {
  sku?: string;
  price?: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  weight?: number | null;
  image?: string | null;
  isActive?: boolean;
  attributes?: VariantAttributePayload[];
}

export const syncProductPriceRange = async (
  productId: string
): Promise<void> => {
  const activeVariants = await ProductVariant.find({
    productId,
    isActive: true,
  }).select("price");

  const product = await Product.findById(productId);
  if (!product) return;

  if (activeVariants.length === 0) {
    product.minPrice = product.basePrice;
    product.maxPrice = product.basePrice;
  } else {
    const prices = activeVariants.map((variant) => variant.price);
    product.minPrice = Math.min(...prices);
    product.maxPrice = Math.max(...prices);
  }

  await product.save();
};

const attachVariantAttributes = async (
  variants: Record<string, any>[]
): Promise<Record<string, any>[]> => {
  const variantIds = variants.map((variant) => variant._id);

  const variantAttrs = (await VariantAttribute.find({
    variantId: { $in: variantIds },
  })
    .populate("attributeId", "name slug")
    .populate("attributeValueId", "value slug")
    .lean()) as any[];

  return variants.map((variant) => ({
    ...variant,
    id: variant._id.toString(),
    attributes: variantAttrs.filter(
      (variantAttr) =>
        variantAttr.variantId.toString() === variant._id.toString()
    ),
  }));
};

export const getPublicVariantsByProduct = async (productId: string) => {
  const variants = (await ProductVariant.find({
    productId,
    isActive: true,
  }).lean()) as Record<string, any>[];

  return attachVariantAttributes(variants);
};

export const getPublicVariantById = async (id: string) => {
  const variant = (await ProductVariant.findOne({
    _id: id,
    isActive: true,
  }).lean()) as Record<string, any> | null;

  if (!variant) {
    throw new AppError(404, "Biến thể không tồn tại hoặc đã ngừng kinh doanh.");
  }

  const attrs = (await VariantAttribute.find({ variantId: id })
    .populate("attributeId", "name slug")
    .populate("attributeValueId", "value slug")
    .lean()) as any[];

  return {
    ...variant,
    id: variant._id.toString(),
    attributes: attrs,
  };
};

export const getAdminVariantsByProduct = async (productId: string) => {
  const variants = (await ProductVariant.find({ productId }).lean()) as Record<
    string,
    any
  >[];

  return attachVariantAttributes(variants);
};

export const createVariant = async (
  productId: string,
  payload: CreateVariantPayload
) => {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, "Sản phẩm cha không tồn tại.");

  const sku = payload.sku.toUpperCase().trim();
  const existingSku = await ProductVariant.findOne({ sku });
  if (existingSku) {
    throw new AppError(400, `Mã SKU biến thể '${sku}' đã tồn tại.`);
  }

  if (payload.attributes && payload.attributes.length > 0) {
    for (const attr of payload.attributes) {
      const validValue = await AttributeValue.findOne({
        _id: attr.attributeValueId,
        attributeId: attr.attributeId,
      });
      if (!validValue) {
        throw new AppError(
          400,
          `Giá trị thuộc tính ${attr.attributeValueId} không thuộc về thuộc tính ${attr.attributeId}.`
        );
      }
    }
  }

  const variant = await ProductVariant.create({
    productId,
    sku,
    price: payload.price,
    compareAtPrice: payload.compareAtPrice || null,
    stockQuantity: payload.stockQuantity || 0,
    weight: payload.weight || null,
    image: payload.image || null,
    isActive: payload.isActive !== undefined ? payload.isActive : true,
  });

  if (payload.attributes && payload.attributes.length > 0) {
    await VariantAttribute.insertMany(
      payload.attributes.map((attr) => ({
        variantId: variant._id,
        attributeId: attr.attributeId,
        attributeValueId: attr.attributeValueId,
      }))
    );
  }

  await syncProductPriceRange(productId);

  return variant;
};

export const updateVariant = async (
  id: string,
  payload: UpdateVariantPayload
) => {
  const variant = await ProductVariant.findById(id);
  if (!variant) throw new AppError(404, "Biến thể không tồn tại.");

  if (payload.sku && payload.sku.toUpperCase().trim() !== variant.sku) {
    const sku = payload.sku.toUpperCase().trim();
    const existing = await ProductVariant.findOne({ sku, _id: { $ne: id } });
    if (existing) {
      throw new AppError(400, `Mã SKU biến thể '${sku}' đã tồn tại.`);
    }
    variant.sku = sku;
  }

  if (payload.price !== undefined) variant.price = payload.price;
  if (payload.compareAtPrice !== undefined) {
    variant.compareAtPrice = payload.compareAtPrice;
  }
  if (payload.stockQuantity !== undefined) {
    variant.stockQuantity = payload.stockQuantity;
  }
  if (payload.weight !== undefined) variant.weight = payload.weight;
  if (payload.image !== undefined) variant.image = payload.image;
  if (payload.isActive !== undefined) variant.isActive = payload.isActive;

  await variant.save();

  if (payload.attributes !== undefined) {
    await VariantAttribute.deleteMany({ variantId: id });
    if (payload.attributes.length > 0) {
      await VariantAttribute.insertMany(
        payload.attributes.map((attr) => ({
          variantId: variant._id,
          attributeId: attr.attributeId,
          attributeValueId: attr.attributeValueId,
        }))
      );
    }
  }

  await syncProductPriceRange(variant.productId.toString());

  return variant;
};

export const updateVariantStock = async (
  id: string,
  stockQuantity: number
) => {
  const variant = await ProductVariant.findById(id);
  if (!variant) throw new AppError(404, "Biến thể không tồn tại.");

  variant.stockQuantity = stockQuantity;
  await variant.save();

  return variant;
};

export const toggleVariantStatus = async (id: string, isActive?: boolean) => {
  const variant = await ProductVariant.findById(id);
  if (!variant) throw new AppError(404, "Biến thể không tồn tại.");

  variant.isActive = isActive !== undefined ? isActive : !variant.isActive;
  await variant.save();

  await syncProductPriceRange(variant.productId.toString());

  return variant;
};

export const deleteVariant = async (id: string) => {
  const variant = await ProductVariant.findById(id);
  if (!variant) throw new AppError(404, "Biến thể không tồn tại.");

  const hasOrders = await OrderItem.countDocuments({ variantId: id });
  if (hasOrders > 0) {
    throw new AppError(
      400,
      `Không thể xóa biến thể đã phát sinh trong ${hasOrders} chi tiết đơn hàng. Vui lòng chuyển trạng thái isActive sang false.`
    );
  }

  const productId = variant.productId.toString();

  await Promise.all([
    VariantAttribute.deleteMany({ variantId: id }),
    ProductVariant.findByIdAndDelete(id),
  ]);

  await syncProductPriceRange(productId);

  return { message: "Đã xóa biến thể thành công." };
};
