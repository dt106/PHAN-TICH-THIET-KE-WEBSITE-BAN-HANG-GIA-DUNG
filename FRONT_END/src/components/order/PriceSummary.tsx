import { formatMoney } from "../../lib/format.ts";
import styles from "./PriceSummary.module.css";

export function PriceSummary({
  subtotal,
  discount,
  shipping,
  total,
}: {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}) {
  return (
    <dl className={styles.totals}>
      <div>
        <dt>Tạm tính</dt>
        <dd>{formatMoney(subtotal)}</dd>
      </div>
      <div>
        <dt>Giảm giá</dt>
        <dd className={discount > 0 ? styles.discount : undefined}>
          {discount > 0 ? `−${formatMoney(discount)}` : formatMoney(0)}
        </dd>
      </div>
      <div>
        <dt>Phí vận chuyển</dt>
        <dd>{shipping > 0 ? formatMoney(shipping) : "Miễn phí"}</dd>
      </div>
      <div className={styles.grand}>
        <dt>Tổng cộng</dt>
        <dd>{formatMoney(total)}</dd>
      </div>
    </dl>
  );
}
