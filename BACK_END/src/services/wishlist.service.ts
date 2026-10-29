import { Types } from "mongoose";
import { AppError } from "../utils/appError";
import Wishlist, { IWishlist } from "../models/Wishlist.model";
import Product from "../models/Product.model";
import ProductMedia from "../models/ProductMedia.model";
import { addToCart } from "./cart.service";

export interface WishlistItemDetail {
  id: string;
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  averageRating: number;
  totalReviews: number;
  primaryImage?: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
}

export const getUserWishlist = async (userId: string): Promise<WishlistItemDetail[]> => {
  const records = await Wishlist.find({ userId: new Types.ObjectId(userId) })
    .populate({
      path: "productId",
      select:
        "name slug basePrice salePrice minPrice maxPrice averageRating totalReviews isFeatured isActive",
    })
    .sort({ createdAt: -1 })
    .lean();

  const productIds = records
    .map((r: any) => r.productId?._id)
    .filter((id) => Boolean(id));

  const primaryMedias = await ProductMedia.find({
    productId: { $in: productIds },
    isPrimary: true,
  }).lean();

  const mediaMap = new Map<string, string>();
  primaryMedias.forEach((m) => {
    mediaMap.set(m.productId.toString(), m.mediaUrl);
  });

  return records
    .filter((item: any) => Boolean(item.productId))
    .map((item: any) => {
      const product = item.productId;
      const productIdStr = product._id.toString();

      return {
        id: item._id.toString(),
        productId: productIdStr,
        name: product.name,
        slug: product.slug,
        basePrice: product.basePrice,
        salePrice: product.salePrice ?? null,
        minPrice: product.minPrice ?? null,
        maxPrice: product.maxPrice ?? null,
        averageRating: product.averageRating ?? 0,
        totalReviews: product.totalReviews ?? 0,
        primaryImage: mediaMap.get(productIdStr) ?? null,
        isFeatured: Boolean(product.isFeatured),
        isActive: Boolean(product.isActive),
        createdAt: item.createdAt,
      };
    });
};

export const addToWishlist = async (
  userId: string,
  productId: string
): Promise<IWishlist> => {
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    throw new AppError(404, "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
  }

  const existing = await Wishlist.findOne({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(productId),
  });

  if (existing) {
    return existing;
  }

  return Wishlist.create({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(productId),
  });
};

export const removeFromWishlist = async (
  userId: string,
  wishlistId: string
): Promise<{ message: string }> => {
  const result = await Wishlist.findOneAndDelete({
    _id: wishlistId,
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new AppError(404, "Mục yêu thích không tồn tại hoặc bạn không có quyền xóa.");
  }

  return { message: "Đã xóa sản phẩm khỏi danh sách yêu thích thành công." };
};

export const removeByProductId = async (
  userId: string,
  productId: string
): Promise<{ message: string }> => {
  const result = await Wishlist.findOneAndDelete({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(productId),
  });

  if (!result) {
    throw new AppError(404, "Sản phẩm không có trong danh sách yêu thích của bạn.");
  }

  return { message: "Đã xóa sản phẩm khỏi danh sách yêu thích thành công." };
};

export const checkProductInWishlist = async (
  userId: string,
  productId: string
): Promise<{ isInWishlist: boolean; wishlistId?: string | null }> => {
  const item = await Wishlist.findOne({
    userId: new Types.ObjectId(userId),
    productId: new Types.ObjectId(productId),
  }).lean();

  return {
    isInWishlist: Boolean(item),
    wishlistId: item ? item._id.toString() : null,
  };
};

export const moveWishlistItemToCart = async (
  userId: string,
  wishlistId: string,
  options?: { variantId?: string | null; quantity?: number }
) => {
  const wishlistItem = await Wishlist.findOne({
    _id: wishlistId,
    userId: new Types.ObjectId(userId),
  });

  if (!wishlistItem) {
    throw new AppError(404, "Mục yêu thích không tồn tại hoặc bạn không có quyền thao tác.");
  }

  const cartItem = await addToCart(userId, {
    productId: wishlistItem.productId.toString(),
    variantId: options?.variantId ?? null,
    quantity: options?.quantity ?? 1,
  });

  await Wishlist.findByIdAndDelete(wishlistId);

  return {
    message: "Đã chuyển sản phẩm vào giỏ hàng thành công.",
    cartItem,
  };
};

export const clearUserWishlist = async (userId: string): Promise<{ message: string }> => {
  await Wishlist.deleteMany({ userId: new Types.ObjectId(userId) });
  return { message: "Đã làm trống danh sách yêu thích thành công." };
};
