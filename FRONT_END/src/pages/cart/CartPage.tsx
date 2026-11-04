import { Link } from "react-router-dom";
import { Button, Quantity, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/money.ts";
import { errorText } from "../../services/http.ts";
import styles from "./CartPage.module.css";

export function CartPage() {
  const { items, subtotal, setQuantity, remove, loading } = useCart();

  return (
    <>
      <PageBanner title="Cart" />
      {loading && items.length === 0 ? (
        <p className="wrap" style={{ padding: "64px 0" }}>Đang tải giỏ hàng…</p>
      ) : items.length === 0 ? (
        <div className={`wrap ${styles.empty}`}>
          <p>Giỏ hàng trống.</p>
          <Button variant="primary">
            <Link to="/shop" style={{ color: "inherit", textDecoration: "none" }}>
              Tiếp tục mua
            </Link>
          </Button>
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
                          setQuantity(line.id, value).catch((reason: unknown) =>
                            showToast(errorText(reason), "error"),
                          );
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
                          remove(line.id).catch((reason: unknown) => showToast(errorText(reason), "error"));
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
            <Button variant="outline">
              <Link to="/checkout" style={{ color: "inherit", textDecoration: "none" }}>
                Thanh toán
              </Link>
            </Button>
          </aside>
        </div>
      )}
      <FeatureBar />
    </>
  );
}
