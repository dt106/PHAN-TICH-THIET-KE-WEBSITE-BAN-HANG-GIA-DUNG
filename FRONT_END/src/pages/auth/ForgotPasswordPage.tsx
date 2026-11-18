import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useAction } from "../../hooks/useAction.ts";
import { authService } from "../../services/auth.service.ts";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, run] = useAction();

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "");
    await run(async () => {
      await authService.forgotPassword(nextEmail);
      setEmail(nextEmail);
      setSent(true);
      showToast("Nếu email tồn tại, OTP đã được gửi.", "success");
    });
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      await authService.resetPassword({
        email,
        otp: String(data.get("otp") ?? ""),
        newPassword: String(data.get("newPassword") ?? ""),
      });
      showToast("Đã đặt lại mật khẩu.", "success");
      setSent(false);
    });
  }

  return (
    <>
      <PageBanner title="Quên mật khẩu" />
      <div className="card wrap narrow section stack pad">
        {sent ? (
          <form onSubmit={reset} className="stack">
            <p>OTP gửi tới {email}. Hệ thống không tiết lộ email có tồn tại hay không.</p>
            <TextInput label="OTP" name="otp" required fullWidth />
            <TextInput label="Mật khẩu mới" name="newPassword" type="password" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Đặt lại mật khẩu</Button>
          </form>
        ) : (
          <form onSubmit={request} className="stack">
            <TextInput label="Email" name="email" type="email" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Gửi OTP</Button>
          </form>
        )}
        <Link to="/login">Về đăng nhập</Link>
      </div>
    </>
  );
}
