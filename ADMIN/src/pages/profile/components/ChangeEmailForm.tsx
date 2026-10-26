
import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, ShieldCheck } from 'lucide-react';

interface ChangeEmailFormProps {
  currentEmail: string;
  emailVerified: boolean;
  requesting: boolean;
  verifying: boolean;
  onRequestOtp: (email: string) => Promise<void>;
  onVerifyOtp: (email: string, otp: string) => Promise<void>;
}

const fieldClass =
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
      setSuccess('Đã gửi yêu cầu OTP. Hãy kiểm tra email của bạn.');
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
      setError('Vui lòng nhập email và mã OTP.');
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
      <div className="flex items-start gap-3 rounded-xl border border-[#303332] bg-[#111111] p-4">
        <Mail
          className="mt-0.5 shrink-0 text-[#1084A9]"
          size={20}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <p className="break-all text-sm font-medium text-[#F5F5F5]">
            {currentEmail || 'Chưa có email'}
          </p>

          <p className="mt-1 text-xs text-[#858987]">Email hiện tại</p>
        </div>

        {emailVerified && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#65D928]">
            <CheckCircle2 size={15} aria-hidden="true" />
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
              className={fieldClass}
              disabled={busy}
            />
          </label>

          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1084A9]/50 bg-[#1084A9]/10 px-4 text-sm font-medium text-[#63C9E8] transition hover:bg-[#1084A9]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1084A9] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail size={16} aria-hidden="true" />
            {requesting ? 'Đang gửi OTP...' : 'Gửi mã xác minh'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="rounded-xl border border-[#1084A9]/30 bg-[#1084A9]/10 p-3 text-sm text-[#B5B7B6]">
            Mã xác minh được yêu cầu cho{' '}
            <span className="break-all font-medium text-[#F5F5F5]">
              {email}
            </span>
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
              placeholder="Nhập mã OTP"
              className={fieldClass}
              disabled={busy}
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy || !otp.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#65D928] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#79E746] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65D928] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck size={16} aria-hidden="true" />
              {verifying ? 'Đang xác minh...' : 'Xác minh email'}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={handleChangeEmail}
              className="h-11 rounded-xl border border-[#484B49] px-4 text-sm text-[#B5B7B6] transition hover:bg-[#2B2D2C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#484B49] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đổi email khác
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-[#F04438]">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-[#65D928]">
          {success}
        </p>
      )}
    </div>
  );
}
