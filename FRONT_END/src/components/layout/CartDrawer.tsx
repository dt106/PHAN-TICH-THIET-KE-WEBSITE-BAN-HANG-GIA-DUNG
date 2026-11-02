import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/useCart.ts";
import { formatPrice } from "../../utils/money.ts";
import styles from "./CartDrawer.module.css";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lines, remove, subtotal, loading, error } = useCart();

  if (!open) return null;

  return createPortal(
    <div className={styles.open}>
      <button type="button" className={styles.backdrop} aria-label="Đóng giỏ hàng" onClick={onClose} />
      <aside className={styles.panel} role="dialog" aria-label="Giỏ hàng">
        <header className={styles.head}>
          <h2>Giỏ hàng</h2>
          <button type="button" className={styles.close} aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </header>
        {loading ? <p className={styles.empty}>Đang tải giỏ hàng...</p> : null}
        {error ? <p className={styles.empty}>{error}</p> : null}
        {!loading && lines.length === 0 ? <p className={styles.empty}>Giỏ hàng đang trống.</p> : null}
        {lines.length > 0 ? (
          <ul className={styles.list}>
            {lines.map((line) => (
              <li key={line.id}>
                {line.image ? <img src={line.image} alt="" /> : <span />}
                <div>
                  <p>{line.name}</p>
                  <span>
                    {line.quantity} × {formatPrice(line.unitPrice)}
                    {line.variantSku ? ` · ${line.variantSku}` : ""}
                  </span>
                </div>
                <button type="button" aria-label={`Xóa ${line.name}`} onClick={() => void remove(line.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className={styles.subtotal}>
          <span>Tạm tính</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <div className={styles.actions}>
          <Link to="/cart" onClick={onClose}>
            Giỏ hàng
          </Link>
          <Link to="/checkout" onClick={onClose}>
            Thanh toán
          </Link>
          <Link to="/shop" onClick={onClose}>
            Tiếp tục mua
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
