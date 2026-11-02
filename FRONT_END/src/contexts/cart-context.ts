import { createContext } from "react";

/**
 * Dòng giỏ hàng đã chuẩn hóa cho UI.
 * Khách vãng lai: localStorage `furniro-guest-cart`.
 * Đã đăng nhập: /api/cart (id là cart item id).
 */
export type CartLine = {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  originalPrice: number | null;
  quantity: number;
  availableStock: number;
  isAvailable: boolean;
  variantSku: string | null;
};

export type CartDraft = {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  originalPrice?: number | null;
  variantSku?: string | null;
  availableStock?: number;
};

export type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (draft: CartDraft) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const CartContext = createContext<CartContextValue | null>(null);
