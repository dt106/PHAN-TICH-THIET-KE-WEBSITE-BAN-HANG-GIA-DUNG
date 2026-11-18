import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useAuth } from "../../contexts/useAuth.ts";
import { useAction } from "../../hooks/useAction.ts";
import { authService } from "../../services/auth.service.ts";
import styles from "./AuthPage.module.css";

type RegisterStep = "email" | "otp" | "profile";

const stepLabel = { email: "Email", otp: "OTP", profile: "Thông tin" };

export function AuthPage() {
  const { login, acceptSession, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<RegisterStep>("email");
  const [email, setEmail] = useState("");
  const [busy, run] = useAction();

  function goNext() {
    navigate(next.startsWith("/") ? next : "/account");
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      await login(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
      showToast("Đã đăng nhập.", "success");
      goNext();
    });
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextEmail = String(data.get("email") ?? "");
    await run(async () => {
      await authService.requestRegisterOtp(nextEmail);
      setEmail(nextEmail);
      setStep("otp");
      showToast("Đã gửi OTP.", "success");
    });
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      await authService.verifyRegisterOtp(email, String(data.get("otp") ?? ""));
      setStep("profile");
    });
  }

  async function finishRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
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
    });
  }

  if (user) {
    return (
      <>
        <PageBanner title="Đăng nhập" />
        <div className="wrap section stack">
          <p>Bạn đã đăng nhập với {user.email}.</p>
          <Link to="/account">Vào tài khoản</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBanner title={mode === "login" ? "Đăng nhập" : "Đăng ký"} />
      <div className={`card wrap narrow section stack ${styles.box}`}>
        <div className={styles.tabs} role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => {
              setMode("register");
              setStep("email");
            }}
          >
            Đăng ký
          </button>
        </div>
        {mode === "register" ? (
          <ol className={styles.steps}>
            {(Object.keys(stepLabel) as RegisterStep[]).map((key) => (
              <li key={key} data-active={key === step}>{stepLabel[key]}</li>
            ))}
          </ol>
        ) : null}
        {mode === "login" ? (
          <form onSubmit={submitLogin} className="stack">
            <TextInput label="Email" name="email" type="email" required fullWidth />
            <TextInput label="Mật khẩu" name="password" type="password" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Đăng nhập</Button>
            <Link to="/forgot-password">Quên mật khẩu</Link>
          </form>
        ) : null}
        {mode === "register" && step === "email" ? (
          <form onSubmit={requestOtp} className="stack">
            <TextInput label="Email" name="email" type="email" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Gửi OTP</Button>
          </form>
        ) : null}
        {mode === "register" && step === "otp" ? (
          <form onSubmit={verifyOtp} className="stack">
            <p>Nhập OTP đã gửi tới {email}</p>
            <TextInput label="OTP" name="otp" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Xác nhận OTP</Button>
          </form>
        ) : null}
        {mode === "register" && step === "profile" ? (
          <form onSubmit={finishRegister} className="stack">
            <TextInput label="Họ tên" name="name" required fullWidth />
            <TextInput label="Số điện thoại" name="phone" fullWidth />
            <TextInput label="Mật khẩu" name="password" type="password" required fullWidth />
            <Button type="submit" variant="primary" disabled={busy}>Tạo tài khoản</Button>
          </form>
        ) : null}
      </div>
    </>
  );
}
