import { Link } from "react-router-dom";
import { ButtonLink, Quantity, toastError } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/format.ts";
import styles from "./CartPage.module.css";

export function CartPage() {
  const { items, subtotal, setQuantity, remove, loading } = useCart();

  return (
    <>
      <PageBanner title="Giỏ hàng" />
      {loading && items.length === 0 ? (
        <p className="wrap section">Đang tải giỏ hàng…</p>
      ) : items.length === 0 ? (
        <div className={`wrap ${styles.empty}`}>
          <p>Giỏ hàng trống.</p>
          <ButtonLink to="/shop">Tiếp tục mua</ButtonLink>
        </div>
      ) : (
        <div className={`wrap ${styles.layout}`}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Thành tiền</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <Link to={`/shop/${line.productSlug}`} className={styles.product}>
                        {line.productImage ? <img src={line.productImage} alt="" /> : null}
                        {line.productName}
                        {line.variantSku ? ` (${line.variantSku})` : ""}
                        {line.isAvailable ? "" : " — hết hàng"}
                      </Link>
                    </td>
                    <td>{formatMoney(line.unitPrice)}</td>
                    <td>
                      <Quantity
                        value={line.quantity}
                        onChange={(value) => {
                          setQuantity(line.id, value).catch(toastError);
                        }}
                      />
                    </td>
                    <td>{formatMoney(line.lineTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Xóa ${line.productName}`}
                        onClick={() => {
                          remove(line.id).catch(toastError);
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className={styles.totals}>
            <h2>Tạm tính</h2>
            <div className={styles.row}>
              <span>Hàng còn bán</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <ButtonLink to="/checkout" variant="outline">Thanh toán</ButtonLink>
          </aside>
        </div>
      )}
      <FeatureBar />
    </>
  );
}
