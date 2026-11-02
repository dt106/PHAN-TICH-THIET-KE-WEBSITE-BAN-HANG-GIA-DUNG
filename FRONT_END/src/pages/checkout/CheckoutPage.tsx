import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { shippingFeeFor } from "../../constants/commerce.ts";
import { useCart } from "../../contexts/useCart.ts";
import { addressApi, checkoutApi, couponApi, paymentApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { CheckoutSummary, Coupon, PaymentMethod, UserAddress } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";
import styles from "./CheckoutPage.module.css";

const methods: { id: PaymentMethod; label: string; note: string }[] = [
  { id: "COD", label: "Thanh toán khi nhận hàng", note: "Không cần thanh toán online." },
  { id: "BANK", label: "Chuyển khoản ngân hàng", note: "Hiện thông tin tài khoản sau khi đặt hàng." },
  { id: "VNPAY", label: "VNPay", note: "Chuyển sang cổng thanh toán. Môi trường mock hoàn tất ngay trên trang kết quả." },
  { id: "MOMO", label: "MoMo", note: "Cổng chưa tạo liên kết thanh toán." },
  { id: "ZALOPAY", label: "ZaloPay", note: "Cổng chưa tạo liên kết thanh toán." },
];

export function CheckoutPage() {
  const { lines, subtotal, loading: cartLoading, refresh } = useCart();
  const navigate = useNavigate();
  const availableIds = useMemo(
    () => lines.filter((line) => line.isAvailable).map((line) => line.id),
    [lines],
  );
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [addressId, setAddressId] = useState("");
  const [useNew, setUseNew] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [ward, setWard] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [note, setNote] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [preview, setPreview] = useState<{
    key: string;
    summary: CheckoutSummary | null;
    error: string | null;
  }>({ key: "", summary: null, error: null });
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([addressApi.list(), couponApi.publicList()])
      .then(([addressResult, couponResult]) => {
        if (!active) return;
        const list = addressResult.data ?? [];
        setAddresses(list);
        const preferred = list.find((item) => item.isDefault) ?? list[0];
        if (preferred) setAddressId(preferred.id);
        else setUseNew(true);
        setCoupons(couponResult.data ?? []);
      })
      .catch((reason) => {
        if (active) setAddressError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoadingAddress(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const shippingFee = shippingFeeFor(subtotal);
  const addressReady = useNew ? name.trim().length >= 2 && phone.trim().length >= 9 && street.trim().length >= 5 : Boolean(addressId);
  const previewKey = JSON.stringify({
    addressId,
    useNew,
    name,
    phone,
    street,
    ward,
    district,
    province,
    couponCode,
    shippingFee,
    note,
    availableIds,
    addressReady,
    cartLoading,
  });
  const summary = preview.key === previewKey ? preview.summary : null;
  const previewError = preview.key === previewKey ? preview.error : null;

  useEffect(() => {
    if (cartLoading || availableIds.length === 0 || !addressReady) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const body = useNew
        ? {
            customerName: name.trim(),
            customerPhone: phone.trim(),
            shippingAddress: street.trim(),
            shippingWard: ward.trim() || undefined,
            shippingDistrict: district.trim() || undefined,
            shippingProvince: province.trim() || undefined,
          }
        : { addressId };
      checkoutApi
        .preview({
          ...body,
          selectedCartItemIds: availableIds,
          couponCode: couponCode.trim() || undefined,
          shippingFee,
          note: note.trim() || undefined,
        })
        .then((result) => {
          if (!active) return;
          setPreview({ key: previewKey, summary: result.data, error: null });
        })
        .catch((reason) => {
          if (!active) return;
          setPreview({ key: previewKey, summary: null, error: errorMessage(reason) });
        });
    }, 350);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    addressId,
    addressReady,
    availableIds,
    cartLoading,
    couponCode,
    district,
    name,
    note,
    phone,
    province,
    shippingFee,
    previewKey,
    street,
    useNew,
    ward,
  ]);

  async function placeOrder() {
    if (availableIds.length === 0) {
      showToast("Giỏ hàng không có sản phẩm có thể đặt.", "error");
      return;
    }
    setPlacing(true);
    try {
      let nextAddressId = addressId;
      if (useNew && saveAddress) {
        const created = await addressApi.create({
          recipientName: name.trim(),
          phone: phone.trim(),
          addressLine: street.trim(),
          ward: ward.trim() || undefined,
          district: district.trim() || undefined,
          province: province.trim() || undefined,
          isDefault: addresses.length === 0,
        });
        nextAddressId = created.data.id;
      }
      const body = useNew && !saveAddress
        ? {
            customerName: name.trim(),
            customerPhone: phone.trim(),
            shippingAddress: street.trim(),
            shippingWard: ward.trim() || undefined,
            shippingDistrict: district.trim() || undefined,
            shippingProvince: province.trim() || undefined,
          }
        : { addressId: nextAddressId };
      const placed = await checkoutApi.place({
        ...body,
        selectedCartItemIds: availableIds,
        couponCode: couponCode.trim() || undefined,
        shippingFee,
        paymentMethod: payment,
        note: note.trim() || undefined,
      });
      const order = placed.data.order;
      await refresh().catch(() => undefined);
      if (payment === "COD") {
        showToast("Đặt hàng thành công.", "success");
        navigate(`/orders/${order.id}`);
        return;
      }
      try {
        const paymentResult = await paymentApi.create(order.id);
        const url = paymentResult.data.paymentUrl;
        if (url?.startsWith("http")) {
          window.location.assign(url);
          return;
        }
        if (url?.startsWith("mock:")) {
          navigate(`/payment/result?order=${encodeURIComponent(order.orderNumber)}&status=pending&mock=1`);
          return;
        }
      } catch (reason) {
        showToast(errorMessage(reason), "warning");
        navigate(`/orders/${order.id}`);
        return;
      }
      showToast("Đơn hàng đã được tạo.", "success");
      navigate(`/orders/${order.id}`);
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <PageBanner title="Thanh toán" />
      <div className={`wrap ${styles.layout}`}>
        <div>
          <h2>Địa chỉ giao hàng</h2>
          {loadingAddress ? <p>Đang tải địa chỉ...</p> : null}
          {cartLoading ? <p>Đang tải giỏ hàng...</p> : null}
          {!cartLoading && lines.length === 0 ? (
            <p>
              Giỏ hàng đang trống. <Link to="/shop">Quay lại cửa hàng</Link>
            </p>
          ) : null}
          <div className={panels.stack}>
            {addresses.map((address) => (
              <label key={address.id} className={panels.card}>
                <span>
                  <input
                    type="radio"
                    name="address"
                    checked={!useNew && addressId === address.id}
                    onChange={() => {
                      setUseNew(false);
                      setAddressId(address.id);
                    }}
                  />{" "}
                  {address.recipientName} · {address.phone}
                  {address.isDefault ? " · Mặc định" : ""}
                </span>
                <span>
                  {address.addressLine}
                  {address.ward ? `, ${address.ward}` : ""}
                  {address.district ? `, ${address.district}` : ""}
                  {address.province ? `, ${address.province}` : ""}
                </span>
              </label>
            ))}
            <label>
              <input type="checkbox" checked={useNew} onChange={(event) => setUseNew(event.target.checked)} /> Nhập địa chỉ mới
            </label>
            {useNew ? (
              <div className={panels.form} style={{ margin: 0 }}>
                <TextInput label="Người nhận" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
                <TextInput label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} required fullWidth />
                <TextInput label="Địa chỉ" value={street} onChange={(event) => setStreet(event.target.value)} required fullWidth />
                <TextInput label="Phường/xã" value={ward} onChange={(event) => setWard(event.target.value)} fullWidth />
                <TextInput label="Quận/huyện" value={district} onChange={(event) => setDistrict(event.target.value)} fullWidth />
                <TextInput label="Tỉnh/thành" value={province} onChange={(event) => setProvince(event.target.value)} fullWidth />
                <label>
                  <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} /> Lưu vào sổ địa chỉ
                </label>
              </div>
            ) : null}
            <TextInput label="Ghi chú" value={note} onChange={(event) => setNote(event.target.value)} fullWidth />
            <TextInput
              label="Mã giảm giá"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              fullWidth
            />
            {coupons.length > 0 ? (
              <div className={panels.row}>
                {coupons.map((coupon) => (
                  <Button key={coupon.id} variant="outline" size="sm" onClick={() => setCouponCode(coupon.code)}>
                    {coupon.code}
                  </Button>
                ))}
              </div>
            ) : (
              <p className={panels.muted}>Hiện không có mã giảm giá công khai.</p>
            )}
          </div>
        </div>
        <aside className={styles.summary}>
          <h2>Đơn hàng</h2>
          {lines.map((line) => (
            <div key={line.id} className={styles.line}>
              <span className={styles.productName}>
                {line.name}
                {line.variantSku ? ` (${line.variantSku})` : ""} × {line.quantity}
                {!line.isAvailable ? " — không đặt được" : ""}
              </span>
              <span>{formatPrice(line.unitPrice * line.quantity)}</span>
            </div>
          ))}
          {summary ? (
            <>
              <div className={styles.totals}>
                <span>Tạm tính</span>
                <span>{formatPrice(summary.subtotal)}</span>
              </div>
              <div className={styles.totals}>
                <span>Giảm giá</span>
                <span>{formatPrice(summary.discountAmount)}</span>
              </div>
              <div className={styles.totals}>
                <span>Phí vận chuyển</span>
                <span>{formatPrice(summary.shippingFee)}</span>
              </div>
              <div className={styles.totals}>
                <span>Tổng</span>
                <span className={styles.total}>{formatPrice(summary.totalAmount)}</span>
              </div>
            </>
          ) : (
            <p className={panels.muted}>{previewError || addressError || "Nhập địa chỉ để xem tạm tính."}</p>
          )}
          {previewError && summary ? <p className={panels.alert}>{previewError}</p> : null}
          <div className={styles.payments}>
            {methods.map((method) => (
              <label key={method.id}>
                <input
                  type="radio"
                  name="payment"
                  checked={payment === method.id}
                  onChange={() => setPayment(method.id)}
                />{" "}
                {method.label}
                <small className={panels.muted}> — {method.note}</small>
              </label>
            ))}
          </div>
          <p className={styles.note}>
            Phí vận chuyển do cửa hàng tính tạm: miễn phí từ 3.000.000₫, còn lại 30.000₫. Máy chủ chưa có bảng phí riêng.
          </p>
          <Button type="button" variant="outline" fullWidth loading={placing} onClick={() => void placeOrder()}>
            Đặt hàng
          </Button>
        </aside>
      </div>
      <FeatureBar />
    </>
  );
}
