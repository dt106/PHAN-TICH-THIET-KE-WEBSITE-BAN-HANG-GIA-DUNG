import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminProfile,
  updateAdminProfile,
  type AdminProfile,
} from '../../services/profile/adminProfile.service';
import { adminAuthService } from '../../services/auth/adminAuth.service';

import ProfileInfoForm from '../../pages/profile/components/ProfileInfoForm';
import ChangeEmailForm from '../../pages/profile/components/ChangeEmailForm';

type ProfileFormValues = {
  name: string;
  phone: string;
  avatarFile: File | null;
};

type PasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type Notice = {
  type: 'success' | 'error';
  title: string;
  message: string;
};

type DialogType = 'profile' | 'email' | 'password' | null;

const EMPTY_PASSWORD_VALUES: PasswordFormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

function toProfileFormValues(profile: AdminProfile): ProfileFormValues {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    avatarFile: null,
  };
}

/**
 * Ưu tiên message backend trả về trước message mặc định của Axios.
 */
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    const message = response?.data?.message ?? response?.data?.error;

    if (message) return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function getStatusLabel(status: AdminProfile['status']): string {
  switch (status) {
    case 'active':
      return 'Đang hoạt động';
    case 'inactive':
      return 'Ngừng hoạt động';
    case 'blocked':
      return 'Đã khóa';
    default:
      return 'Không xác định';
  }
}

