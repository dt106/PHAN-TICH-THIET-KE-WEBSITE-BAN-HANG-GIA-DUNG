import type { ReactNode } from "react";
import { toCard } from "../../lib/productView.ts";
import type { Product } from "../../types/api.ts";
import { ProductCard } from "./ProductCard.tsx";
import styles from "./ProductGrid.module.css";

export function ProductGrid({
  products,
  action,
}: {
  products: Product[];
  action?: (product: Product) => ReactNode;
}) {
  if (products.length === 0) return null;
  return (
    <div className={styles.grid}>
      {products.map((product) => (
        <div key={product.id} className={styles.item}>
          <ProductCard product={toCard(product)} />
          {action?.(product)}
        </div>
      ))}
    </div>
  );
}
