
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

import { Input } from '../../components/ui/forms/Input';
import { Button } from '../../components/ui/buttons/Button';
import { Stepper } from '../../components/ui/navigation/Stepper';
import { OtpInput } from '../../components/ui/forms/OtpInput';
import { PasswordStrength } from '../../components/ui/forms/PasswordStrength';
import { adminAuthService } from '../../services/auth/adminAuth.service';

type Step = 'email' | 'otp' | 'reset' | 'done';

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleBack = () => {
    setError('');
    setSuccessMessage('');

    if (step === 'otp') setStep('email');
    else if (step === 'reset') setStep('otp');
    else navigate('/login');
  };

  // Bước 1: Gửi yêu cầu gửi OTP tới email.
  const handleSendEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Vui lòng nhập email.');
      return;
    }

    setLoading(true);

    try {
      await adminAuthService.forgotPassword({
        email: normalizedEmail,
      });

      setEmail(normalizedEmail);
      setStep('otp');
      setSuccessMessage('Đã gửi yêu cầu. Hãy kiểm tra email để lấy mã OTP.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Kiểm tra định dạng OTP ở client.
  // Backend xác minh OTP khi gửi yêu cầu reset mật khẩu.
  const handleVerifyOtp = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const otpValue = otp.join('');

    if (!/^\d{6}$/.test(otpValue)) {
      setError('Vui lòng nhập đầy đủ mã OTP gồm 6 chữ số.');
      return;
    }

    setStep('reset');
  };

  // Bước 3: Gửi email + OTP + mật khẩu mới lên backend.
  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const otpValue = otp.join('');

    if (!/^\d{6}$/.test(otpValue)) {
      setError('Mã OTP phải gồm 6 chữ số.');
      setStep('otp');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      await adminAuthService.resetPassword({
        email,
        otp: otpValue,
        newPassword: password,
        confirmPassword: confirm,
      });

      setStep('done');

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-status-success/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-status-success" />
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Đặt lại thành công!
        </h1>

        <p className="text-text-secondary text-sm mb-6">
          Mật khẩu đã được cập nhật. Đang chuyển về trang đăng nhập...
        </p>

        <Loader2
          size={20}
          className="animate-spin text-accent-primary mx-auto"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleBack}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors disabled:opacity-50"
      >
        <ArrowLeft size={16} />
        {step === 'email' ? 'Quay lại đăng nhập' : 'Quay lại bước trước'}
      </button>

      {step !== 'email' && <Stepper current={step} />}

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-btn bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-5 p-3.5 rounded-btn bg-status-success/10 border border-status-success/30 text-status-success text-sm"
        >
          {successMessage}
        </div>
      )}

      {step === 'email' && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Quên mật khẩu?
            </h1>
            <p className="text-text-secondary text-sm mt-2">
              Nhập email quản trị đã đăng ký để nhận mã OTP 6 số.
            </p>
          </div>

          <form onSubmit={handleSendEmail} className="space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="admin@shop.com"
              icon={<Mail size={18} />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi mã OTP'
              )}
            </Button>
          </form>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Nhập mã OTP
            </h1>
            <p className="text-text-secondary text-sm mt-2">
              Nhập mã 6 số đã gửi tới{' '}
              <span className="text-text-primary font-medium">{email}</span>.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-3 text-center">
                Mã xác thực
              </label>

              <OtpInput value={otp} onChange={setOtp} autoFocus />
            </div>

            <Button type="submit" className="w-full">
              Tiếp tục
            </Button>

            <button
              type="button"
              disabled={loading}
onClick={() => {
  setError('');
  setSuccessMessage('');
  setStep('email');
}}              className="w-full text-sm text-accent-primary hover:text-accent-hover disabled:opacity-50"
            >
              Gửi lại mã OTP
            </button>
          </form>
        </>
      )}

      {step === 'reset' && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
              Đặt mật khẩu mới
            </h1>
            <p className="text-text-secondary text-sm mt-2">
              Tài khoản: <span className="text-text-primary">{email}</span>
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <Input
                label="Mật khẩu mới"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                icon={<Lock size={18} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPwd((value) => !value)}
                    aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <PasswordStrength password={password} />
            </div>

            <Input
              label="Xác nhận mật khẩu"
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              icon={<ShieldCheck size={18} />}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPwd((value) => !value)}
                  aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {confirm && password !== confirm && (
              <p className="text-status-danger text-xs">
                Mật khẩu xác nhận không khớp.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Đặt lại mật khẩu'
              )}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
