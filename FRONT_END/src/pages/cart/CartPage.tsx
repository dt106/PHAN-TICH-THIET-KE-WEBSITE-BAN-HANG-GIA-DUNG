import { Link } from "react-router-dom";
import { Button, Quantity, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { errorMessage } from "../../services/http.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";
import styles from "./CartPage.module.css";

export function CartPage() {
  const { lines, setQuantity, subtotal, loading, error, clear } = useCart();

  async function change(id: string, quantity: number) {
    try {
      await setQuantity(id, quantity);
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    }
  }

  return (
    <>
      <PageBanner title="Giỏ hàng" />
      {loading ? <p className={panels.state}>Đang tải giỏ hàng...</p> : null}
      {error ? <p className={`wrap ${panels.alert}`}>{error}</p> : null}
      {!loading && lines.length === 0 ? (
        <div className={`wrap ${styles.empty}`}>
          <p>Giỏ hàng đang trống.</p>
          <Button variant="primary" onClick={() => undefined}>
            <Link to="/shop" style={{ color: "inherit", textDecoration: "none" }}>
              Tiếp tục mua sắm
            </Link>
          </Button>
        </div>
      ) : null}
      {!loading && lines.length > 0 ? (
        <div className={`wrap ${styles.layout}`}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Số lượng</th>
                  <th>Tạm tính</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td>
                      <Link to={`/shop/${line.slug}`} className={styles.product}>
                        {line.image ? <img src={line.image} alt="" /> : <span />}
                        <span>
                          {line.name}
                          {line.variantSku ? <small> · {line.variantSku}</small> : null}
                          {!line.isAvailable ? <small> · Không còn bán</small> : null}
                        </span>
                      </Link>
                    </td>
                    <td>{formatPrice(line.unitPrice)}</td>
                    <td>
                      <Quantity value={line.quantity} onChange={(value) => void change(line.id, value)} />
                    </td>
                    <td>{formatPrice(line.unitPrice * line.quantity)}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`Xóa ${line.name}`}
                        onClick={() => void change(line.id, 0)}
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
            <h2>Tổng giỏ hàng</h2>
            <div className={styles.row}>
              <span>Tạm tính</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className={styles.row}>
              <span>Tổng</span>
              <span className={styles.total}>{formatPrice(subtotal)}</span>
            </div>
            <Button variant="outline">
              <Link to="/checkout" style={{ color: "inherit", textDecoration: "none" }}>
                Thanh toán
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => void clear().catch((reason) => showToast(errorMessage(reason), "error"))}>
              Xóa giỏ hàng
            </Button>
          </aside>
        </div>
      ) : null}
      <FeatureBar />
    </>
  );
}
