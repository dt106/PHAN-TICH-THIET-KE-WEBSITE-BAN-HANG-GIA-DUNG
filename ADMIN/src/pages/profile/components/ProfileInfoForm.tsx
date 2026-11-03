import { useEffect, useState } from 'react';
import { RotateCcw, Save, UserRound } from 'lucide-react';

import type { AdminProfile } from '../../../services/profile/adminProfile.service';
import ProfileAvatar from './ProfileAvatar';

export interface ProfileFormValues {
  name: string;
  phone: string;
  avatarFile: File | null;
}

interface ProfileInfoFormProps {
  profile: AdminProfile;
  values: ProfileFormValues;
  onChange: (values: ProfileFormValues) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean;
}

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-[#303332] bg-[#111111] px-3.5 text-sm text-[#F5F5F5] outline-none transition placeholder:text-[#858987] focus:border-[#65D928] focus:ring-2 focus:ring-[#65D928]/15 disabled:cursor-not-allowed disabled:opacity-50';

export default function ProfileInfoForm({
  profile,
  values,
  onChange,
  onSubmit,
  loading,
  disabled = false,
}: ProfileInfoFormProps) {
  const busy = loading || disabled;

  const [initialValues, setInitialValues] = useState<ProfileFormValues>({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    avatarFile: null,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialValues({
      name: profile.name ?? '',
      phone: profile.phone ?? '',
      avatarFile: null,
    });
  }, [profile.id, profile.name, profile.phone]);

  function update<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function handleReset() {
    onChange({
      ...initialValues,
      avatarFile: null,
    });
  }

  const hasChanges =
    values.name.trim() !== initialValues.name.trim() ||
    values.phone.trim() !== initialValues.phone.trim() ||
    values.avatarFile !== null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-6"
    >
      {/* Avatar */}
      <div className="flex flex-col gap-4 rounded-xl bg-[#111111] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#65D928]/10 text-[#79E746]">
            <UserRound size={17} aria-hidden="true" />
          </div>

          <div>
            <p className="text-sm font-medium text-[#F5F5F5]">
              Ảnh đại diện
            </p>
            <p className="mt-1 text-xs text-[#858987]">
              JPG, PNG, WEBP hoặc GIF · tối đa 5MB
            </p>
          </div>
        </div>

        <ProfileAvatar
          avatar={profile.avatar}
          name={profile.name}
          disabled={busy}
          onChange={(file) => update('avatarFile', file)}
        />
      </div>

      {/* Profile fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-[#B5B7B6]">
          Họ và tên <span className="text-[#65D928]">*</span>
          <input
            required
            maxLength={100}
            autoComplete="name"
            value={values.name}
            disabled={busy}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Nhập họ và tên"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-[#B5B7B6]">
          Số điện thoại
          <input
            type="tel"
            maxLength={20}
            autoComplete="tel"
            value={values.phone}
            disabled={busy}
            onChange={(event) => update('phone', event.target.value)}
            placeholder="Nhập số điện thoại"
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium text-[#B5B7B6] sm:col-span-2">
          Email tài khoản
          <input
            value={profile.email}
            readOnly
            className={`${inputClass} cursor-not-allowed text-[#858987]`}
          />
          <span className="mt-1.5 block text-xs font-normal text-[#858987]">
            Email được quản lý riêng trong phần thay đổi email.
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#303332] pt-4">
        <p className="text-xs text-[#858987]">
          {hasChanges ? 'Bạn có thay đổi chưa lưu.' : 'Thông tin đã được đồng bộ.'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy || !hasChanges}
            onClick={handleReset}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#484B49] px-3.5 text-sm font-medium text-[#B5B7B6] transition hover:bg-[#2B2D2C] hover:text-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={15} />
            Hoàn tác
          </button>

          <button
            type="submit"
            disabled={busy || !values.name.trim() || !hasChanges}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#65D928] px-4 text-sm font-semibold text-[#111111] transition hover:bg-[#79E746] active:bg-[#4EB51D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65D928] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} />
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </form>
  );
}