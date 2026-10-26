
import { Save } from 'lucide-react';
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
  'mt-2 h-11 w-full rounded-xl border border-[#303332] bg-[#111111] px-3.5 text-sm text-[#F5F5F5] outline-none transition duration-200 placeholder:text-[#858987] focus:border-[#65D928] focus:ring-2 focus:ring-[#65D928]/15 disabled:cursor-not-allowed disabled:opacity-50';

export default function ProfileInfoForm({
  profile,
  values,
  onChange,
  onSubmit,
  loading,
  disabled = false,
}: ProfileInfoFormProps) {
  const busy = loading || disabled;

  function update<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="space-y-7"
    >
      <ProfileAvatar
        avatar={profile.avatar}
        name={profile.name}
        disabled={busy}
        onChange={(file) => update('avatarFile', file)}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          Email hiện tại
          <input
            value={profile.email}
            readOnly
            className={`${inputClass} cursor-not-allowed text-[#858987]`}
          />
          <span className="mt-2 block text-xs font-normal text-[#858987]">
            Muốn thay đổi email, sử dụng mục Bảo mật email bên dưới.
          </span>
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-[#303332] pt-5">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onChange({
              name: profile.name,
              phone: profile.phone ?? '',
              avatarFile: null,
            })
          }
          className="h-10 rounded-xl border border-[#484B49] px-4 text-sm font-medium text-[#B5B7B6] transition duration-200 hover:bg-[#2B2D2C] hover:text-white disabled:opacity-50"
        >
          Hoàn tác
        </button>

        <button
          type="submit"
          disabled={busy || !values.name.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#65D928] px-5 text-sm font-semibold text-[#111111] transition duration-200 hover:bg-[#79E746] active:translate-y-px active:bg-[#4EB51D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65D928] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1B1A] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </form>
  );
}
