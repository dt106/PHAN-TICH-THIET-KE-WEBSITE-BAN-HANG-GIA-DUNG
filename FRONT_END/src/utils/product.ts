import type { ProductListItem, VariantAttribute, WishlistItem } from "../types/api.ts";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice?: number;
  image: string | null;
  badge?: { kind: "sale" | "new"; label: string };
};

export function refName(value: ProductListItem["categoryId"]) {
  if (!value || typeof value === "string") return "";
  return value.name;
}

export function sellingPrice(product: {
  basePrice: number;
  salePrice?: number | null;
  minPrice?: number | null;
}) {
  if (product.salePrice != null) return product.salePrice;
  if (product.minPrice != null) return product.minPrice;
  return product.basePrice;
}

export function toStoreProduct(product: ProductListItem): StoreProduct {
  const price = sellingPrice(product);
  const onSale = product.salePrice != null && product.salePrice < product.basePrice;
  const percent = onSale ? Math.round((1 - product.salePrice! / product.basePrice) * 100) : 0;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    subtitle: refName(product.categoryId) || product.sku,
    price,
    originalPrice: onSale ? product.basePrice : undefined,
    image: product.thumbnail ?? null,
    badge: onSale
      ? { kind: "sale", label: `-${percent}%` }
      : product.isFeatured
        ? { kind: "new", label: "Nổi bật" }
        : undefined,
  };
}

export function wishlistToStore(item: WishlistItem): StoreProduct {
  return toStoreProduct({
    id: item.productId,
    categoryId: null,
    brandId: null,
    name: item.name,
    slug: item.slug,
    sku: "",
    basePrice: item.basePrice,
    salePrice: item.salePrice,
    minPrice: item.minPrice,
    thumbnail: item.primaryImage,
    isFeatured: item.isFeatured,
  });
}

export function attributeLabel(attribute: VariantAttribute) {
  const name =
    typeof attribute.attributeId === "object" ? attribute.attributeId.name : "Thuộc tính";
  const value =
    typeof attribute.attributeValueId === "object" ? attribute.attributeValueId.value : "";
  return { name, value };
}

export function variantLabel(attributes: VariantAttribute[] | undefined, sku: string) {
  const parts = (attributes ?? [])
    .map(attributeLabel)
    .filter((item) => item.value)
    .map((item) => `${item.name}: ${item.value}`);
  return parts.length > 0 ? parts.join(" · ") : sku;
}
