import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Quantity, showToast } from "../../components/common/index.ts";
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { useCart } from "../../contexts/useCart.ts";
import { catalogApi, wishlistApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { ProductDetail, ProductVariant } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import { refName, toStoreProduct, variantLabel } from "../../utils/product.ts";
import panels from "../../styles/panels.module.css";
import styles from "./ProductDetailPage.module.css";

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [related, setRelated] = useState<ReturnType<typeof toStoreProduct>[]>([]);
  const [loadedSlug, setLoadedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedSlug !== slug;
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"description" | "info" | "reviews">("description");
  const [wishState, setWishState] = useState<{ id: string; wished: boolean } | null>(null);
  const wished = Boolean(user && product && wishState?.id === product.id && wishState.wished);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    catalogApi
      .productBySlug(slug)
      .then(async (result) => {
        if (!active) return;
        const detail = result.data;
        setProduct(detail);
        const media = [...(detail.media ?? [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
        setImage(media.find((item) => item.mediaType !== "video")?.mediaUrl ?? detail.thumbnail ?? null);
        setVariantId(detail.variants?.[0]?.id ?? null);
        setQuantity(1);
        if (detail.id) {
          const relatedResult = await catalogApi.related(detail.id, 4);
          if (active) setRelated(relatedResult.items.map(toStoreProduct));
        }
      })
      .catch((reason) => {
        if (active) {
          setProduct(null);
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (active) setLoadedSlug(slug);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!user || !product) return;
    let active = true;
    wishlistApi
      .check(product.id)
      .then((result) => {
        if (active) setWishState({ id: product.id, wished: result.data.isInWishlist });
      })
      .catch(() => {
        if (active) setWishState({ id: product.id, wished: false });
      });
    return () => {
      active = false;
    };
  }, [product, user]);

  const variant: ProductVariant | undefined = useMemo(
    () => product?.variants?.find((item) => item.id === variantId),
    [product, variantId],
  );

  if (loading) return <p className={panels.state}>Đang tải sản phẩm...</p>;
  if (error || !product) {
    return (
      <div className={`wrap ${panels.stack}`}>
        <p className={panels.alert}>{error || "Không tìm thấy sản phẩm."}</p>
        <Link to="/shop">Quay lại cửa hàng</Link>
      </div>
    );
  }

  const price = variant?.price ?? product.salePrice ?? product.basePrice;
  const original =
    variant?.compareAtPrice && variant.compareAtPrice > price
      ? variant.compareAtPrice
      : product.salePrice != null && product.salePrice < product.basePrice
        ? product.basePrice
        : undefined;
  const images = (product.media ?? []).filter((item) => item.mediaType !== "video");
  const stock = variant ? variant.stockQuantity : null;

  async function addToCart() {
    if (product!.variants?.length && !variant) {
      showToast("Hãy chọn phân loại.", "warning");
      return;
    }
    setBusy(true);
    try {
      await add({
        productId: product!.id,
        variantId: variant?.id,
        quantity,
        name: product!.name,
        slug: product!.slug,
        image: variant?.image || image,
        unitPrice: price,
        originalPrice: original,
        variantSku: variant?.sku,
        availableStock: stock ?? undefined,
      });
      showToast(`Đã thêm ${product!.name} vào giỏ.`, "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleWish() {
    if (!user) {
      showToast("Đăng nhập để lưu sản phẩm yêu thích.", "warning");
      return;
    }
    if (!product) return;
    try {
      if (wished) {
        await wishlistApi.removeByProduct(product.id);
        setWishState({ id: product.id, wished: false });
        showToast("Đã bỏ khỏi danh sách yêu thích.", "success");
      } else {
        await wishlistApi.add(product.id);
        setWishState({ id: product.id, wished: true });
        showToast("Đã lưu vào danh sách yêu thích.", "success");
      }
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    }
  }

  return (
    <>
      <nav className={styles.crumbs} aria-label="Đường dẫn">
        <Link to="/">Trang chủ</Link>
        <span aria-hidden="true">&gt;</span>
        <Link to="/shop">Cửa hàng</Link>
        <span aria-hidden="true">&gt;</span>
        <span className={styles.current}>{product.name}</span>
      </nav>
      <div className={`wrap ${styles.layout}`}>
        <div className={styles.thumbs}>
          {images.slice(0, 4).map((item) => (
            <button key={item.id} type="button" onClick={() => setImage(item.mediaUrl)}>
              <img src={item.mediaUrl} alt={item.altText || ""} />
            </button>
          ))}
        </div>
        <div className={styles.photo}>
          {image ? <img src={image} alt={product.name} /> : <span />}
        </div>
        <div className={styles.info}>
          <h1>{product.name}</h1>
          <p className={styles.price}>
            {formatPrice(price)} {original ? <s>{formatPrice(original)}</s> : null}
          </p>
          <p className={styles.stars}>
            {"★".repeat(Math.round(product.averageRating ?? 0)).padEnd(5, "☆")}{" "}
            <span style={{ color: "#9f9f9f" }}>{product.totalReviews ?? 0} đánh giá</span>
          </p>
          <p>{product.description || "Chưa có mô tả."}</p>
          {product.variants && product.variants.length > 0 ? (
            <div className={styles.choices}>
              <span>Phân loại</span>
              <div className={styles.sizes}>
                {product.variants.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={variantId === item.id}
                    onClick={() => {
                      setVariantId(item.id);
                      if (item.image) setImage(item.image);
                    }}
                  >
                    {variantLabel(item.attributes, item.sku)}
                  </button>
                ))}
              </div>
              <p className={panels.muted}>
                {stock === 0 ? "Hết hàng" : stock != null ? `Còn ${stock} sản phẩm` : null}
              </p>
            </div>
          ) : (
            <p className={panels.muted}>Sản phẩm không có phân loại.</p>
          )}
          <div className={styles.buyRow}>
            <Quantity value={quantity} onChange={(value) => setQuantity(Math.max(1, value))} />
            <Button variant="outline" loading={busy} disabled={stock === 0} onClick={() => void addToCart()}>
              Thêm vào giỏ
            </Button>
            <Button variant="ghost" onClick={() => void toggleWish()}>
              {wished ? "Đã yêu thích" : "Yêu thích"}
            </Button>
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
      <section className={`wrap ${styles.tabs}`}>
        <div className={styles.tabList} role="tablist">
          {(
            [
              ["description", "Mô tả"],
              ["info", "Thông tin"],
              ["reviews", `Đánh giá [${product.totalReviews ?? 0}]`],
            ] as const
          ).map(([item, label]) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
              {label}
            </button>
          ))}
        </div>
        <div className={styles.copy}>
          {tab === "description" ? <p>{product.description || "Chưa có mô tả cho sản phẩm này."}</p> : null}
          {tab === "info" ? (
            <p>
              SKU {product.sku}.
              {variant?.weight ? ` Khối lượng ${variant.weight} kg.` : ""} Điểm trung bình{" "}
              {product.averageRating ?? 0}/5.
            </p>
          ) : null}
          {tab === "reviews" ? (
            <p>
              {(product.totalReviews ?? 0) === 0
                ? "Chưa có đánh giá."
                : `Điểm trung bình ${product.averageRating ?? 0}/5 từ ${product.totalReviews} đánh giá.`}{" "}
              Cửa hàng chưa có API để gửi đánh giá mới.
            </p>
          ) : null}
        </div>
      </section>
      <section className={`wrap ${styles.related}`}>
        <h2>Sản phẩm liên quan</h2>
        {related.length === 0 ? <p className={panels.muted}>Chưa có sản phẩm liên quan.</p> : null}
        <div className={styles.grid}>
          {related.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>
    </>
  );
}
