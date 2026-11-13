import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartService } from "../services/cart.service.ts";
import type { CartSummary } from "../types/api.ts";
import { CartContext } from "./cart-context.ts";
import { useAuth } from "./useAuth.ts";

const empty: CartSummary = {
  items: [],
  subtotal: 0,
  totalQuantity: 0,
  totalUniqueItems: 0,
};

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartSummary>(empty);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(empty);
      return;
    }
    setLoading(true);
    try {
      const result = await cartService.getCart();
      setCart(result.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setCart(empty);
      return;
    }
    setLoading(true);
    cartService.getCart()
      .then((result) => {
        if (!cancelled) setCart(result.data);
      })
      .catch(() => {
        if (!cancelled) setCart(empty);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const value = useMemo(
    () => ({
      items: cart.items,
      subtotal: cart.subtotal,
      count: cart.totalQuantity,
      loading,
      refresh,
      async add(productId: string, variantId?: string, quantity?: number) {
        await cartService.addToCart({ productId, variantId, quantity });
        await refresh();
      },
      async setQuantity(id: string, quantity: number) {
        if (quantity < 1) await cartService.removeCartItem(id);
        else await cartService.updateCartItem(id, quantity);
        await refresh();
      },
      async remove(id: string) {
        await cartService.removeCartItem(id);
        await refresh();
      },
      async clear() {
        await cartService.clearCart();
        await refresh();
      },
    }),
    [cart, loading, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
