
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
} from 'lucide-react';

import { Input } from '../../components/ui/forms/Input';
import { Checkbox } from '../../components/ui/forms/Checkbox';
import { Button } from '../../components/ui/buttons/Button';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Đăng nhập thất bại. Vui lòng thử lại.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();

  const locationState = location.state as LocationState | null;

  const redirectTo = locationState?.from?.pathname
    ? `${locationState.from.pathname}${locationState.from.search ?? ''}${locationState.from.hash ?? ''}`
    : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Nếu phiên đã được xác minh, không hiển thị lại trang đăng nhập.
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      // AuthContext chịu trách nhiệm gọi API, lưu token và xác minh Admin.
      await login(
        {
          email: normalizedEmail,
          password,
        },
        remember,
      );

      // Chỉ chuyển trang sau khi xác minh tài khoản thành công.
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Logo hiển thị trên màn hình nhỏ */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-btn bg-accent-primary">
          <span className="text-xl font-bold text-black">A</span>
        </div>

        <div>
          <p className="font-semibold text-text-primary">Admin</p>
          <p className="text-xs text-text-muted">Commerce</p>
        </div>
      </div>

      {/* Tiêu đề */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary lg:text-3xl">
          Đăng nhập
        </h1>

        <p className="mt-2 text-sm text-text-secondary">
          Chào mừng trở lại! Vui lòng đăng nhập để tiếp tục.
        </p>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 rounded-btn border border-status-danger/30 bg-status-danger/10 p-3.5 text-sm text-status-danger"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="admin@shop.com"
          icon={<Mail size={18} />}
          disabled={loading}
        />

        {/* Mật khẩu */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-text-secondary"
            >
              Mật khẩu
            </label>

            <Link
              to="/forgot-password"
              className="text-xs font-medium text-accent-primary transition-colors hover:text-accent-hover"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Input
            id="admin-password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            icon={<Lock size={18} />}
            disabled={loading}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPwd((current) => !current)}
                className="transition-colors hover:text-text-primary"
                aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPwd}
                disabled={loading}
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        {/* Ghi nhớ đăng nhập */}
        <Checkbox
          label="Ghi nhớ đăng nhập"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          disabled={loading}
        />

        {/* Nút đăng nhập */}
        <Button
          type="submit"
          className="w-full"
          disabled={loading || isLoading}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang xác minh...
            </>
          ) : (
            <>
              Đăng nhập
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
