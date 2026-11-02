import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import {
  ORDER_STATUS_LABEL,
  PASSWORD_HINT,
} from "../../constants/commerce.ts";
import { useAuth } from "../../contexts/useAuth.ts";
import { addressApi, authApi, statsApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { CustomerOverview, UserAddress } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";

type Tab = "overview" | "profile" | "addresses" | "password";

export function AccountPage() {
  const { user, refresh, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<CustomerOverview | null>(null);
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (tab === "overview") {
      Promise.all([statsApi.overview(), statsApi.reviews(), statsApi.orders()])
        .then(([overviewResult, reviewResult, orderResult]) => {
          if (!active) return;
          setOverview(overviewResult.data);
          setReviewCount(reviewResult.data.totalReviews);
          setOrderTotal(orderResult.data.totalOrders);
        })
        .catch((reason) => {
          if (active) setError(errorMessage(reason));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    if (tab === "addresses") {
      addressApi
        .list()
        .then((result) => {
          if (active) setAddresses(result.data ?? []);
        })
        .catch((reason) => {
          if (active) setError(errorMessage(reason));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [tab]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!String(form.get("phone") || "").trim()) form.delete("phone");
    const avatar = form.get("avatar");
    if (!(avatar instanceof File) || avatar.size === 0) form.delete("avatar");
    setLoading(true);
    try {
      await authApi.updateProfile(form);
      await refresh();
      showToast("Đã cập nhật hồ sơ.", "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: String(data.get("currentPassword") || ""),
        newPassword: String(data.get("newPassword") || ""),
        confirmPassword: String(data.get("confirmPassword") || ""),
      });
      event.currentTarget.reset();
      showToast("Đã đổi mật khẩu.", "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setLoading(false);
    }
  }

  async function createAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setLoading(true);
    try {
      await addressApi.create({
        recipientName: String(data.get("recipientName") || ""),
        phone: String(data.get("phone") || ""),
        addressLine: String(data.get("addressLine") || ""),
        ward: String(data.get("ward") || "") || undefined,
        district: String(data.get("district") || "") || undefined,
        province: String(data.get("province") || "") || undefined,
      });
      const result = await addressApi.list();
      setAddresses(result.data ?? []);
      event.currentTarget.reset();
      showToast("Đã thêm địa chỉ.", "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    } finally {
      setLoading(false);
    }
  }

  async function mutateAddress(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      const result = await addressApi.list();
      setAddresses(result.data ?? []);
      showToast(message, "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    }
  }

  return (
    <>
      <PageBanner title="Tài khoản" />
      <div className="wrap" style={{ padding: "48px 0 72px" }}>
        <div className={panels.tabs} role="tablist">
          {(
            [
              ["overview", "Tổng quan"],
              ["profile", "Hồ sơ"],
              ["addresses", "Địa chỉ"],
              ["password", "Mật khẩu"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={panels.tab}
              aria-selected={tab === id}
              onClick={() => {
                setError(null);
                setLoading(id === "overview" || id === "addresses");
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? <p className={panels.alert}>{error}</p> : null}
        {loading && tab !== "profile" && tab !== "password" ? <p>Đang tải...</p> : null}
        {tab === "overview" && overview ? (
          <div className={panels.stack} style={{ paddingTop: 0 }}>
            <h2 style={{ margin: 0 }}>{user?.name}</h2>
            <p>{user?.email}</p>
            <p>Số điện thoại: {user?.phone || "Chưa cập nhật"}</p>
            <p>Đơn hàng: {orderTotal ?? overview.totalOrders}</p>
            <p>Đã chi (giao thành công): {formatPrice(overview.totalSpent)}</p>
            <p>Yêu thích: {overview.totalWishlistItems}</p>
            <p>Đánh giá đã gửi: {reviewCount ?? overview.totalReviews}</p>
            <ul>
              {overview.ordersByStatus.map((item) => (
                <li key={item.status}>
                  {ORDER_STATUS_LABEL[item.status] ?? item.status}: {item.total}
                </li>
              ))}
            </ul>
            {overview.ordersByStatus.length === 0 ? <p className={panels.muted}>Chưa có đơn hàng.</p> : null}
            <div className={panels.row}>
              <Link to="/orders">Xem đơn hàng</Link>
              <Link to="/wishlist">Danh sách yêu thích</Link>
            </div>
            <Button variant="outline" onClick={() => void logout().then(() => window.location.assign("/"))}>
              Đăng xuất
            </Button>
          </div>
        ) : null}
        {tab === "profile" ? (
          <form className={panels.form} style={{ margin: 0 }} onSubmit={(event) => void saveProfile(event)}>
            {user?.avatar ? <img src={user.avatar} alt="" width={72} height={72} style={{ objectFit: "cover" }} /> : null}
            <TextInput label="Họ tên" name="name" defaultValue={user?.name} required fullWidth />
            <TextInput label="Số điện thoại" name="phone" defaultValue={user?.phone ?? ""} fullWidth hint="0xxxxxxxxx hoặc +84xxxxxxxxx" />
            <TextInput label="Ảnh đại diện" name="avatar" type="file" accept="image/jpeg,image/png,image/webp,image/gif" fullWidth />
            <p className={panels.muted}>Email không đổi tại đây: {user?.email}</p>
            <Button type="submit" loading={loading}>Lưu hồ sơ</Button>
          </form>
        ) : null}
        {tab === "password" ? (
          <form className={panels.form} style={{ margin: 0 }} onSubmit={(event) => void savePassword(event)}>
            <TextInput label="Mật khẩu hiện tại" name="currentPassword" type="password" required fullWidth />
            <TextInput label="Mật khẩu mới" name="newPassword" type="password" required fullWidth hint={PASSWORD_HINT} />
            <TextInput label="Xác nhận mật khẩu mới" name="confirmPassword" type="password" required fullWidth />
            <Button type="submit" loading={loading}>Đổi mật khẩu</Button>
          </form>
        ) : null}
        {tab === "addresses" ? (
          <div className={panels.stack} style={{ paddingTop: 0 }}>
            {addresses.length === 0 && !loading ? <p>Chưa có địa chỉ.</p> : null}
            {addresses.map((address) => (
              <article key={address.id} className={panels.card}>
                <strong>
                  {address.recipientName} · {address.phone}
                  {address.isDefault ? " · Mặc định" : ""}
                </strong>
                <span>
                  {address.addressLine}
                  {address.ward ? `, ${address.ward}` : ""}
                  {address.district ? `, ${address.district}` : ""}
                  {address.province ? `, ${address.province}` : ""}
                </span>
                <div className={panels.row}>
                  {!address.isDefault ? (
                    <Button size="sm" variant="outline" onClick={() => void mutateAddress(() => addressApi.setDefault(address.id), "Đã đặt mặc định.")}>
                      Đặt mặc định
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => void mutateAddress(() => addressApi.remove(address.id), "Đã xóa địa chỉ.")}>
                    Xóa
                  </Button>
                </div>
              </article>
            ))}
            <h3>Thêm địa chỉ</h3>
            <form className={panels.form} style={{ margin: 0 }} onSubmit={(event) => void createAddress(event)}>
              <TextInput label="Người nhận" name="recipientName" required fullWidth />
              <TextInput label="Số điện thoại" name="phone" required fullWidth />
              <TextInput label="Địa chỉ" name="addressLine" required fullWidth />
              <TextInput label="Phường/xã" name="ward" fullWidth />
              <TextInput label="Quận/huyện" name="district" fullWidth />
              <TextInput label="Tỉnh/thành" name="province" fullWidth />
              <Button type="submit" loading={loading}>Lưu địa chỉ</Button>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}
