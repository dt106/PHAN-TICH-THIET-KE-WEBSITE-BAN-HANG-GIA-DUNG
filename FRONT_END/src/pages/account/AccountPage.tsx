import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, StatusBadge, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { AddressForm } from "../../components/order/AddressForm.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { useAction } from "../../hooks/useAction.ts";
import { useRequest } from "../../hooks/useRequest.ts";
import { formatAddress, formatMoney } from "../../lib/format.ts";
import { orderStatusTone, paymentMethodLabel, paymentStatusLabel } from "../../lib/orderLabel.ts";
import { addressService } from "../../services/address.service.ts";
import { authService } from "../../services/auth.service.ts";
import { paymentService } from "../../services/payment.service.ts";
import { statisticsService } from "../../services/statistics.service.ts";
import type { AddressInput } from "../../types/api.ts";
import styles from "./AccountPage.module.css";

const sections = [
  { id: "profile", label: "Hồ sơ" },
  { id: "address", label: "Địa chỉ" },
  { id: "password", label: "Đổi mật khẩu" },
  { id: "payments", label: "Thanh toán" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function AccountPage() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<SectionId>("profile");
  const [preview, setPreview] = useState("");
  const [busy, run] = useAction();
  const { data: addresses = [], reload: reloadAddresses } = useRequest(
    () => addressService.getAddresses().then((result) => result.data).catch(() => []),
    [],
  );
  const { data: overview = null } = useRequest(
    () => statisticsService.getCustomerOverview().then((result) => result.data).catch(() => null),
    [],
  );
  const { data: payments = [] } = useRequest(
    () => paymentService.getMyPayments().then((result) => result.data).catch(() => []),
    [],
  );

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const avatar = form.get("avatar");
    if (avatar instanceof File && avatar.size === 0) form.delete("avatar");
    if (!String(form.get("phone") ?? "").trim()) form.delete("phone");
    const ok = await run(async () => {
      const result = await authService.updateProfile(form);
      setUser(result.data.user);
      showToast("Đã cập nhật hồ sơ.", "success");
    });
    if (ok) {
      if (preview) URL.revokeObjectURL(preview);
      setPreview("");
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const ok = await run(async () => {
      await authService.changePassword({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
      });
      showToast("Đã đổi mật khẩu.", "success");
    });
    if (ok) form.reset();
  }

  async function addAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body: AddressInput = {
      recipientName: String(data.get("recipientName") ?? ""),
      phone: String(data.get("phone") ?? ""),
      addressLine: String(data.get("addressLine") ?? ""),
      ward: String(data.get("ward") ?? ""),
      district: String(data.get("district") ?? ""),
      province: String(data.get("province") ?? ""),
    };
    const ok = await run(async () => {
      await addressService.createAddress(body);
      showToast("Đã thêm địa chỉ.", "success");
      reloadAddresses();
    });
    if (ok) form.reset();
  }

  if (!user) return null;
  const avatar = preview || user.avatar;

  return (
    <>
      <PageBanner title="Tài khoản" />
      <div className={`wrap ${styles.layout}`}>
        <nav className={`card ${styles.menu}`} aria-label="Mục tài khoản">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={section === item.id ? styles.active : undefined}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
          <Link to="/orders">Đơn hàng</Link>
          <button type="button" onClick={() => void logout().then(() => window.location.assign("/"))}>
            Đăng xuất
          </button>
        </nav>

        <div className="stack">
          {section === "profile" ? (
            <form onSubmit={saveProfile} className={`card ${styles.block}`}>
              <div className={styles.profileHead}>
                {avatar ? (
                  <img src={avatar} alt={user.name} className={styles.avatar} />
                ) : (
                  <div aria-label={user.name} className={styles.avatarFallback}>
                    {user.name.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  {overview ? (
                    <p className="muted">
                      {overview.totalOrders} đơn · đã chi {formatMoney(overview.totalSpent)} · {overview.totalWishlistItems} yêu thích · {overview.totalReviews} đánh giá
                    </p>
                  ) : null}
                </div>
              </div>
              <TextInput label="Tên" name="name" defaultValue={user.name} fullWidth />
              <TextInput label="Số điện thoại" name="phone" defaultValue={user.phone ?? ""} fullWidth />
              <label>
                Ảnh đại diện
                <input
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (preview) URL.revokeObjectURL(preview);
                    setPreview(file ? URL.createObjectURL(file) : "");
                  }}
                />
              </label>
              <Button type="submit" variant="primary" loading={busy}>Lưu hồ sơ</Button>
            </form>
          ) : null}

          {section === "password" ? (
            <form onSubmit={changePassword} className={`card ${styles.block}`}>
              <h2>Đổi mật khẩu</h2>
              <TextInput label="Mật khẩu hiện tại" name="currentPassword" type="password" required fullWidth />
              <TextInput label="Mật khẩu mới" name="newPassword" type="password" required fullWidth />
              <Button type="submit" variant="outline" loading={busy}>Đổi mật khẩu</Button>
            </form>
          ) : null}

          {section === "address" ? (
            <section className={`card ${styles.block}`}>
              <h2>Địa chỉ</h2>
              {addresses.map((item) => (
                <article key={item.id} className={styles.address}>
                  <strong>
                    {item.recipientName} · {item.phone}
                  </strong>
                  {item.isDefault ? <StatusBadge tone="success">Mặc định</StatusBadge> : null}
                  <p>{formatAddress([item.addressLine, item.ward, item.district, item.province])}</p>
                  <div>
                    {item.isDefault ? null : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void run(async () => {
                            await addressService.setDefaultAddress(item.id);
                            reloadAddresses();
                          })
                        }
                      >
                        Đặt mặc định
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        void run(async () => {
                          await addressService.removeAddress(item.id);
                          reloadAddresses();
                        })
                      }
                    >
                      Xóa
                    </Button>
                  </div>
                </article>
              ))}
              <form onSubmit={addAddress} className="stack">
                <AddressForm />
                <Button type="submit" variant="outline" loading={busy}>Thêm địa chỉ</Button>
              </form>
            </section>
          ) : null}

          {section === "payments" ? (
            <section className={`card ${styles.block}`}>
              <h2>Thanh toán của tôi</h2>
              {payments.length === 0 ? (
                <p>Chưa có giao dịch.</p>
              ) : (
                <ul className={styles.paymentList}>
                  {payments.map((item) => (
                    <li key={item.id} className={styles.paymentCard}>
                      <div>
                        <strong>{item.order?.orderNumber ?? item.id}</strong>
                        <p>
                          {paymentMethodLabel(item.paymentMethod)} ·{" "}
                          <StatusBadge tone={orderStatusTone(item.status)}>{paymentStatusLabel(item.status)}</StatusBadge>
                        </p>
                        <span className={styles.amount}>{formatMoney(item.amount)}</span>
                      </div>
                      {item.status === "pending" && item.paymentMethod === "MOMO" ? (
                        <Button
                          type="button"
                          variant="primary"
                          loading={busy}
                          onClick={() =>
                            void run(async () => {
                              const next = await paymentService.startPayment(item.orderId, item.order?.orderNumber ?? "");
                              if (next) navigate(next.path);
                            })
                          }
                        >
                          Thanh toán MoMo
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
