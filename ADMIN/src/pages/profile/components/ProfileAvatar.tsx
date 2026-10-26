
import { useEffect, useState } from 'react';
import { Camera, ImagePlus, UserRound, X } from 'lucide-react';

interface ProfileAvatarProps {
  avatar: string | null;
  name: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function ProfileAvatar({
  avatar,
  name,
  onChange,
  disabled = false,
}: ProfileAvatarProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const selected = event.target.files?.[0];

    event.target.value = '';

    if (!selected) return;

    if (!selected.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh hợp lệ.');
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError('Ảnh không được vượt quá 5 MB.');
      return;
    }

    setError('');
    setFile(selected);
    onChange(selected);
  }

  function removePreview() {
    setFile(null);
    setError('');
    onChange(null);
  }

  const image = preview ?? avatar;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0">
        {image ? (
          <img
            src={image}
            alt={`Ảnh đại diện ${name}`}
            className="h-24 w-24 rounded-2xl border border-[#303332] object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#303332] bg-[#2B2D2C] text-[#858987]">
            <UserRound size={34} />
          </div>
        )}

        <span className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[#303332] bg-[#2B2D2C] text-[#65D928]">
          <Camera size={17} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-[#F5F5F5]">
          Ảnh đại diện
        </p>
        <p className="mt-1 text-sm text-[#858987]">
          PNG, JPG hoặc WEBP. Tối đa 5 MB.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <label
            className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-[#2B2D2C] px-3 text-sm font-medium text-[#F5F5F5] transition-colors duration-200 hover:bg-[#303332] ${
              disabled ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            <ImagePlus size={16} />
            Chọn ảnh
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={handleFileChange}
            />
          </label>

          {file && (
            <button
              type="button"
              disabled={disabled}
              onClick={removePreview}
              className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-[#B5B7B6] transition hover:bg-[#303332] hover:text-white disabled:opacity-50"
            >
              <X size={16} />
              Bỏ ảnh mới
            </button>
          )}
        </div>

        {file && (
          <p className="mt-2 break-all text-xs text-[#65D928]">
            Ảnh mới: {file.name}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-[#F04438]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
