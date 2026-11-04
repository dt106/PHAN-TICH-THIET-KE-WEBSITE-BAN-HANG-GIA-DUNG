import { request } from "./http.ts";
import type { WishlistItem } from "../types/api.ts";

const getWishlist = () => {
  return request<WishlistItem[]>("/api/wishlist");
};

const addToWishlist = (productId: string) => {
  return request<unknown>("/api/wishlist", { method: "POST", body: { productId } });
};

const checkWishlist = (productId: string) => {
  return request<{ isInWishlist: boolean; wishlistId?: string | null }>(
    `/api/wishlist/check/${productId}`,
  );
};

const moveWishlistToCart = (
  id: string,
  body: { variantId?: string; quantity?: number } = {},
) => {
  return request<unknown>(`/api/wishlist/${id}/move-to-cart`, { method: "POST", body });
};

const removeWishlistByProduct = (productId: string) => {
  return request<null>(`/api/wishlist/product/${productId}`, { method: "DELETE" });
};

const removeWishlistItem = (id: string) => {
  return request<null>(`/api/wishlist/${id}`, { method: "DELETE" });
};

const clearWishlist = () => {
  return request<null>("/api/wishlist", { method: "DELETE" });
};

export const wishlistService = {
  getWishlist,
  addToWishlist,
  checkWishlist,
  moveWishlistToCart,
  removeWishlistByProduct,
  removeWishlistItem,
  clearWishlist,
};