function getStatusClass(status: AdminProfile['status']): string {
  switch (status) {
    case 'active':
      return 'border-accent-primary/25 bg-accent-primary/10 text-accent-primary';
    case 'blocked':
      return 'border-status-danger/25 bg-status-danger/10 text-status-danger';
    default:
      return 'border-border-default bg-bg-hover text-text-secondary';
  }
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();

  const [profile, setProfile] = useState<AdminProfile | null>(null);

  const [profileValues, setProfileValues] = useState<ProfileFormValues>({
    name: '',
    phone: '',
    avatarFile: null,
  });

  const [passwordValues, setPasswordValues] =
    useState<PasswordFormValues>(EMPTY_PASSWORD_VALUES);

  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogType>(null);

  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notice, setNotice] = useState<Notice | null>(null);

  const loadProfile = useCallback(async () => {
    const user = await getAdminProfile();

    setProfile(user);
    setProfileValues(toProfileFormValues(user));

    return user;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const user = await getAdminProfile();

        if (cancelled) return;

        setProfile(user);
        setProfileValues(toProfileFormValues(user));
      } catch (error) {
        if (cancelled) return;

        setNotice({
          type: 'error',
          title: 'Không thể tải hồ sơ',
          message: getErrorMessage(error),
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const isBusy =
    savingProfile || requestingOtp || verifyingOtp || changingPassword;

  const closeActionDialog = () => {
    if (isBusy) return;
    setDialog(null);
  };

  const handleOpenProfileDialog = () => {
    if (!profile) return;

    setProfileValues(toProfileFormValues(profile));
    setNotice(null);
    setDialog('profile');
  };

  const handleOpenEmailDialog = () => {
    setNotice(null);
    setDialog('email');
  };

  const handleOpenPasswordDialog = () => {
    setPasswordValues(EMPTY_PASSWORD_VALUES);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setNotice(null);
    setDialog('password');
  };

  const handleUpdateProfile = async () => {
    if (savingProfile) return;

    setSavingProfile(true);
    setNotice(null);

    try {
      const updatedProfile = await updateAdminProfile({
        name: profileValues.name.trim(),
        phone: profileValues.phone.trim(),
        avatarFile: profileValues.avatarFile,
      });

      setProfile(updatedProfile);
      setProfileValues(toProfileFormValues(updatedProfile));
      setDialog(null);

      let message = 'Thông tin tài khoản của bạn đã được cập nhật.';

      try {
        await refreshUser();
      } catch {
        message += ' Hồ sơ đã lưu, nhưng phiên đăng nhập chưa đồng bộ lại.';
      }

      setNotice({
        type: 'success',
        title: 'Cập nhật thành công',
        message,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: getErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailOtp = async (newEmail: string) => {
    setRequestingOtp(true);
    setNotice(null);

    try {
      await adminAuthService.requestChangeEmailOtp({
        newEmail: newEmail.trim().toLowerCase(),
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Không thể gửi mã xác minh',
        message: getErrorMessage(error),
      });

      throw error;
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (newEmail: string, otp: string) => {
    setVerifyingOtp(true);
    setNotice(null);

    try {
      await adminAuthService.verifyChangeEmailOtp({
        newEmail: newEmail.trim().toLowerCase(),
        otp: otp.trim(),
      });

      const updatedProfile = await getAdminProfile();

      setProfile(updatedProfile);
      setProfileValues(toProfileFormValues(updatedProfile));
      setDialog(null);

      let message = 'Email tài khoản đã được thay đổi thành công.';

      try {
        await refreshUser();
      } catch {
        message += ' Hồ sơ đã cập nhật, nhưng phiên đăng nhập chưa đồng bộ lại.';
      }

      setNotice({
        type: 'success',
        title: 'Đổi email thành công',
        message,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Không thể đổi email',
        message: getErrorMessage(error),
      });

      throw error;
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangePassword = async () => {
    if (changingPassword) return;

    const currentPassword = passwordValues.currentPassword;
    const newPassword = passwordValues.newPassword;
    const confirmPassword = passwordValues.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setNotice({
        type: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ các trường mật khẩu.',
      });
      return;
    }

    if (newPassword.length < 8) {
      setNotice({
        type: 'error',
        title: 'Mật khẩu chưa đủ mạnh',
        message: 'Mật khẩu mới phải có ít nhất 8 ký tự.',
      });
      return;
    }

    if (newPassword === currentPassword) {
      setNotice({
        type: 'error',
        title: 'Mật khẩu không hợp lệ',
        message: 'Mật khẩu mới phải khác mật khẩu hiện tại.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice({
        type: 'error',
        title: 'Mật khẩu xác nhận không khớp',
        message: 'Vui lòng nhập lại mật khẩu xác nhận chính xác.',
      });
      return;
    }

    setChangingPassword(true);
    setNotice(null);

    try {
      // Backend nhận đúng hai field này.
      await adminAuthService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,

      });

      setPasswordValues(EMPTY_PASSWORD_VALUES);
      setDialog(null);

      setNotice({
        type: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu tài khoản quản trị đã được cập nhật.',
      });
    } catch (error) {
      console.error('Change password error:', error);

      setNotice({
        type: 'error',
        title: 'Đổi mật khẩu thất bại',
        message: getErrorMessage(error),
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRetryLoadProfile = async () => {
    setLoading(true);
    setNotice(null);

    try {
      await loadProfile();
    } catch (error) {
      setNotice({
        type: 'error',
        title: 'Không thể tải hồ sơ',
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-bg-hover" />
        <div className="h-48 animate-pulse rounded-2xl border border-border-default bg-bg-surface" />
        <div className="h-56 animate-pulse rounded-2xl border border-border-default bg-bg-surface" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="rounded-2xl border border-border-default bg-bg-surface p-6 text-center sm:p-8">
          <UserRound className="mx-auto mb-3 text-text-muted" size={32} />

          <h2 className="text-lg font-semibold text-text-primary">
            Chưa tải được thông tin tài khoản
          </h2>

          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng kiểm tra kết nối và thử tải lại hồ sơ.
          </p>

          <button
            type="button"
            onClick={handleRetryLoadProfile}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-accent-primary px-4 text-sm font-semibold text-black transition hover:bg-accent-hover active:scale-[0.98]"
          >
            Thử tải lại
          </button>
        </div>

        {notice && (
          <p className="mt-3 text-center text-sm text-status-danger">
            {notice.message}
          </p>
        )}
      </div>
    );
  }

  const avatarUrl =
    profile.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile.name || 'Admin',
    )}&background=292B2A&color=65D928&bold=true`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-primary">
          Account settings
        </p>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
          Hồ sơ cá nhân
        </h1>

        <p className="mt-2 text-sm text-text-secondary">
          Quản lý thông tin và bảo mật tài khoản quản trị của bạn.
        </p>
      </header>

      {/* Account overview */}
      <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
        <div className="h-1 bg-gradient-to-r from-accent-primary via-accent-primary/50 to-transparent" />

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt="Ảnh đại diện"
                className="h-20 w-20 rounded-2xl border border-border-default object-cover"
              />

              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg border-2 border-bg-surface bg-accent-primary text-black">
                <ShieldCheck size={15} />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-text-primary">
                  {profile.name || 'Admin'}
                </h2>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                    profile.status,
                  )}`}
                >
                  {getStatusLabel(profile.status)}
                </span>
              </div>

              <p className="mt-1 truncate text-sm text-text-secondary">
                {profile.email}
              </p>

              <p className="mt-2 text-xs text-text-muted">
                Tài khoản quản trị
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenProfileDialog}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-semibold text-black transition hover:bg-accent-hover active:scale-[0.98]"
          >
            <Edit3 size={16} />
            Cập nhật tài khoản
          </button>
        </div>
      </section>

      {/* Account details */}
      <section className="rounded-2xl border border-border-default bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-default px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-text-primary">
              Thông tin tài khoản
            </h2>

            <p className="mt-1 text-xs text-text-muted">
              Thông tin hồ sơ hiện tại
            </p>
          </div>

          <UserRound size={18} className="text-text-muted" />
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          <InfoItem
            icon={<UserRound size={17} />}
            label="Họ và tên"
            value={profile.name || 'Chưa cập nhật'}
          />

          <InfoItem
            icon={<Mail size={17} />}
            label="Email đăng nhập"
            value={profile.email}
            extra={
              profile.emailVerifiedAt ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-primary">
                  <BadgeCheck size={14} />
                  Đã xác minh
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                  <Clock3 size={14} />
                  Chưa xác minh
                </span>
              )
            }
          />

          <InfoItem
            icon={<Camera size={17} />}
            label="Số điện thoại"
            value={profile.phone || 'Chưa cập nhật'}
          />

          <InfoItem
            icon={<ShieldCheck size={17} />}
            label="Vai trò"
            value="Quản trị viên"
          />
        </div>
      </section>

      {/* Security settings */}
      <section className="space-y-4 rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-text-primary">
            Bảo mật tài khoản
          </h2>

          <p className="mt-1 text-sm text-text-secondary">
            Quản lý email đăng nhập và mật khẩu tài khoản quản trị.
          </p>
        </div>

        <div className="divide-y divide-border-default">
          <SecurityAction
            icon={<Mail size={18} />}
            title="Email đăng nhập"
            description="Cập nhật email và xác minh địa chỉ email mới."
            buttonLabel="Đổi email"
            onClick={handleOpenEmailDialog}
          />

          <SecurityAction
            icon={<LockKeyhole size={18} />}
            title="Mật khẩu"
            description="Thay đổi mật khẩu để bảo vệ tài khoản quản trị."
            buttonLabel="Đổi mật khẩu"
            onClick={handleOpenPasswordDialog}
          />
        </div>
      </section>

      {/* Edit profile dialog */}
      {dialog === 'profile' && (
        <DialogShell
          title="Cập nhật tài khoản"
          description="Chỉnh sửa thông tin hồ sơ quản trị của bạn."
          onClose={closeActionDialog}
          busy={savingProfile}
        >
          <ProfileInfoForm
            profile={profile}
            values={profileValues}
            onChange={setProfileValues}
            onSubmit={handleUpdateProfile}
            loading={savingProfile}
          />
        </DialogShell>
      )}

      {/* Change email dialog */}
      {dialog === 'email' && (
        <DialogShell
          title="Đổi email"
          description="Xác minh email mới bằng mã OTP để hoàn tất thay đổi."
          onClose={closeActionDialog}
          busy={requestingOtp || verifyingOtp}
        >
          <ChangeEmailForm
            currentEmail={profile.email}
            emailVerified={Boolean(profile.emailVerifiedAt)}
            requesting={requestingOtp}
            verifying={verifyingOtp}
            onRequestOtp={handleRequestEmailOtp}
            onVerifyOtp={handleVerifyEmailOtp}
          />
        </DialogShell>
      )}

      {/* Change password dialog */}
      {dialog === 'password' && (
        <DialogShell
          title="Đổi mật khẩu"
          description="Nhập mật khẩu hiện tại và thiết lập mật khẩu mới."
          onClose={closeActionDialog}
          busy={changingPassword}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleChangePassword();
            }}
            className="space-y-4"
          >
            <PasswordField
              label="Mật khẩu hiện tại"
              value={passwordValues.currentPassword}
              onChange={(value) =>
                setPasswordValues((current) => ({
                  ...current,
                  currentPassword: value,
                }))
              }
              visible={showCurrentPassword}
              onToggleVisibility={() =>
                setShowCurrentPassword((current) => !current)
              }
              autoComplete="current-password"
              placeholder="Nhập mật khẩu hiện tại"
            />

            <PasswordField
              label="Mật khẩu mới"
              value={passwordValues.newPassword}
              onChange={(value) =>
                setPasswordValues((current) => ({
                  ...current,
                  newPassword: value,
                }))
              }
              visible={showNewPassword}
              onToggleVisibility={() =>
                setShowNewPassword((current) => !current)
              }
              autoComplete="new-password"
              placeholder="Nhập mật khẩu mới"
            />

            <PasswordField
              label="Xác nhận mật khẩu mới"
              value={passwordValues.confirmPassword}
              onChange={(value) =>
                setPasswordValues((current) => ({
                  ...current,
                  confirmPassword: value,
                }))
              }
              visible={showConfirmPassword}
              onToggleVisibility={() =>
                setShowConfirmPassword((current) => !current)
              }
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
            />

            {/* Hướng dẫn mật khẩu: chữ trơn, không viền, không nền riêng */}
            <p className="text-sm leading-5 text-text-muted">
              Mật khẩu nên có ít nhất 8 ký tự và không trùng mật khẩu hiện tại.
            </p>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeActionDialog}
                disabled={changingPassword}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border-default px-4 text-sm font-medium text-text-secondary transition hover:bg-bg-hover disabled:opacity-50"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-semibold text-black transition hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <KeyRound size={16} />
                {changingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </DialogShell>
      )}

      {/* Result dialog */}
      {notice && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setNotice(null);
            }
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="profile-notice-title"
            aria-describedby="profile-notice-description"
            className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-surface p-6 shadow-2xl"
          >
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${notice.type === 'success'
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'bg-status-danger/10 text-status-danger'
                }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 size={28} />
              ) : (
                <X size={26} />
              )}
            </div>

            <h2
              id="profile-notice-title"
              className="mt-4 text-center text-lg font-semibold text-text-primary"
            >
              {notice.title}
            </h2>

            <p
              id="profile-notice-description"
              className="mt-2 text-center text-sm leading-6 text-text-secondary"
            >
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() => setNotice(null)}
              className="mt-6 h-10 w-full rounded-lg bg-accent-primary px-4 text-sm font-semibold text-black transition hover:bg-accent-hover"
            >
              Đã hiểu
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function SecurityAction({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-elevated text-text-secondary">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary">{title}</p>
          <p className="mt-1 text-sm leading-5 text-text-secondary">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border-default px-4 text-sm font-medium text-text-primary transition hover:border-accent-primary/50 hover:bg-bg-hover"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggleVisibility,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggleVisibility: () => void;
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
        {label}
      </label>

      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border border-border-default bg-bg-app px-3 pr-11 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/10"
        />

        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition hover:bg-bg-hover hover:text-text-primary"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  label,
  value,
  extra,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3 border-b border-border-default p-5 last:border-b-0 sm:p-6 [&:nth-child(odd)]:sm:border-r [&:nth-last-child(-n+2)]:sm:border-b-0">
      <div className="mt-0.5 text-text-muted">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-muted">{label}</p>

        <p className="mt-1 break-words text-sm font-medium text-text-primary">
          {value}
        </p>

        {extra && <div className="mt-2">{extra}</div>}
      </div>
    </div>
  );
}

function DialogShell({
  title,
  description,
  onClose,
  busy,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl rounded-2xl border border-border-default bg-bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {title}
            </h2>

            <p className="mt-1 text-sm text-text-secondary">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng dialog"
            className="rounded-lg p-2 text-text-muted transition hover:bg-bg-hover hover:text-text-primary disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  );
}