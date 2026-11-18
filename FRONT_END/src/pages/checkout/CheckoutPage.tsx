import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, ButtonLink, showToast, toastError } from "../../components/common/index.ts";
import { AddressForm } from "../../components/order/AddressForm.tsx";
import { PriceSummary } from "../../components/order/PriceSummary.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { useAction } from "../../hooks/useAction.ts";
import { useRequest } from "../../hooks/useRequest.ts";
import { SHIPPING_FEE, formatAddress, formatMoney } from "../../lib/format.ts";
import { addressService } from "../../services/address.service.ts";
import { checkoutService } from "../../services/checkout.service.ts";
import { couponService } from "../../services/coupon.service.ts";
import { paymentService } from "../../services/payment.service.ts";
import type { CheckoutInput, CheckoutSummary, PaymentMethod } from "../../types/api.ts";
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

export function CheckoutPage() {
  const { items, refresh } = useCart();
  const navigate = useNavigate();
  const [addressId, setAddressId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [note, setNote] = useState("");
  const [busy, run] = useAction();

  const { data: addresses = [] } = useRequest(
    () =>
      addressService
        .getAddresses()
        .then((result) => result.data)
        .catch((reason: unknown) => {
          toastError(reason);
          return [];
        }),
    [],
  );
  const { data: coupons = [] } = useRequest(
    () => couponService.getPublicCoupons().then((result) => result.data).catch(() => []),
    [],
  );
  const cartKey = items.map((line) => `${line.id}:${line.quantity}:${line.lineTotal}`).join("|");
  const { data: summary } = useRequest(async () => {
    if (items.length === 0) return null;
    try {
      const result = await checkoutService.previewCheckout({
        couponCode: couponCode || undefined,
        shippingFee: SHIPPING_FEE,
      });
      return result.data;
    } catch (reason) {
      toastError(reason);
      if (couponCode) setCouponCode("");
      throw reason;
    }
  }, [cartKey, couponCode]);

  const preferred = addresses.find((item) => item.isDefault) ?? addresses[0];
  const chosen = addressId === null ? (preferred?.id ?? "") : addressId;
  const manual = chosen === "";
  const lines = items.filter((line) => line.isAvailable);

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
    if (!manual) return { ...body, addressId: chosen };
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
    await run(async () => {
      const { order } = (await checkoutService.placeOrder(body)).data;
      await refresh();
      if (payment === "COD") {
        showToast("Đặt hàng thành công.", "success");
        navigate(`/payment/result?order=${encodeURIComponent(order.orderNumber)}&status=placed&id=${order.id}`);
        return;
      }
      const next = await paymentService.startPayment(order.id, order.orderNumber);
      if (next) navigate(next.path);
    });
  }

  const quote: CheckoutSummary | null = summary ?? null;
  const subtotal = quote?.subtotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = quote?.discountAmount ?? 0;
  const shippingFee = quote?.shippingFee ?? SHIPPING_FEE;
  const total = quote?.totalAmount ?? subtotal + shippingFee;
  const submitLabel = payment === "MOMO" ? "Thanh toán bằng MoMo" : "Đặt hàng";

  if (items.length === 0) {
    return (
      <div className={`wrap ${styles.empty}`}>
        <h1>Giỏ hàng đang trống</h1>
        <p>Thêm vài món đồ gia dụng rồi quay lại thanh toán nhé.</p>
        <ButtonLink to="/shop">Tiếp tục mua sắm</ButtonLink>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="wrap">
        <ol className="steps">
          {steps.map((label, index) => (
            <li key={label} className={index <= 1 ? "stepDone" : undefined}>
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <form className={styles.layout} onSubmit={place}>
          <div className={styles.main}>
            <section className={`card ${styles.panel}`}>
              <h2 className={styles.cardTitle}>
                <span className={styles.badge}>1</span>Thông tin giao hàng
              </h2>
              {addresses.length > 0 ? (
                <div className={styles.options}>
                  {addresses.map((item) => (
                    <label key={item.id} className={styles.option} data-active={chosen === item.id}>
                      <input
                        type="radio"
                        name="address"
                        checked={chosen === item.id}
                        onChange={() => setAddressId(item.id)}
                      />
                      <span className={styles.optionBody}>
                        <strong>
                          {item.recipientName} · {item.phone}
                          {item.isDefault ? <em className={styles.tag}>Mặc định</em> : null}
                        </strong>
                        <small>{formatAddress([item.addressLine, item.ward, item.district, item.province])}</small>
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
              {manual ? <AddressForm checkout /> : null}
            </section>

            <section className={`card ${styles.panel}`}>
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

            <section className={`card ${styles.panel}`}>
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
            <div className={`card ${styles.panel}`}>
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
                {quote?.coupon ? (
                  <div className={styles.applied}>
                    <span>
                      <strong>{quote.coupon.code}</strong> · {quote.coupon.name}
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
                {!quote?.coupon && coupons.length > 0 ? (
                  <div className={styles.chips}>
                    {coupons.map((coupon) => (
                      <button key={coupon.id} type="button" title={coupon.name} onClick={() => applyCoupon(coupon.code)}>
                        {coupon.code}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <PriceSummary subtotal={subtotal} discount={discount} shipping={shippingFee} total={total} />

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
