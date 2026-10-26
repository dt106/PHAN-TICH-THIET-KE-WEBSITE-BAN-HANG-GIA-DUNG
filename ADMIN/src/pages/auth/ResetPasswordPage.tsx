
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';

import { cn } from '../../utils/cn';
import { adminAuthService } from '../../services/auth/adminAuth.service';

interface ResetLocationState {
  email?: string;
  otp?: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state ?? {}) as ResetLocationState;
  const email = state.email ?? '';
  const otp = state.otp ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email || !/^\d{6}$/.test(otp)) {
      setError('Thiếu email hoặc mã OTP. Vui lòng thực hiện lại quy trình quên mật khẩu.');
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
        otp,
        newPassword: password,
        confirmPassword: confirm,
      });

      setDone(true);

      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
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
      <Link
        to="/forgot-password"
        className="inline-flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Quay lại quy trình quên mật khẩu
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
          Đặt lại mật khẩu
        </h1>

        <p className="text-text-secondary text-sm mt-2">
          {email
            ? `Tài khoản: ${email}`
            : 'Tạo mật khẩu mới cho tài khoản quản trị.'}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 p-3.5 rounded-btn bg-status-danger/10 border border-status-danger/30 text-status-danger text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Mật khẩu mới
          </label>

          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />

            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              className={cn(
                'w-full h-input pl-11 pr-11 rounded-btn',
                'bg-bg-elevated border border-border-strong',
                'text-text-primary text-sm placeholder:text-text-muted',
                'transition-all duration-app ease-app',
                'focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary',
              )}
            />

            <button
              type="button"
              onClick={() => setShowPwd((value) => !value)}
              aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-app',
                      i <= strength.score
                        ? strength.color
                        : 'bg-bg-elevated',
                    )}
                  />
                ))}
              </div>

              <p className={cn('text-xs mt-1.5', strength.textColor)}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Xác nhận mật khẩu
          </label>

          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />

            <input
              type={showPwd ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              className={cn(
                'w-full h-input pl-11 pr-4 rounded-btn',
                'bg-bg-elevated border border-border-strong',
                'text-text-primary text-sm placeholder:text-text-muted',
                'transition-all duration-app ease-app',
                'focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary',
              )}
            />
          </div>

          {confirm && password !== confirm && (
            <p className="text-status-danger text-xs mt-1.5">
              Mật khẩu không khớp.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full h-btn rounded-btn',
            'inline-flex items-center justify-center gap-2',
            'bg-accent-primary text-black font-semibold text-sm',
            'transition-all duration-app ease-app',
            'hover:bg-accent-hover active:bg-accent-pressed active:translate-y-px',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-app',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang cập nhật...
            </>
          ) : (
            'Đặt lại mật khẩu'
          )}
        </button>
      </form>
    </div>
  );
}

function getPasswordStrength(pwd: string) {
  let score = 0;

  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  const final = Math.min(score, 4);

  const map = {
    0: { label: '', color: '', textColor: '' },
    1: {
      label: 'Yếu',
      color: 'bg-status-danger',
      textColor: 'text-status-danger',
    },
    2: {
      label: 'Trung bình',
      color: 'bg-status-warning',
      textColor: 'text-status-warning',
    },
    3: {
      label: 'Tốt',
      color: 'bg-status-info',
      textColor: 'text-status-info',
    },
    4: {
      label: 'Mạnh',
      color: 'bg-status-success',
      textColor: 'text-status-success',
    },
  };

  return { score: final, ...map[final as keyof typeof map] };
}
