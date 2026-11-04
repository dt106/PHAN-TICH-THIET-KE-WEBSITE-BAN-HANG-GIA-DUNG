import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/money.ts";
import styles from "./CartDrawer.module.css";

export function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, remove, subtotal } = useCart();

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
        {items.length === 0 ? (
          <p className={styles.empty}>Giỏ hàng trống.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((line) => (
              <li key={line.id}>
                {line.productImage ? <img src={line.productImage} alt="" /> : <span />}
                <div>
                  <p>{line.productName}</p>
                  <span>
                    {line.quantity} × {formatMoney(line.unitPrice)}
                    {line.isAvailable ? "" : " · hết hàng"}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Xóa ${line.productName}`}
                  onClick={() => void remove(line.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.subtotal}>
          <span>Tạm tính</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
        <div className={styles.actions}>
          <Link to="/cart" onClick={onClose}>Giỏ hàng</Link>
          <Link to="/checkout" onClick={onClose}>Thanh toán</Link>
          <Link to="/wishlist" onClick={onClose}>Yêu thích</Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
