import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth.ts";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/money.ts";
import type { CardProduct } from "../../lib/productView.ts";
import { errorText } from "../../services/http.ts";
import { wishlistService } from "../../services/wishlist.service.ts";
import { Button, showToast } from "../common/index.ts";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: CardProduct }) {
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  function requireUser() {
    if (user) return true;
    navigate(`/login?next=${encodeURIComponent(`/shop/${product.slug}`)}`);
    showToast("Đăng nhập để tiếp tục.", "warning");
    return false;
  }

  return (
    <article className={styles.card}>
      <Link to={`/shop/${product.slug}`} className={styles.media}>
        {product.image ? <img src={product.image} alt={product.name} /> : null}
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
          <strong>{formatMoney(product.price)}</strong>
          {product.originalPrice ? <s>{formatMoney(product.originalPrice)}</s> : null}
        </div>
      </Link>
      <div className={styles.overlay}>
        <Link
          to={`/shop/${product.slug}`}
          className={styles.detailLink}
          aria-label={`Xem ${product.name}`}
        />
        <Button
          variant="secondary"
          onClick={() => {
            if (!requireUser()) return;
            add(product.id)
              .then(() => showToast(`Đã thêm ${product.name} vào giỏ.`, "success"))
              .catch((error: unknown) => showToast(errorText(error), "error"));
          }}
        >
          Thêm vào giỏ
        </Button>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => {
              if (!requireUser()) return;
              wishlistService.addToWishlist(product.id)
                .then(() => showToast("Đã lưu vào yêu thích.", "success"))
                .catch((error: unknown) => showToast(errorText(error), "error"));
            }}
          >
            Yêu thích
          </button>
        </div>
      </div>
    </article>
  );
}
