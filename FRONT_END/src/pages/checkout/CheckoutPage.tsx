import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { useCart } from "../../contexts/useCart.ts";
import { SHIPPING_FEE, formatMoney } from "../../lib/money.ts";
import { addressService } from "../../services/address.service.ts";
import { checkoutService } from "../../services/checkout.service.ts";
import { couponService } from "../../services/coupon.service.ts";
import { errorText } from "../../services/http.ts";
import { paymentService } from "../../services/payment.service.ts";
import type { CheckoutSummary, Coupon, PaymentMethod, UserAddress, CheckoutInput } from "../../types/api.ts";
import styles from "./CheckoutPage.module.css";

const iconProps = { width: 22, height: 22, fill: "none", stroke: "currentColor", strokeWidth: 1.8, viewBox: "0 0 24 24" };

const methods: { id: PaymentMethod; label: string; hint: string; icon: ReactNode }[] = [
  {
    id: "COD",
    label: "Thanh toán khi nhận hàng",
    hint: "Trả tiền mặt cho nhân viên giao hàng.",
    icon: (
      <svg {...iconProps}>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    ),
  },
  {
    id: "MOMO",
    label: "Ví MoMo",
    hint: "Quét QR hoặc mở ứng dụng MoMo để thanh toán.",
    icon: <span className={styles.momo}>MoMo</span>,
  },
];

const steps = ["Giỏ hàng", "Thanh toán", "Hoàn tất"];

function formatAddress(item: UserAddress) {
  return [item.addressLine, item.ward, item.district, item.province].filter(Boolean).join(", ");
}

