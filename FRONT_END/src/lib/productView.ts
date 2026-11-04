import type { Product, Ref } from "../types/api.ts";

export type CardProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  image?: string | null;
  badge?: { kind: "sale" | "new"; label: string };
};

export function refName(value: Ref) {
  if (!value || typeof value === "string") return "";
  return value.name ?? "";
}

export function sellingPrice(product: Pick<Product, "basePrice" | "salePrice" | "minPrice">) {
  if (product.salePrice != null && product.salePrice < product.basePrice) {
    return product.salePrice;
  }
  if (product.minPrice != null && product.minPrice > 0) return product.minPrice;
  return product.basePrice;
}

export function toCard(product: Product): CardProduct {
  const price = sellingPrice(product);
  const original = price < product.basePrice ? product.basePrice : undefined;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: refName(product.brandId) || refName(product.categoryId) || product.sku,
    price,
    originalPrice: original,
    image: product.thumbnail,
    badge: original
      ? { kind: "sale", label: "Giảm" }
      : product.isFeatured
        ? { kind: "new", label: "Nổi bật" }
        : undefined,
  };
}

export function attributeText(
  attributes: { attributeId?: unknown; attributeValueId?: unknown }[] | undefined,
) {
  if (!attributes?.length) return "";
  return attributes
    .map((item) => {
      const name =
        item.attributeId && typeof item.attributeId === "object" && "name" in item.attributeId
          ? String(item.attributeId.name ?? "")
          : "";
      const value =
        item.attributeValueId &&
        typeof item.attributeValueId === "object" &&
        "value" in item.attributeValueId
          ? String(item.attributeValueId.value ?? "")
          : "";
      return [name, value].filter(Boolean).join(": ");
    })
    .filter(Boolean)
    .join(" · ");
}
