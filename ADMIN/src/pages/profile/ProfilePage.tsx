
import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import {
  getAdminProfile,
  requestAdminEmailOtp,
  updateAdminProfile,
  verifyAdminEmailOtp,
  type AdminProfile,
} from '../../services/profile/adminProfile.service';

import ProfileInfoForm, {
  type ProfileFormValues,
} from './components/ProfileInfoForm';
import ChangeEmailForm from './components/ChangeEmailForm';

type Notice = {
  type: 'success' | 'error';
  message: string;
} | null;

const initialFormValues: ProfileFormValues = {
  name: '',
  phone: '',
  avatarFile: null,
};

function toProfileFormValues(
  profile: AdminProfile,
): ProfileFormValues {
  return {
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    avatarFile: null,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
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

    return (
      response?.data?.message ??
      response?.data?.error ??
      'Thao tác thất bại. Vui lòng thử lại.'
    );
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

function getStatusLabel(status: AdminProfile['status']): string {
  const labels: Record<AdminProfile['status'], string> = {
    active: 'Đang hoạt động',
    inactive: 'Không hoạt động',
    blocked: 'Đã khóa',
  };

  return labels[status] ?? 'Không xác định';
}

function getStatusClass(status: AdminProfile['status']): string {
  const styles: Record<AdminProfile['status'], string> = {
    active: 'border-[#65D928]/25 bg-[#65D928]/10 text-[#79E746]',
    inactive: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
    blocked: 'border-red-500/25 bg-red-500/10 text-red-400',
  };

  return (
    styles[status] ??
    'border-[#303332] bg-[#2B2D2C] text-[#B5B7B6]'
  );
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [profileForm, setProfileForm] =
    useState<ProfileFormValues>(initialFormValues);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    try {
      const result = await getAdminProfile();

      if (!result || typeof result !== 'object') {
        throw new Error('Dữ liệu hồ sơ trả về không hợp lệ.');
      }

      setProfile(result);
      setProfileForm(toProfileFormValues(result));
      setNotice(null);
    } catch (error) {
      setProfile(null);
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (
    values: ProfileFormValues,
  ): Promise<void> => {
    setSavingProfile(true);
    setNotice(null);

    try {
      const updatedProfile = await updateAdminProfile({
        name: values.name.trim(),
        phone: values.phone.trim(),
        avatarFile: values.avatarFile,
      });

      setProfile(updatedProfile);
      setProfileForm(toProfileFormValues(updatedProfile));

      await refreshUser();

      setNotice({
        type: 'success',
        message: 'Cập nhật hồ sơ thành công.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailOtp = async (
    newEmail: string,
  ): Promise<void> => {
    setRequestingOtp(true);
    setNotice(null);

    try {
      await requestAdminEmailOtp(newEmail.trim().toLowerCase());

      setNotice({
        type: 'success',
        message: 'Đã gửi mã OTP đến email mới. Hãy kiểm tra hộp thư.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      });

      throw error;
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async (
    newEmail: string,
    otp: string,
  ): Promise<void> => {
    setVerifyingOtp(true);
    setNotice(null);

    try {
      const updatedProfile = await verifyAdminEmailOtp({
        newEmail: newEmail.trim().toLowerCase(),
        otp: otp.trim(),
      });

      setProfile(updatedProfile);
      setProfileForm(toProfileFormValues(updatedProfile));

      await refreshUser();

      setNotice({
        type: 'success',
        message: 'Xác minh OTP và cập nhật email thành công.',
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: getErrorMessage(error),
      });

      throw error;
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#111111] p-5 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-[#2B2D2C]" />
          <div className="h-44 animate-pulse rounded-2xl border border-[#303332] bg-[#1A1B1A]" />
          <div className="h-64 animate-pulse rounded-2xl border border-[#303332] bg-[#1A1B1A]" />
          <div className="h-64 animate-pulse rounded-2xl border border-[#303332] bg-[#1A1B1A]" />

          <div className="flex items-center gap-2 text-sm text-[#858987]">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Đang tải hồ sơ quản trị...
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-full bg-[#111111] p-5 sm:p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#303332] bg-[#1A1B1A] p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />

          <h1 className="mt-4 text-xl font-semibold text-[#F5F5F5]">
            Không tải được hồ sơ
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#B5B7B6]">
            {notice?.message ??
              'Không thể lấy thông tin tài khoản Admin từ máy chủ.'}
          </p>

          <button
            type="button"
            onClick={() => void loadProfile()}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[#65D928] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#79E746] focus:outline-none focus:ring-2 focus:ring-[#65D928]/40"
          >
            <RefreshCw className="h-4 w-4" />
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const displayName =
    typeof profile.name === 'string' && profile.name.trim()
      ? profile.name.trim()
      : 'Admin';

  const displayEmail =
    typeof profile.email === 'string' ? profile.email : '';

  const avatarUrl =
    typeof profile.avatar === 'string' && profile.avatar.trim()
      ? profile.avatar
      : null;

  return (
    <div className="min-h-full bg-[#111111] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Tiêu đề trang */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#65D928]">
              Quản trị hệ thống
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#F5F5F5] sm:text-3xl">
              Hồ sơ cá nhân
            </h1>

            <p className="mt-2 text-sm leading-6 text-[#858987]">
              Quản lý thông tin cá nhân và địa chỉ email của tài khoản Admin.
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${getStatusClass(profile.status)}`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {getStatusLabel(profile.status)}
          </span>
        </header>

        {/* Thông báo */}
        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
              notice.type === 'success'
                ? 'border-[#65D928]/25 bg-[#65D928]/10 text-[#B8F59A]'
                : 'border-red-500/25 bg-red-500/10 text-red-300'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}

            <p className="flex-1 leading-6">{notice.message}</p>

            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => setNotice(null)}
              className="rounded-md p-1 opacity-70 transition hover:bg-white/5 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tổng quan tài khoản */}
        <section className="overflow-hidden rounded-2xl border border-[#303332] bg-[#1A1B1A]">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#484B49] bg-[#2B2D2C]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`Ảnh đại diện ${displayName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-9 w-9 text-[#858987]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="break-words text-xl font-semibold text-[#F5F5F5]">
                  {displayName}
                </h2>

                <span className="inline-flex items-center gap-1.5 rounded-md border border-[#1084A9]/25 bg-[#1084A9]/10 px-2.5 py-1 text-xs font-medium text-sky-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Administrator
                </span>
              </div>

              <p className="mt-2 break-all text-sm text-[#B5B7B6]">
                {displayEmail || 'Chưa cập nhật email'}
              </p>

              <p className="mt-1 text-xs text-[#858987]">
                Thông tin tài khoản quản trị đang đăng nhập.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 border-t border-[#303332] sm:grid-cols-2">
            <div className="px-5 py-4 sm:px-7">
              <p className="text-xs font-medium uppercase tracking-wider text-[#858987]">
                Số điện thoại
              </p>

              <p className="mt-2 text-sm font-medium text-[#F5F5F5]">
                {profile.phone || 'Chưa cập nhật'}
              </p>
            </div>

            <div className="border-t border-[#303332] px-5 py-4 sm:border-l sm:border-t-0 sm:px-7">
              <p className="text-xs font-medium uppercase tracking-wider text-[#858987]">
                Trạng thái email
              </p>

              <p className="mt-2 text-sm font-medium text-[#F5F5F5]">
                {profile.emailVerifiedAt
                  ? `Đã xác minh · ${new Date(
                      profile.emailVerifiedAt,
                    ).toLocaleDateString('vi-VN')}`
                  : 'Chưa có thông tin xác minh'}
              </p>
            </div>
          </div>
        </section>

        {/* Chỉnh sửa hồ sơ */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5F5]">
              Thông tin cá nhân
            </h2>

            <p className="mt-1 text-sm text-[#858987]">
              Cập nhật tên hiển thị, số điện thoại và ảnh đại diện.
            </p>
          </div>

          <ProfileInfoForm
            profile={profile}
            values={profileForm}
            onChange={setProfileForm}
            onSubmit={() => {
              void handleUpdateProfile(profileForm);
            }}
            loading={savingProfile}
          />
        </section>

        {/* Đổi email */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5F5]">
              Thay đổi email
            </h2>

            <p className="mt-1 text-sm text-[#858987]">
              Xác minh địa chỉ email mới bằng mã OTP trước khi cập nhật.
            </p>
          </div>

          <ChangeEmailForm
            currentEmail={displayEmail}
            emailVerified={Boolean(profile.emailVerifiedAt)}
            requesting={requestingOtp}
            verifying={verifyingOtp}
            onRequestOtp={handleRequestEmailOtp}
            onVerifyOtp={handleVerifyEmailOtp}
          />
        </section>

        <footer className="border-t border-[#303332] pt-4">
          <p className="text-center text-xs leading-5 text-[#858987]">
            Thông tin hồ sơ được tải từ tài khoản Admin đang đăng nhập.
          </p>
        </footer>
      </div>
    </div>
  );
}
