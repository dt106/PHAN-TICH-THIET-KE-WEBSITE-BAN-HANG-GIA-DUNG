import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartApi } from "../services/api.ts";
import { errorMessage } from "../services/http.ts";
import type { CartItem } from "../types/api.ts";
import { CartContext, type CartDraft, type CartLine } from "./cart-context.ts";
import { useAuth } from "./useAuth.ts";

const guestKey = "furniro-guest-cart";
const imageKey = "furniro-product-images";

const inflight = new Map<string, Promise<CartLine[]>>();

function readGuest(): CartLine[] {
  try {
    const raw = localStorage.getItem(guestKey);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeGuest(lines: CartLine[]) {
  localStorage.setItem(guestKey, JSON.stringify(lines));
}

function rememberImage(productId: string, image: string | null) {
  if (!image) return;
  try {
    const current = JSON.parse(localStorage.getItem(imageKey) || "{}") as Record<string, string>;
    current[productId] = image;
    localStorage.setItem(imageKey, JSON.stringify(current));
  } catch {
    // Ảnh chỉ để hiển thị, bỏ qua nếu bộ nhớ đầy.
  }
}

function imageFor(productId: string) {
  try {
    const current = JSON.parse(localStorage.getItem(imageKey) || "{}") as Record<string, string>;
    return current[productId] ?? null;
  } catch {
    return null;
  }
}

function fromServer(item: CartItem): CartLine {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: item.productName,
    slug: item.productSlug,
    image: item.productImage || imageFor(item.productId),
    unitPrice: item.unitPrice,
    originalPrice: item.originalPrice,
    quantity: item.quantity,
    availableStock: item.availableStock,
    isAvailable: item.isAvailable,
    variantSku: item.variantSku,
  };
}

function guestId(productId: string, variantId?: string | null) {
  return `local-${productId}-${variantId || "base"}`;
}

async function loadLines(userId: string | null): Promise<CartLine[]> {
  const key = userId ?? "guest";
  const existing = inflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    if (!userId) return readGuest();
    const guest = readGuest();
    if (guest.length > 0) {
      const failed: CartLine[] = [];
      for (const line of guest) {
        try {
          await cartApi.add({
            productId: line.productId,
            variantId: line.variantId,
            quantity: line.quantity,
          });
        } catch {
          failed.push(line);
        }
      }
      writeGuest(failed);
    }
    const result = await cartApi.get();
    return (result.data.items ?? []).map(fromServer);
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, task);
  return task;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [serverSubtotal, setServerSubtotal] = useState<number | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const loading = !ready || loadedFor !== (userId ?? "guest");

  const applyServer = useCallback(async () => {
    const result = await cartApi.get();
    setLines((result.data.items ?? []).map(fromServer));
    setServerSubtotal(result.data.subtotal);
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    if (!user) {
      const guest = readGuest();
      setLines(guest);
      setServerSubtotal(null);
      return;
    }
    await applyServer();
  }, [applyServer, user]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const key = userId ?? "guest";
    loadLines(userId)
      .then(async (next) => {
        if (!active) return;
        setLines(next);
        setError(null);
        if (userId) {
          const result = await cartApi.get();
          if (!active) return;
          setLines((result.data.items ?? []).map(fromServer));
          setServerSubtotal(result.data.subtotal);
        } else {
          setServerSubtotal(null);
        }
        setLoadedFor(key);
      })
      .catch((reason) => {
        if (!active) return;
        setError(errorMessage(reason));
        setLoadedFor(key);
      });
    return () => {
      active = false;
    };
  }, [ready, userId]);

  const add = useCallback(
    async (draft: CartDraft) => {
      const quantity = draft.quantity && draft.quantity > 0 ? draft.quantity : 1;
      rememberImage(draft.productId, draft.image);
      if (!user) {
        const current = readGuest();
        const id = guestId(draft.productId, draft.variantId);
        const existing = current.find((line) => line.id === id);
        const next = existing
          ? current.map((line) =>
              line.id === id ? { ...line, quantity: line.quantity + quantity } : line,
            )
          : [
              ...current,
              {
                id,
                productId: draft.productId,
                variantId: draft.variantId ?? null,
                name: draft.name,
                slug: draft.slug,
                image: draft.image,
                unitPrice: draft.unitPrice,
                originalPrice: draft.originalPrice ?? null,
                quantity,
                availableStock: draft.availableStock ?? 9999,
                isAvailable: true,
                variantSku: draft.variantSku ?? null,
              },
            ];
        writeGuest(next);
        setLines(next);
        setServerSubtotal(null);
        return;
      }
      await cartApi.add({
        productId: draft.productId,
        variantId: draft.variantId,
        quantity,
      });
      await applyServer();
    },
    [applyServer, user],
  );

  const setQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (!user) {
        const next =
          quantity < 1 ? readGuest().filter((line) => line.id !== id) : readGuest().map((line) => (line.id === id ? { ...line, quantity } : line));
        writeGuest(next);
        setLines(next);
        return;
      }
      if (quantity < 1) {
        await cartApi.remove(id);
      } else {
        await cartApi.update(id, quantity);
      }
      await applyServer();
    },
    [applyServer, user],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) {
        const next = readGuest().filter((line) => line.id !== id);
        writeGuest(next);
        setLines(next);
        return;
      }
      await cartApi.remove(id);
      await applyServer();
    },
    [applyServer, user],
  );

  const clear = useCallback(async () => {
    if (!user) {
      writeGuest([]);
      setLines([]);
      setServerSubtotal(null);
      return;
    }
    await cartApi.clear();
    setLines([]);
    setServerSubtotal(0);
  }, [user]);

  const value = useMemo(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const localSubtotal = lines
      .filter((line) => line.isAvailable)
      .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    return {
      lines,
      count,
      subtotal: serverSubtotal ?? localSubtotal,
      loading,
      error,
      refresh,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [add, clear, error, lines, loading, refresh, remove, serverSubtotal, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
