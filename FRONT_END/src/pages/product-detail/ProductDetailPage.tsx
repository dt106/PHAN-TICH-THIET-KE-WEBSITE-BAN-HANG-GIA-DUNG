import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import heartIcon from "../../assets/icons/heart.svg";
import { Button, PageState, Quantity, showToast, toastError } from "../../components/common/index.ts";
import { ProductGrid } from "../../components/product/ProductGrid.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { useRequest } from "../../hooks/useRequest.ts";
import { useRequireUser } from "../../hooks/useRequireUser.ts";
import { formatMoney } from "../../lib/format.ts";
import { attributeText, refName, sellingPrice } from "../../lib/productView.ts";
import { catalogService } from "../../services/catalog.service.ts";
import { wishlistService } from "../../services/wishlist.service.ts";
import type { ProductVariant } from "../../types/api.ts";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const { add } = useCart();
  const requireUser = useRequireUser();
  const [picked, setPicked] = useState<{ slug: string; variantId: string; image: string; quantity: number } | null>(null);
  const { data: product, error, loading } = useRequest(
    () => catalogService.getProductBySlug(slug).then((result) => result.data),
    [slug],
  );
  const { data: related = [] } = useRequest(async () => {
    if (!product?.id) return [];
    try {
      return (await catalogService.getRelatedProducts(product.id, 4)).data;
    } catch {
      return [];
    }
  }, [product?.id]);

  if (loading || error || !product) {
    return (
      <div className="wrap section">
        <PageState
          loading={loading}
          error={error || "Không tìm thấy sản phẩm."}
          backTo="/shop"
          backLabel="Về cửa hàng"
        />
      </div>
    );
  }

  const current = product;
  const fallbackImage =
    current.media?.find((item) => item.isPrimary)?.mediaUrl ??
    current.media?.[0]?.mediaUrl ??
    current.thumbnail ??
    "";
  const selection = picked?.slug === current.slug ? picked : null;
  const image = selection?.image || fallbackImage;
  const variantId = selection?.variantId || current.variants?.[0]?.id || "";
  const quantity = selection?.quantity ?? 1;
  function choose(next: Partial<{ variantId: string; image: string; quantity: number }>) {
    setPicked({
      slug: current.slug,
      variantId: next.variantId ?? variantId,
      image: next.image ?? image,
      quantity: next.quantity ?? quantity,
    });
  }
  const variant = current.variants?.find((item) => item.id === variantId);
  const price = variant?.price ?? sellingPrice(current);
  const outOfStock = Boolean(variant && variant.stockQuantity <= 0);

  function addToCart() {
    if (!requireUser()) return;
    if (current.variants?.length && !variantId) {
      showToast("Chọn biến thể trước khi thêm vào giỏ.", "warning");
      return;
    }
    add(current.id, variantId || undefined, quantity)
      .then(() => showToast("Đã thêm vào giỏ.", "success"))
      .catch(toastError);
  }

  return (
    <>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">&gt;</span>
        <Link to="/shop">Cửa hàng</Link>
        <span aria-hidden="true">&gt;</span>
        <span className={styles.current}>{product.name}</span>
      </nav>
      <div className={`wrap ${styles.layout}`}>
        <div className={styles.thumbs}>
          {(product.media ?? []).filter((item) => item.mediaType === "image").map((item) => (
            <button key={item.id} type="button" onClick={() => choose({ image: item.mediaUrl })}>
              <img src={item.mediaUrl} alt={item.altText ?? ""} />
            </button>
          ))}
        </div>
        <div className={styles.photo}>
          {image ? <img src={image} alt={product.name} /> : null}
        </div>
        <div className={styles.info}>
          <h1>{product.name}</h1>
          <p className={styles.price}>{formatMoney(price)}</p>
          <p className={styles.stars}>
            ★ {product.averageRating ?? 0} <span className="muted">{product.totalReviews ?? 0} đánh giá</span>
          </p>
          <p>{product.description}</p>
          {product.variants?.length ? (
            <div className={styles.choices}>
              <span>Biến thể</span>
              <div className={styles.sizes}>
                {product.variants.map((item) => (
                  <VariantButton
                    key={item.id}
                    item={item}
                    pressed={variantId === item.id}
                    onSelect={() => choose({ variantId: item.id, image: item.image || image })}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <p className={outOfStock ? styles.out : undefined}>{outOfStock ? "Hết hàng" : variant ? `Còn ${variant.stockQuantity}` : null}</p>
          <div className={styles.buyRow}>
            <Quantity value={quantity} onChange={(value) => choose({ quantity: Math.max(1, value) })} />
            <Button variant="outline" onClick={addToCart} disabled={outOfStock}>
              {outOfStock ? "Hết hàng" : "Thêm vào giỏ"}
            </Button>
            <button
              type="button"
              className={styles.heart}
              aria-label="Yêu thích"
              onClick={() => {
                if (!requireUser()) return;
                wishlistService.addToWishlist(product.id)
                  .then(() => showToast("Đã lưu yêu thích.", "success"))
                  .catch(toastError);
              }}
            >
              <img src={heartIcon} alt="" />
            </button>
          </div>
          <p className={styles.meta}>
            SKU: {variant?.sku || product.sku}
            <br />
            Danh mục: {refName(product.categoryId) || "—"}
            <br />
            Thương hiệu: {refName(product.brandId) || "—"}
          </p>
        </div>
      </div>
      <section className={`wrap ${styles.related}`}>
        <h2>Sản phẩm liên quan</h2>
        <ProductGrid products={related} />
      </section>
    </>
  );
}

function VariantButton({
  item,
  pressed,
  onSelect,
}: {
  item: ProductVariant;
  pressed: boolean;
  onSelect: () => void;
}) {
  const label = attributeText(item.attributes) || item.sku;
  return (
    <button type="button" aria-pressed={pressed} data-stock={item.stockQuantity} onClick={onSelect}>
      {label} · {formatMoney(item.price)}
      {item.stockQuantity <= 0 ? " · Hết hàng" : ""}
    </button>
  );
}
