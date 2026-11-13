import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Quantity, showToast } from "../../components/common/index.ts";
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/money.ts";
import { attributeText, refName, sellingPrice, toCard } from "../../lib/productView.ts";
import { catalogService } from "../../services/catalog.service.ts";
import { errorText } from "../../services/http.ts";
import { wishlistService } from "../../services/wishlist.service.ts";
import type { Product, ProductVariant } from "../../types/api.ts";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState("");

  useEffect(() => {
    let cancelled = false;
    catalogService.getProductBySlug(slug)
      .then(async (result) => {
        if (cancelled) return;
        const next = result.data;
        setProduct(next);
        setError("");
        const primary =
          next.media?.find((item) => item.isPrimary)?.mediaUrl ??
          next.media?.[0]?.mediaUrl ??
          next.thumbnail ??
          "";
        setImage(primary);
        setVariantId(next.variants?.[0]?.id ?? "");
        try {
          const relatedResult = await catalogService.getRelatedProducts(next.id, 4);
          if (!cancelled) setRelated(relatedResult.data);
        } catch {
          if (!cancelled) setRelated([]);
        }
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setProduct(null);
        setError(errorText(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error && !product) {
    return (
      <div className="wrap" style={{ padding: "64px 0" }}>
        <p>{error}</p>
        <Link to="/shop">Về cửa hàng</Link>
      </div>
    );
  }
  if (!product) return <p className="wrap" style={{ padding: "64px 0" }}>Đang tải…</p>;

  const variant = product.variants?.find((item) => item.id === variantId);
  const price = variant?.price ?? sellingPrice(product);

  function addToCart() {
    if (!user) {
      showToast("Đăng nhập để thêm vào giỏ.", "warning");
      return;
    }
    if (product?.variants?.length && !variantId) {
      showToast("Chọn biến thể trước khi thêm vào giỏ.", "warning");
      return;
    }
    add(product!.id, variantId || undefined, quantity)
      .then(() => showToast("Đã thêm vào giỏ.", "success"))
      .catch((reason: unknown) => showToast(errorText(reason), "error"));
  }

  return (
    <>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">&gt;</span>
        <Link to="/shop">Shop</Link>
        <span aria-hidden="true">&gt;</span>
        <span className={styles.current}>{product.name}</span>
      </nav>
      <div className={`wrap ${styles.layout}`}>
        <div className={styles.thumbs}>
          {(product.media ?? []).filter((item) => item.mediaType === "image").map((item) => (
            <button key={item.id} type="button" onClick={() => setImage(item.mediaUrl)}>
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
            ★ {product.averageRating ?? 0} <span style={{ color: "#9f9f9f" }}>{product.totalReviews ?? 0} đánh giá</span>
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
                    onSelect={() => {
                      setVariantId(item.id);
                      if (item.image) setImage(item.image);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div className={styles.buyRow}>
            <Quantity value={quantity} onChange={(value) => setQuantity(Math.max(1, value))} />
            <Button variant="outline" onClick={addToCart}>Thêm vào giỏ</Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (!user) {
                  showToast("Đăng nhập để lưu yêu thích.", "warning");
                  return;
                }
                wishlistService.addToWishlist(product.id)
                  .then(() => showToast("Đã lưu yêu thích.", "success"))
                  .catch((reason: unknown) => showToast(errorText(reason), "error"));
              }}
            >
              Yêu thích
            </Button>
          </div>
          <p className={styles.meta}>
            SKU: {variant?.sku || product.sku}
            <br />
            Danh mục: {refName(product.categoryId) || "—"}
            <br />
            Thương hiệu: {refName(product.brandId) || "—"}
            {variant ? <><br />Kho: {variant.stockQuantity}</> : null}
          </p>
        </div>
      </div>
      <section className={`wrap ${styles.related}`}>
        <h2>Sản phẩm liên quan</h2>
        <div className={styles.grid}>
          {related.map((item) => (
            <ProductCard key={item.id} product={toCard(item)} />
          ))}
        </div>
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
    <button type="button" aria-pressed={pressed} onClick={onSelect}>
      {label} · {formatMoney(item.price)}
    </button>
  );
}
