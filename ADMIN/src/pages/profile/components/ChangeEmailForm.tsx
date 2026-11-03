import { useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

interface ChangeEmailFormProps {
  currentEmail: string;
  emailVerified: boolean;
  requesting: boolean;
  verifying: boolean;
  onRequestOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-[#303332] bg-[#111111] px-3.5 text-sm text-[#F5F5F5] outline-none transition placeholder:text-[#858987] focus:border-[#65D928] focus:ring-2 focus:ring-[#65D928]/15 disabled:cursor-not-allowed disabled:opacity-50';

export default function ChangeEmailForm({
  currentEmail,
  emailVerified,
  requesting,
  verifying,
  onRequestOtp,
  onVerifyOtp,
}: ChangeEmailFormProps) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const busy = requesting || verifying;

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCurrentEmail = currentEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Vui lòng nhập email mới.');
      return;
    }

    if (normalizedEmail === normalizedCurrentEmail) {
      setError('Email mới phải khác email hiện tại.');
      return;
    }

    try {
      await onRequestOtp(normalizedEmail);

      setEmail(normalizedEmail);
      setOtp('');
      setOtpRequested(true);
      setSuccess('Mã xác minh đã được gửi. Hãy kiểm tra hộp thư.');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể gửi mã OTP.',
      );
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.trim();

    if (!normalizedEmail || !normalizedOtp) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }

    try {
      await onVerifyOtp(normalizedEmail, normalizedOtp);

      setOtpRequested(false);
      setOtp('');
      setEmail('');
      setSuccess('Email đã được cập nhật thành công.');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Xác minh OTP thất bại.',
      );
    }
  }

  function handleChangeEmail() {
    setOtpRequested(false);
    setOtp('');
    setError('');
    setSuccess('');
  }

  return (
    <div className="space-y-5">
      {/* Email hiện tại */}
      <div className="flex items-center gap-3 rounded-xl bg-[#111111] px-4 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1084A9]/10 text-[#63C9E8]">
          <Mail size={17} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#858987]">Email hiện tại</p>
          <p className="mt-1 break-all text-sm font-medium text-[#F5F5F5]">
            {currentEmail || 'Chưa có email'}
          </p>
        </div>

        {emailVerified && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#65D928]/10 px-2.5 py-1 text-xs font-medium text-[#79E746]">
            <CheckCircle2 size={14} aria-hidden="true" />
            Đã xác minh
          </span>
        )}
      </div>

      {!otpRequested ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <label className="block text-sm font-medium text-[#B5B7B6]">
            Email mới
            <input
              type="email"
              name="newEmail"
              required
              maxLength={254}
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError('');
                setSuccess('');
              }}
              placeholder="admin@example.com"
              className={inputClass}
              disabled={busy}
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#858987]">
              Mã OTP sẽ được gửi đến email mới để xác minh quyền sở hữu.
            </p>

            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#1084A9]/10 px-4 text-sm font-medium text-[#63C9E8] transition hover:bg-[#1084A9]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1084A9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requesting ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Mail size={16} />
              )}
              {requesting ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="rounded-xl border border-[#1084A9]/20 bg-[#1084A9]/[0.06] p-3.5">
            <p className="text-xs text-[#858987]">Mã xác minh được gửi đến</p>
            <p className="mt-1 break-all text-sm font-medium text-[#F5F5F5]">
              {email}
            </p>
          </div>

          <label className="block text-sm font-medium text-[#B5B7B6]">
            Mã OTP
            <input
              type="text"
              name="otp"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={12}
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value.replace(/\s/g, ''));
                setError('');
                setSuccess('');
              }}
              placeholder="Nhập mã xác minh"
              className={`${inputClass} tracking-[0.18em]`}
              disabled={busy}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !otp.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#65D928] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#79E746] active:bg-[#4EB51D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65D928] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {verifying ? 'Đang xác minh...' : 'Xác minh email'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleChangeEmail}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-[#B5B7B6] transition hover:bg-[#2B2D2C] hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={15} />
              Đổi email khác
            </button>
          </div>
        </form>
      )}

      {(error || success) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg px-3.5 py-3 text-sm ${error
              ? 'bg-[#F04438]/10 text-[#F87171]'
              : 'bg-[#65D928]/10 text-[#79E746]'
            }`}
        >
          {error ? (
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F04438]" />
          ) : (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          )}
          <p className="leading-5">{error || success}</p>
        </div>
      )}
    </div>
  );
}