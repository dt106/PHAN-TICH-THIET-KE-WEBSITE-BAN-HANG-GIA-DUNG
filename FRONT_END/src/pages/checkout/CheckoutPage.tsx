import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { SHIPPING_FEE, formatMoney } from "../../lib/money.ts";
import { addressService } from "../../services/address.service.ts";
import { checkoutService } from "../../services/checkout.service.ts";
import { couponService } from "../../services/coupon.service.ts";
import { errorText } from "../../services/http.ts";
import { paymentService } from "../../services/payment.service.ts";
import type { CheckoutSummary, Coupon, PaymentMethod, UserAddress, CheckoutInput } from "../../types/api.ts";
import styles from "./CheckoutPage.module.css";

const methods: { id: PaymentMethod; label: string }[] = [
  { id: "COD", label: "Thanh toán khi nhận hàng" },
  { id: "BANK", label: "Chuyển khoản ngân hàng" },
  { id: "VNPAY", label: "VNPay" },
];

export function CheckoutPage() {
  const { items, refresh } = useCart();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    addressService.getAddresses().then((result) => {
      setAddresses(result.data);
      const preferred = result.data.find((item) => item.isDefault) ?? result.data[0];
      if (preferred) setAddressId(preferred.id);
      else setManual(true);
    }).catch((reason: unknown) => showToast(errorText(reason), "error"));
    couponService.getPublicCoupons().then((result) => setCoupons(result.data)).catch(() => undefined);
  }, []);

  function payload(form?: FormData) {
    const body: CheckoutInput & { paymentMethod: PaymentMethod } = {
      couponCode: couponCode.trim() || undefined,
      shippingFee: SHIPPING_FEE,
      paymentMethod: payment,
      note: note.trim() || undefined,
    };
    if (!manual && addressId) return { ...body, addressId };
    const read = (key: string) => String(form?.get(key) ?? "").trim();
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

  async function preview() {
    const form = formRef.current ? new FormData(formRef.current) : undefined;
    setBusy(true);
    try {
      const result = await checkoutService.previewCheckout(payload(form));
      setSummary(result.data);
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function place(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.length === 0) {
      showToast("Giỏ hàng trống.", "error");
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const body = payload(form);
      const placed = await checkoutService.placeOrder(body);
      const order = placed.data.order;
      await refresh();
      if (payment === "COD") {
        showToast("Đã đặt hàng.", "success");
        navigate(`/orders/${order.id}`);
        return;
      }
      const session = await paymentService.createPayment(order.id);
      const url = session.data.paymentUrl;
      if (url?.startsWith("http")) {
        window.location.assign(url);
        return;
      }
      if (url?.startsWith("mock:")) {
        await paymentService.mockCompletePayment(order.orderNumber, true);
        navigate(`/payment/result?order=${encodeURIComponent(order.orderNumber)}&status=success`);
        return;
      }
      showToast("Đã tạo phiên thanh toán.", "success");
      navigate(`/orders/${order.id}`, { state: { bank: session.data.bankTransferInfo } });
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageBanner title="Checkout" />
      <form ref={formRef} className={`wrap ${styles.layout}`} onSubmit={place}>
        <div>
          <h2>Giao hàng</h2>
          {addresses.length > 0 ? (
            <label>
              <input type="checkbox" checked={manual} onChange={(event) => setManual(event.target.checked)} />{" "}
              Nhập địa chỉ mới, không lưu sổ
            </label>
          ) : null}
          {!manual && addresses.length > 0 ? (
            <label>
              Địa chỉ đã lưu{" "}
              <select value={addressId} onChange={(event) => setAddressId(event.target.value)}>
                {addresses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.recipientName} — {item.addressLine}, {item.province}
                    {item.isDefault ? " (mặc định)" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className={styles.form}>
              <TextInput label="Người nhận" name="customerName" required fullWidth />
              <TextInput label="Số điện thoại" name="customerPhone" required fullWidth />
              <div className={styles.full}>
                <TextInput label="Địa chỉ" name="shippingAddress" required fullWidth />
              </div>
              <TextInput label="Phường/xã" name="shippingWard" fullWidth />
              <TextInput label="Quận/huyện" name="shippingDistrict" fullWidth />
              <TextInput label="Tỉnh/thành" name="shippingProvince" fullWidth />
            </div>
          )}
          <label>
            Mã giảm giá{" "}
            <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} list="coupons" />
            <datalist id="coupons">
              {coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.code}>{coupon.name}</option>
              ))}
            </datalist>
          </label>
          <label>
            Ghi chú
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void preview()}>
            Xem tổng
          </Button>
        </div>
        <aside className={styles.summary}>
          <h2>Đơn hàng</h2>
          {items.length === 0 ? (
            <p>Giỏ trống. <Link to="/shop">Về cửa hàng</Link></p>
          ) : (
            items.map((line) => (
              <div key={line.id} className={styles.line}>
                <span className={styles.productName}>{line.productName} × {line.quantity}</span>
                <span>{formatMoney(line.lineTotal)}</span>
              </div>
            ))
          )}
          <div className={styles.totals}>
            <span>Tạm tính</span>
            <span>{formatMoney(summary?.subtotal ?? items.reduce((sum, line) => sum + (line.isAvailable ? line.lineTotal : 0), 0))}</span>
          </div>
          <div className={styles.totals}>
            <span>Giảm giá</span>
            <span>{formatMoney(summary?.discountAmount ?? 0)}</span>
          </div>
          <div className={styles.totals}>
            <span>Phí vận chuyển</span>
            <span>{formatMoney(summary?.shippingFee ?? SHIPPING_FEE)}</span>
          </div>
          <div className={styles.totals}>
            <span>Tổng</span>
            <span className={styles.total}>{formatMoney(summary?.totalAmount ?? 0)}</span>
          </div>
          <div className={styles.payments}>
            {methods.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={payment === item.id}
                  onChange={() => setPayment(item.id)}
                />{" "}
                {item.label}
              </label>
            ))}
          </div>
          <p className={styles.note}>MoMo và ZaloPay chưa tạo được link thanh toán nên không hiện ở đây.</p>
          <Button type="submit" variant="outline" fullWidth disabled={busy}>
            Đặt hàng
          </Button>
        </aside>
      </form>
      <FeatureBar />
    </>
  );
}
