import { createContext } from "react";
import type { CartItem } from "../types/api.ts";

export type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
  add: (productId: string, variantId?: string, quantity?: number) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

export const CartContext = createContext<CartContextValue | null>(null);
