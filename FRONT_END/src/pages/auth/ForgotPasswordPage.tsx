import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextInput, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { PASSWORD_HINT } from "../../constants/commerce.ts";
import { authApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import panels from "../../styles/panels.module.css";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.forgotPassword(email);
      showToast(result.message || "Nếu email tồn tại, OTP đã được gửi.", "success");
      setStep("reset");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await authApi.resetPassword({
        email,
        otp,
        newPassword: password,
        confirmPassword,
      });
      showToast(result.message || "Đã đặt lại mật khẩu.", "success");
      navigate("/login");
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageBanner title="Quên mật khẩu" />
      <form className={`wrap ${panels.form}`} onSubmit={(event) => void (step === "email" ? requestOtp(event) : reset(event))}>
        {error ? <p className={panels.alert}>{error}</p> : null}
        <p className={panels.muted}>OTP được gửi qua email và chỉ lưu tạm trên máy chủ.</p>
        <TextInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth disabled={step === "reset"} />
        {step === "reset" ? (
          <>
            <TextInput label="Mã OTP" value={otp} onChange={(event) => setOtp(event.target.value)} required fullWidth inputMode="numeric" />
            <TextInput label="Mật khẩu mới" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required fullWidth hint={PASSWORD_HINT} />
            <TextInput label="Xác nhận mật khẩu mới" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required fullWidth />
          </>
        ) : null}
        <Button type="submit" loading={loading}>
          {step === "email" ? "Gửi OTP" : "Đặt lại mật khẩu"}
        </Button>
        <Link to="/login">Quay lại đăng nhập</Link>
      </form>
    </>
  );
}
