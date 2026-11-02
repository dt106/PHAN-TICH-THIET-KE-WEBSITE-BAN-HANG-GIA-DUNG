import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { PASSWORD_HINT } from "../../constants/commerce.ts";
import { useAuth } from "../../contexts/useAuth.ts";
import { authApi } from "../../services/api.ts";
import { ApiError, errorMessage } from "../../services/http.ts";
import panels from "../../styles/panels.module.css";

type Step = "email" | "otp" | "profile";

export function AuthPage() {
  const { setSession, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = next.startsWith("/") ? next : "/account";
  if (user) return <Navigate to={destination} replace />;

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.login(email, password);
      setSession(result.data.user, result.data.token);
      showToast("Đăng nhập thành công.", "success");
      navigate(destination);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.requestRegisterOtp(email);
      showToast(result.message || "Đã gửi OTP.", "success");
      setStep("otp");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.verifyRegisterOtp(email, otp);
      showToast(result.message || "Email đã được xác thực.", "success");
      setStep("profile");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function finishRegister(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        email,
        name,
        phone: phone.trim() || undefined,
        password,
        confirmPassword,
      });
      setSession(result.data.user, result.data.token);
      showToast("Đăng ký thành công.", "success");
      navigate(destination);
    } catch (reason) {
      const apiError = reason instanceof ApiError ? reason.errors.map((item) => item.message).join(" ") : "";
      setError(apiError || errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageBanner title={mode === "login" ? "Đăng nhập" : "Đăng ký"} />
      {mode === "login" ? (
        <form className={`wrap ${panels.form}`} onSubmit={(event) => void submitLogin(event)}>
          {error ? <p className={panels.alert}>{error}</p> : null}
          <TextInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth />
          <TextInput label="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth />
          <Button type="submit" loading={loading}>
            Đăng nhập
          </Button>
          <Link to="/forgot-password">Quên mật khẩu</Link>
          <button
            type="button"
            className={panels.switch}
            onClick={() => {
              setMode("register");
              setStep("email");
              setError(null);
            }}
          >
            Tạo tài khoản mới
          </button>
        </form>
      ) : (
        <form
          className={`wrap ${panels.form}`}
          onSubmit={(event) =>
            void (step === "email" ? requestOtp(event) : step === "otp" ? verifyOtp(event) : finishRegister(event))
          }
        >
          {error ? <p className={panels.alert}>{error}</p> : null}
          <TextInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth disabled={step !== "email"} />
          {step === "otp" || step === "profile" ? (
            <TextInput label="Mã OTP" value={otp} onChange={(event) => setOtp(event.target.value)} required fullWidth inputMode="numeric" disabled={step === "profile"} hint="6 chữ số được gửi qua email." />
          ) : null}
          {step === "profile" ? (
            <>
              <TextInput label="Họ tên" value={name} onChange={(event) => setName(event.target.value)} required fullWidth />
              <TextInput label="Số điện thoại" value={phone} onChange={(event) => setPhone(event.target.value)} fullWidth hint="Không bắt buộc. Dạng 0xxxxxxxxx hoặc +84xxxxxxxxx." />
              <TextInput label="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth hint={PASSWORD_HINT} />
              <TextInput label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required fullWidth />
            </>
          ) : null}
          <Button type="submit" loading={loading}>
            {step === "email" ? "Gửi OTP" : step === "otp" ? "Xác thực OTP" : "Hoàn tất đăng ký"}
          </Button>
          {step !== "email" ? (
            <button type="button" className={panels.switch} onClick={() => setStep(step === "profile" ? "otp" : "email")}>
              Quay lại
            </button>
          ) : null}
          <button
            type="button"
            className={panels.switch}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
          >
            Đã có tài khoản? Đăng nhập
          </button>
        </form>
      )}
    </>
  );
}
