import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth.ts";
import { useCart } from "../../contexts/useCart.ts";
import { catalogApi, wishlistApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import { formatPrice } from "../../utils/money.ts";
import type { StoreProduct } from "../../utils/product.ts";
import { Button, showToast } from "../common/index.ts";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: StoreProduct }) {
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function addToCart() {
    setBusy(true);
    try {
      const detail = await catalogApi.productById(product.id);
      if ((detail.data.variants ?? []).length > 0) {
        navigate(`/shop/${product.slug}`);
        showToast("Hãy chọn phân loại trước khi thêm vào giỏ.", "warning");
        return;
      }
      await add({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        unitPrice: product.price,
        quantity: 1,
      });
      showToast(`Đã thêm ${product.name} vào giỏ.`, "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveWishlist() {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`);
      return;
    }
    try {
      await wishlistApi.add(product.id);
      showToast("Đã lưu vào danh sách yêu thích.", "success");
    } catch (error) {
      showToast(errorMessage(error), "error");
    }
  }

  async function share() {
    const url = `${window.location.origin}/shop/${product.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Đã sao chép liên kết sản phẩm.", "success");
    } catch {
      showToast(url, "warning");
    }
  }

  return (
    <article className={styles.card}>
      <Link to={`/shop/${product.slug}`} className={styles.media}>
        {product.image ? (
          <img src={product.image} alt={product.name} />
        ) : (
          <span className={styles.placeholder} />
        )}
      </Link>
      {product.badge ? (
        <span className={`${styles.badge} ${styles[product.badge.kind]}`}>
          {product.badge.label}
        </span>
      ) : null}
      <Link to={`/shop/${product.slug}`} className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.subtitle}>{product.subtitle}</p>
        <div className={styles.prices}>
          <strong>{formatPrice(product.price)}</strong>
          {product.originalPrice ? <s>{formatPrice(product.originalPrice)}</s> : null}
        </div>
      </Link>
      <div className={styles.overlay}>
        <Link to={`/shop/${product.slug}`} className={styles.detailLink} aria-label={`Xem ${product.name}`} />
        <Button variant="secondary" loading={busy} onClick={() => void addToCart()}>
          Thêm vào giỏ
        </Button>
        <div className={styles.actions}>
          <button type="button" onClick={() => void share()}>
            Chia sẻ
          </button>
          <button type="button" onClick={() => void saveWishlist()}>
            Yêu thích
          </button>
        </div>
      </div>
    </article>
  );
}
