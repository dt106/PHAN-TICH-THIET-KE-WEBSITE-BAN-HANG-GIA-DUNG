import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { formatMoney } from "../../lib/money.ts";
import { addressService, type AddressInput } from "../../services/address.service.ts";
import { authService } from "../../services/auth.service.ts";
import { errorText } from "../../services/http.ts";
import { paymentService, type MyPayment } from "../../services/payment.service.ts";
import { statisticsService } from "../../services/statistics.service.ts";
import type { CustomerOverview, UserAddress } from "../../types/api.ts";

export function AccountPage() {
  const { user, logout, setUser } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [payments, setPayments] = useState<MyPayment[]>([]);

  function loadAddresses() {
    addressService.getAddresses().then((result) => setAddresses(result.data)).catch(() => undefined);
  }

  useEffect(() => {
    loadAddresses();
    statisticsService.getCustomerOverview().then((result) => setOverview(result.data)).catch(() => undefined);
    paymentService.getMyPayments().then((result) => setPayments(result.data)).catch(() => undefined);
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const avatar = form.get("avatar");
    if (avatar instanceof File && avatar.size === 0) form.delete("avatar");
    if (!String(form.get("phone") ?? "").trim()) form.delete("phone");
    try {
      const result = await authService.updateProfile(form);
      setUser(result.data.user);
      showToast("Đã cập nhật hồ sơ.", "success");
    } catch (reason) {
      showToast(errorText(reason), "error");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await authService.changePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
      });
      showToast("Đã đổi mật khẩu.", "success");
      event.currentTarget.reset();
    } catch (reason) {
      showToast(errorText(reason), "error");
    }
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: AddressInput = {
      recipientName: String(data.get("recipientName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      addressLine: String(data.get("addressLine") ?? ""),
      ward: String(data.get("ward") ?? ""),
      district: String(data.get("district") ?? ""),
      province: String(data.get("province") ?? ""),
    };
    try {
      await addressService.createAddress(body);
      showToast("Đã thêm địa chỉ.", "success");
      event.currentTarget.reset();
      loadAddresses();
    } catch (reason) {
      showToast(errorText(reason), "error");
    }
  }

  if (!user) return null;

  return (
    <>
      <PageBanner title="My account" />
      <div className="wrap" style={{ padding: "64px 0", display: "grid", gap: 28, maxWidth: 720 }}>
        <section>
          <h2 style={{ marginTop: 0 }}>{user.name}</h2>
          <p>{user.email}</p>
          {overview ? (
            <p>
              {overview.totalOrders} đơn · đã chi {formatMoney(overview.totalSpent)} ·{" "}
              {overview.totalWishlistItems} yêu thích · {overview.totalReviews} đánh giá
            </p>
          ) : null}
          <p>
            <Link to="/orders">Đơn hàng</Link> · <Link to="/wishlist">Yêu thích</Link>
          </p>
        </section>

        <form onSubmit={saveProfile} style={{ display: "grid", gap: 12 }}>
          <h2>Hồ sơ</h2>
          <TextInput label="Tên" name="name" defaultValue={user.name} fullWidth />
          <TextInput label="Số điện thoại" name="phone" defaultValue={user.phone ?? ""} fullWidth />
          <label>
            Ảnh đại diện
            <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
          </label>
          <Button type="submit" variant="primary">Lưu hồ sơ</Button>
        </form>

        <form onSubmit={changePassword} style={{ display: "grid", gap: 12 }}>
          <h2>Đổi mật khẩu</h2>
          <TextInput label="Mật khẩu hiện tại" name="currentPassword" type="password" required fullWidth />
          <TextInput label="Mật khẩu mới" name="newPassword" type="password" required fullWidth />
          <Button type="submit" variant="outline">Đổi mật khẩu</Button>
        </form>

        <section style={{ display: "grid", gap: 12 }}>
          <h2>Địa chỉ</h2>
          {addresses.map((item) => (
            <article key={item.id}>
              <strong>{item.recipientName}</strong> · {item.phone}
              {item.isDefault ? " · mặc định" : ""}
              <p>
                {[item.addressLine, item.ward, item.district, item.province].filter(Boolean).join(", ")}
              </p>
              <button
                type="button"
                onClick={() => addressService.setDefaultAddress(item.id).then(loadAddresses).catch((reason: unknown) => showToast(errorText(reason), "error"))}
              >
                Đặt mặc định
              </button>{" "}
              <button
                type="button"
                onClick={() => addressService.removeAddress(item.id).then(loadAddresses).catch((reason: unknown) => showToast(errorText(reason), "error"))}
              >
                Xóa
              </button>
            </article>
          ))}
          <form onSubmit={addAddress} style={{ display: "grid", gap: 12 }}>
            <TextInput label="Người nhận" name="recipientName" required fullWidth />
            <TextInput label="Số điện thoại" name="phone" required fullWidth />
            <TextInput label="Địa chỉ" name="addressLine" required fullWidth />
            <TextInput label="Phường/xã" name="ward" fullWidth />
            <TextInput label="Quận/huyện" name="district" fullWidth />
            <TextInput label="Tỉnh/thành" name="province" fullWidth />
            <Button type="submit" variant="outline">Thêm địa chỉ</Button>
          </form>
        </section>

        <section>
          <h2>Thanh toán của tôi</h2>
          {payments.length === 0 ? <p>Chưa có giao dịch.</p> : (
            <ul>
              {payments.map((item) => (
                <li key={item.id}>
                  {item.order?.orderNumber ?? item.id} · {item.paymentMethod} · {item.status} · {formatMoney(item.amount)}
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button variant="outline" onClick={() => void logout().then(() => window.location.assign("/"))}>
          Đăng xuất
        </Button>
      </div>
    </>
  );
}
