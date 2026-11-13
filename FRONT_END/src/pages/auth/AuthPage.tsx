import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { authService } from "../../services/auth.service.ts";
import { ApiError, errorText } from "../../services/http.ts";

type RegisterStep = "email" | "otp" | "profile";

export function AuthPage() {
  const { login, acceptSession, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<RegisterStep>("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function goNext() {
    navigate(next.startsWith("/") ? next : "/account");
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await login(
        String(data.get("email") ?? ""),
        String(data.get("password") ?? ""),
      );
      showToast("Đã đăng nhập.", "success");
      goNext();
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "");
    setBusy(true);
    try {
      await authService.requestRegisterOtp(nextEmail);
      setEmail(nextEmail);
      setStep("otp");
      showToast("Đã gửi OTP.", "success");
    } catch (reason) {
      const retry = reason instanceof ApiError ? reason.retryAfter : undefined;
      showToast(
        retry ? `${errorText(reason)} (${retry}s)` : errorText(reason),
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await authService.verifyRegisterOtp(email, String(data.get("otp") ?? ""));
      setStep("profile");
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  async function finishRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const result = await authService.registerCustomer({
        email,
        name: String(data.get("name") ?? ""),
        phone: String(data.get("phone") ?? "") || undefined,
        password: String(data.get("password") ?? ""),
        confirmPassword: String(data.get("password") ?? ""),
      });
      acceptSession(result.data.user, result.data.token);
      showToast("Đã tạo tài khoản.", "success");
      goNext();
    } catch (reason) {
      showToast(errorText(reason), "error");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <>
        <PageBanner title="Login" />
        <div className="wrap" style={{ padding: "64px 0" }}>
          <p>Bạn đã đăng nhập với {user.email}.</p>
          <Link to="/account">Vào tài khoản</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBanner title={mode === "login" ? "Login" : "Register"} />
      <div
        className="wrap"
        style={{ maxWidth: 480, margin: "64px auto", display: "grid", gap: 16 }}
      >
        {mode === "login" ? (
          <form onSubmit={submitLogin} style={{ display: "grid", gap: 16 }}>
            <TextInput
              label="Email"
              name="email"
              type="email"
              required
              fullWidth
            />
            <TextInput
              label="Mật khẩu"
              name="password"
              type="password"
              required
              fullWidth
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Đăng nhập
            </Button>
            <Link to="/forgot-password">Quên mật khẩu</Link>
          </form>
        ) : null}
        {mode === "register" && step === "email" ? (
          <form onSubmit={requestOtp} style={{ display: "grid", gap: 16 }}>
            <TextInput
              label="Email"
              name="email"
              type="email"
              required
              fullWidth
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Gửi OTP
            </Button>
          </form>
        ) : null}
        {mode === "register" && step === "otp" ? (
          <form onSubmit={verifyOtp} style={{ display: "grid", gap: 16 }}>
            <p>Nhập OTP đã gửi tới {email}</p>
            <TextInput label="OTP" name="otp" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>
              Xác nhận OTP
            </Button>
          </form>
        ) : null}
        {mode === "register" && step === "profile" ? (
          <form onSubmit={finishRegister} style={{ display: "grid", gap: 16 }}>
            <TextInput label="Họ tên" name="name" required fullWidth />
            <TextInput label="Số điện thoại" name="phone" fullWidth />
            <TextInput
              label="Mật khẩu"
              name="password"
              type="password"
              required
              fullWidth
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Tạo tài khoản
            </Button>
          </form>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setStep("email");
          }}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          {mode === "login" ? "Tạo tài khoản" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </div>
    </>
  );
}