export function CheckoutPage() {
  const { items, refresh } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const manual = addressId === "";
  const lines = items.filter((line) => line.isAvailable);

  useEffect(() => {
    addressService.getAddresses().then((result) => {
      setAddresses(result.data);
      const preferred = result.data.find((item) => item.isDefault) ?? result.data[0];
      if (preferred) setAddressId(preferred.id);
    }).catch((reason: unknown) => showToast(errorText(reason), "error"));
    couponService.getPublicCoupons().then((result) => setCoupons(result.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    checkoutService
      .previewCheckout({ couponCode: couponCode || undefined, shippingFee: SHIPPING_FEE })
      .then((result) => {
        if (active) setSummary(result.data);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        showToast(errorText(reason), "error");
        if (couponCode) setCouponCode("");
      });
    return () => {
      active = false;
    };
  }, [items, couponCode]);

  function applyCoupon(code: string) {
    const value = code.trim().toUpperCase();
    setCouponInput(value);
    if (value) setCouponCode(value);
  }

  function removeCoupon() {
    setCouponInput("");
    setCouponCode("");
  }

  function payload(form: FormData) {
    const body: CheckoutInput & { paymentMethod: PaymentMethod } = {
      couponCode: couponCode || undefined,
      shippingFee: SHIPPING_FEE,
      paymentMethod: payment,
      note: note.trim() || undefined,
    };
    if (!manual) return { ...body, addressId };
    const read = (key: string) => String(form.get(key) ?? "").trim();
    return {
      ...body,
      customerName: read("customerName"),
      customerPhone: read("customerPhone"),
      shippingAddress: read("shippingAddress"),
      shippingWard: read("shippingWard") || undefined,
      shippingDistrict: read("shippingDistrict") || undefined,
      shippingProvince: read("shippingProvince") || undefined,
    };
  }

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0) {
      showToast("Giỏ hàng trống.", "error");
      return;
    }
    const body = payload(new FormData(event.currentTarget));
    setBusy(true);
    try {
      const { order } = (await checkoutService.placeOrder(body)).data;
      await refresh();
      if (payment === "COD") {
        showToast("Đặt hàng thành công.", "success");
        navigate(`/payment/result?order=${encodeURIComponent(order.orderNumber)}&status=placed&id=${order.id}`);
        return;
      }
      const next = await paymentService.startPayment(order.id, order.orderNumber);
      if (next) navigate(next.path);
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  const subtotal = summary?.subtotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = summary?.discountAmount ?? 0;
  const shippingFee = summary?.shippingFee ?? SHIPPING_FEE;
  const total = summary?.totalAmount ?? subtotal + shippingFee;
  const submitLabel = payment === "MOMO" ? "Thanh toán bằng MoMo" : "Đặt hàng";

  if (items.length === 0) {
    return (
      <div className={`wrap ${styles.empty}`}>
        <h1>Giỏ hàng đang trống</h1>
        <p>Thêm vài món đồ gia dụng rồi quay lại thanh toán nhé.</p>
        <Link to="/shop" className={styles.primaryLink}>Tiếp tục mua sắm</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="wrap">
        <ol className={styles.steps}>
          {steps.map((label, index) => (
            <li key={label} className={index <= 1 ? styles.stepDone : undefined}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <form className={styles.layout} onSubmit={place}>
          <div className={styles.main}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.badge}>1</span>Thông tin giao hàng
              </h2>
              {addresses.length > 0 ? (
                <div className={styles.options}>
                  {addresses.map((item) => (
                    <label key={item.id} className={styles.option} data-active={addressId === item.id}>
                      <input
                        type="radio"
                        name="address"
                        checked={addressId === item.id}
                        onChange={() => setAddressId(item.id)}
                      />
                      <span className={styles.optionBody}>
                        <strong>
                          {item.recipientName} · {item.phone}
                          {item.isDefault ? <em className={styles.tag}>Mặc định</em> : null}
                        </strong>
                        <small>{formatAddress(item)}</small>
                      </span>
                    </label>
                  ))}
                  <label className={styles.option} data-active={manual}>
                    <input type="radio" name="address" checked={manual} onChange={() => setAddressId("")} />
                    <span className={styles.optionBody}>
                      <strong>Giao tới địa chỉ khác</strong>
                      <small>Nhập địa chỉ mới cho đơn này.</small>
                    </span>
                  </label>
                </div>
              ) : null}
              {manual ? (
                <div className={styles.form}>
                  <TextInput label="Người nhận" name="customerName" required minLength={2} fullWidth />
                  <TextInput
                    label="Số điện thoại"
                    name="customerPhone"
                    type="tel"
                    required
                    pattern="0\d{9}"
                    title="Số điện thoại 10 số, bắt đầu bằng 0"
                    fullWidth
                  />
                  <div className={styles.full}>
                    <TextInput label="Địa chỉ (số nhà, đường)" name="shippingAddress" required minLength={5} fullWidth />
                  </div>
                  <TextInput label="Phường/xã" name="shippingWard" fullWidth />
                  <TextInput label="Quận/huyện" name="shippingDistrict" fullWidth />
                  <div className={styles.full}>
                    <TextInput label="Tỉnh/thành" name="shippingProvince" fullWidth />
                  </div>
                </div>
              ) : null}
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.badge}>2</span>Phương thức thanh toán
              </h2>
              <div className={styles.methods}>
                {methods.map((item) => (
                  <label key={item.id} className={styles.option} data-active={payment === item.id}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={payment === item.id}
                      onChange={() => setPayment(item.id)}
                    />
                    <span className={styles.methodIcon} data-method={item.id}>
                      {item.icon}
                    </span>
                    <span className={styles.optionBody}>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className={styles.payHint} data-method={payment}>
                {payment === "MOMO"
                  ? "Sau khi đặt hàng, bạn sẽ được chuyển sang cổng MoMo để quét QR hoặc xác nhận trên app."
                  : "Không cần thanh toán trước. Kiểm tra hàng rồi trả tiền mặt cho shipper khi nhận."}
              </p>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <span className={styles.badge}>3</span>Ghi chú đơn hàng
              </h2>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ví dụ: giao giờ hành chính, gọi trước khi giao…"
                maxLength={500}
                rows={3}
              />
            </section>
          </div>

          <aside className={styles.summary}>
            <div className={styles.card}>
              <h2 className={styles.summaryTitle}>
                Đơn hàng <span>({lines.length} sản phẩm)</span>
              </h2>
              <ul className={styles.items}>
                {lines.map((line) => (
                  <li key={line.id}>
                    <span className={styles.thumb}>
                      {line.productImage ? <img src={line.productImage} alt="" /> : null}
                      <b>{line.quantity}</b>
                    </span>
                    <span className={styles.itemName}>
                      {line.productName}
                      {line.variantSku ? <small>{line.variantSku}</small> : null}
                    </span>
                    <span>{formatMoney(line.lineTotal)}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.coupon}>
                {summary?.coupon ? (
                  <div className={styles.applied}>
                    <span>
                      <strong>{summary.coupon.code}</strong> · {summary.coupon.name}
                    </span>
                    <button type="button" onClick={removeCoupon} aria-label="Bỏ mã giảm giá">×</button>
                  </div>
                ) : (
                  <div className={styles.couponRow}>
                    <input
                      value={couponInput}
                      onChange={(event) => setCouponInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyCoupon(couponInput);
                        }
                      }}
                      placeholder="Mã giảm giá"
                      aria-label="Mã giảm giá"
                    />
                    <Button type="button" variant="outline" onClick={() => applyCoupon(couponInput)}>
                      Áp dụng
                    </Button>
                  </div>
                )}
                {!summary?.coupon && coupons.length > 0 ? (
                  <div className={styles.chips}>
                    {coupons.map((coupon) => (
                      <button key={coupon.id} type="button" title={coupon.name} onClick={() => applyCoupon(coupon.code)}>
                        {coupon.code}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

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
                  <dd>{shippingFee > 0 ? formatMoney(shippingFee) : "Miễn phí"}</dd>
                </div>
                <div className={styles.grand}>
                  <dt>Tổng cộng</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>

              <Button type="submit" variant="primary" size="lg" fullWidth loading={busy} disabled={lines.length === 0}>
                {submitLabel}
              </Button>
              <p className={styles.secure}>
                <svg {...iconProps} width={16} height={16}>
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                Thông tin thanh toán được mã hóa và bảo mật.
              </p>
              <Link to="/cart" className={styles.back}>← Quay lại giỏ hàng</Link>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}
