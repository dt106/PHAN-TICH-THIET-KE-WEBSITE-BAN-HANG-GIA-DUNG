import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Cart, { ICart } from "../models/Cart.model";
import Product from "../models/Product.model";
import ProductVariant from "../models/ProductVariant.model";

export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string | null;
  variantId?: string | null;
  variantSku?: string | null;
  unitPrice: number;
  originalPrice?: number | null;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  isActive: boolean;
}

export interface CartSummaryResponse {
  items: CartItemResponse[];
  totalQuantity: number;
  totalUniqueItems: number;
  subtotal: number;
}

export const getUserCart = async (userId: string): Promise<CartSummaryResponse> => {
  const cartRecords = await Cart.find({ userId: new Types.ObjectId(userId) })
    .populate({
      path: "productId",
      select: "name slug basePrice salePrice isActive",
    })
    .populate({
      path: "variantId",
      select: "sku price compareAtPrice stockQuantity isActive image",
    })
    .lean();

  let subtotal = 0;
  let totalQuantity = 0;

  const items: CartItemResponse[] = cartRecords.map((item: any) => {
    const product = item.productId;
    const variant = item.variantId;

    const isActive = Boolean(product?.isActive && (variant ? variant.isActive : true));
    const availableStock = variant ? variant.stockQuantity : 9999;
    const isAvailable = isActive && availableStock >= item.quantity;

    const unitPrice = variant
      ? variant.price
      : product?.salePrice ?? product?.basePrice ?? 0;

    const originalPrice = variant
      ? variant.compareAtPrice ?? null
      : product?.salePrice
        ? product.basePrice
        : null;

    const lineTotal = unitPrice * item.quantity;

    if (isAvailable) {
      subtotal += lineTotal;
      totalQuantity += item.quantity;
    }

    return {
      id: item._id.toString(),
      productId: product?._id?.toString() ?? item.productId?.toString() ?? "",
      productName: product?.name ?? "Sản phẩm không tồn tại",
      productSlug: product?.slug ?? "",
      productImage: variant?.image ?? null,
      variantId:
        variant?._id?.toString() ?? (item.variantId ? item.variantId.toString() : null),
      variantSku: variant?.sku ?? null,
      unitPrice,
      originalPrice,
      quantity: item.quantity,
      lineTotal,
      availableStock,
      isAvailable,
      isActive,
    };
  });

  return {
    items,
    totalQuantity,
    totalUniqueItems: items.length,
    subtotal,
  };
};

export const addToCart = async (
  userId: string,
  payload: { productId: string; variantId?: string | null; quantity?: number }
): Promise<ICart> => {
  const quantityToAdd =
    payload.quantity && payload.quantity > 0 ? payload.quantity : 1;

  const product = await Product.findById(payload.productId);
  if (!product || !product.isActive) {
    throw new AppError(404, "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
  }

  let targetVariantId: Types.ObjectId | null = null;
  let availableStock = 9999;

  if (payload.variantId) {
    const variant = await ProductVariant.findOne({
      _id: payload.variantId,
      productId: payload.productId,
    });
    if (!variant || !variant.isActive) {
      throw new AppError(404, "Biến thể sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
    }
    targetVariantId = variant._id;
    availableStock = variant.stockQuantity;
  }

  const existingItem = await Cart.findOne({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(payload.productId),
    variantId: targetVariantId,
  });

  const nextQuantity = existingItem
    ? existingItem.quantity + quantityToAdd
    : quantityToAdd;

  if (targetVariantId && nextQuantity > availableStock) {
    throw new AppError(400, 
      `Số lượng yêu cầu (${nextQuantity}) vượt quá tồn kho khả dụng (${availableStock}).`
    );
  }

  if (existingItem) {
    existingItem.quantity = nextQuantity;
    await existingItem.save();
    return existingItem;
  }

  return Cart.create({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(payload.productId),
    variantId: targetVariantId,
    quantity: quantityToAdd,
  });
};

export const updateCartItemQuantity = async (
  userId: string,
  cartId: string,
  quantity: number
): Promise<ICart> => {
  const cartItem = await Cart.findOne({
    _id: cartId,
    userId: new Types.ObjectId(userId),
  });

  if (!cartItem) {
    throw new AppError(404, "Mục giỏ hàng không tồn tại hoặc bạn không có quyền thao tác.");
  }

  if (cartItem.variantId) {
    const variant = await ProductVariant.findById(cartItem.variantId);
    if (!variant || !variant.isActive) {
      throw new AppError(400, "Biến thể sản phẩm không khả dụng.");
    }
    if (quantity > variant.stockQuantity) {
      throw new AppError(400, 
        `Số lượng yêu cầu (${quantity}) vượt quá tồn kho khả dụng (${variant.stockQuantity}).`
      );
    }
  }

  cartItem.quantity = quantity;
  await cartItem.save();
  return cartItem;
};

export const removeCartItem = async (
  userId: string,
  cartId: string
): Promise<{ message: string }> => {
  const result = await Cart.findOneAndDelete({
    _id: cartId,
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new AppError(404, "Mục giỏ hàng không tồn tại hoặc bạn không có quyền thao tác.");
  }

  return { message: "Đã xóa sản phẩm khỏi giỏ hàng thành công." };
};

export const clearUserCart = async (userId: string): Promise<{ message: string }> => {
  await Cart.deleteMany({ userId: new Types.ObjectId(userId) });
  return { message: "Đã làm trống giỏ hàng thành công." };
};
