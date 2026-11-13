import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { authService } from "../../services/auth.service.ts";
import { ApiError, errorText } from "../../services/http.ts";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "");
    setBusy(true);
    try {
      await authService.forgotPassword(nextEmail);
      setEmail(nextEmail);
      setSent(true);
      showToast("Nếu email tồn tại, OTP đã được gửi.", "success");
    } catch (reason) {
      const retry = reason instanceof ApiError ? reason.retryAfter : undefined;
      showToast(retry ? `${errorText(reason)} (${retry}s)` : errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await authService.resetPassword({
        email,
        otp: String(data.get("otp") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
      });
      showToast("Đã đặt lại mật khẩu.", "success");
      setSent(false);
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageBanner title="Quên mật khẩu" />
      <div className="wrap" style={{ maxWidth: 480, margin: "64px auto", display: "grid", gap: 16 }}>
        {sent ? (
          <form onSubmit={reset} style={{ display: "grid", gap: 16 }}>
            <p>OTP gửi tới {email}. Hệ thống không tiết lộ email có tồn tại hay không.</p>
            <TextInput label="OTP" name="otp" required fullWidth />
            <TextInput label="Mật khẩu mới" name="newPassword" type="password" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Đặt lại mật khẩu</Button>
          </form>
        ) : (
          <form onSubmit={request} style={{ display: "grid", gap: 16 }}>
            <TextInput label="Email" name="email" type="email" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Gửi OTP</Button>
          </form>
        )}
        <Link to="/login">Về đăng nhập</Link>
      </div>
    </>
  );
}
