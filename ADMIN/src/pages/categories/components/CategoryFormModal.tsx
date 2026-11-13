import {
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { FolderTree, Info, X } from 'lucide-react';

import { Button } from '../../../components/ui/buttons/Button';
import { Input } from '../../../components/ui/forms/Input';

import type {
  Category,
  CategoryFormValues,
} from '../../../types/category.types';

interface CategoryFormModalProps {
  open: boolean;
  category: Category | null;
  categories: Category[];
  onClose: () => void;
  onSave: (values: CategoryFormValues) => void | Promise<void>;
}

const emptyForm: CategoryFormValues = {
  name: '',
  slug: '',
  description: '',
  parentId: null,
  status: 'active',
};

function getInitialForm(category: Category | null): CategoryFormValues {
  if (!category) {
    return { ...emptyForm };
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    status: category.status,
  };
}

function createSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (character) =>
      character === 'Đ' ? 'D' : 'd',
    )
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CategoryFormModal({
  open,
  category,
  categories,
  onClose,
  onSave,
}: CategoryFormModalProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const descriptionId = `${generatedId}-description`;

  const [form, setForm] = useState<CategoryFormValues>(() =>
    getInitialForm(category),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);

  // Loại danh mục hiện tại và toàn bộ hậu duệ khỏi danh sách danh mục cha.
  const availableParents = useMemo(() => {
    const validCategories = categories.filter(
      (item) => typeof item.id === 'string' && item.id.trim() !== '',
    );

    if (!category) {
      return validCategories;
    }

    const excludedIds = new Set<string>([String(category.id)]);

    let changed = true;

    while (changed) {
      changed = false;

      for (const item of validCategories) {
        const parentId = item.parentId ? String(item.parentId) : null;
        const itemId = String(item.id);

        if (
          parentId &&
          excludedIds.has(parentId) &&
          !excludedIds.has(itemId)
        ) {
          excludedIds.add(itemId);
          changed = true;
        }
      }
    }

    return validCategories.filter(
      (item) => !excludedIds.has(String(item.id)),
    );
  }, [categories, category]);

  // Đồng bộ với DOM bên ngoài React: khóa cuộn nền và hỗ trợ Escape.
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, submitting]);

  const updateField = <K extends keyof CategoryFormValues>(
    field: K,
    value: CategoryFormValues[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: '',
    }));
  };

  const handleNameChange = (name: string) => {
    setForm((previous) => ({
      ...previous,
      name,
      // Chỉ tự tạo slug khi thêm mới.
      slug: category ? previous.slug : createSlug(name),
    }));

    setErrors((previous) => ({
      ...previous,
      name: '',
      ...(category ? {} : { slug: '' }),
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) return;

    const normalizedName = form.name.trim();
    const normalizedSlug = createSlug(form.slug);
    const normalizedNameLower = normalizedName.toLocaleLowerCase('vi');

    const nextErrors: Record<string, string> = {};

    if (!normalizedName) {
      nextErrors.name = 'Vui lòng nhập tên danh mục.';
    } else if (normalizedName.length > 150) {
      nextErrors.name = 'Tên danh mục không được vượt quá 150 ký tự.';
    }

    if (!normalizedSlug) {
      nextErrors.slug = 'Vui lòng nhập slug danh mục.';
    } else if (normalizedSlug.length > 180) {
      nextErrors.slug = 'Slug không được vượt quá 180 ký tự.';
    }

    const duplicateName = categories.some(
      (item) =>
        item.id !== category?.id &&
        item.name.trim().toLocaleLowerCase('vi') === normalizedNameLower,
    );

    if (normalizedName && duplicateName) {
      nextErrors.name = 'Tên danh mục này đã tồn tại.';
    }

    const duplicateSlug = categories.some(
      (item) =>
        item.id !== category?.id &&
        item.slug.toLowerCase() === normalizedSlug.toLowerCase(),
    );

    if (normalizedSlug && duplicateSlug) {
      nextErrors.slug = 'Slug này đã được sử dụng.';
    }

    const selectedParentId = String(form.parentId ?? '').trim();

    if (
      selectedParentId &&
      !availableParents.some(
        (category) =>
          String(category.id ?? '').trim() === selectedParentId,
      )
    ) {
      setErrors((prev) => ({
        ...prev,
        parentId: 'Danh mục cha không hợp lệ',
      }));
      return;
    }

    setSubmitting(true);

    try {
      await onSave({
        ...form,
        name: normalizedName,
        slug: normalizedSlug,
        description: form.description.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/70 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="flex min-h-full items-start justify-center sm:items-center">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-border-default bg-bg-surface shadow-2xl sm:max-h-[calc(100dvh-2.5rem)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-default px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent-primary/20 bg-accent-primary/10 text-accent-primary">
                <FolderTree size={20} aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-lg font-semibold text-text-primary"
                >
                  {category ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
                </h2>

                <p
                  id={descriptionId}
                  className="mt-1 text-xs text-text-muted"
                >
                  Quản lý thông tin danh mục sản phẩm.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="icon"
              aria-label="Đóng cửa sổ"
              disabled={submitting}
              onClick={onClose}
            >
              <X size={18} />
            </Button>
          </header>

          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Thông tin chung
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    Các trường có dấu * là bắt buộc.
                  </p>
                </div>

                <Input
                  label="Tên danh mục *"
                  placeholder="Ví dụ: Đồ dùng nhà bếp"
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  error={errors.name}
                  autoFocus
                  required
                  maxLength={150}
                />

                <Input
                  label="Slug *"
                  placeholder="do-dung-nha-bep"
                  value={form.slug}
                  onChange={(event) =>
                    updateField('slug', event.target.value)
                  }
                  error={errors.slug}
                  hint="Tự tạo từ tên danh mục khi thêm mới; có thể chỉnh sửa."
                  required
                  maxLength={180}
                />

                <div>
                  <label
                    htmlFor={`${generatedId}-parent`}
                    className="mb-2 block text-sm font-medium text-text-secondary"
                  >
                    Danh mục cha
                  </label>

                  <select
                    id={`${generatedId}-parent`}
                    value={form.parentId ?? ''}
                    onChange={(event) =>
                      updateField('parentId', event.target.value || null)
                    }
                    aria-invalid={Boolean(errors.parentId)}
                    aria-describedby={
                      errors.parentId
                        ? `${generatedId}-parent-error`
                        : undefined
                    }
                    className="h-input w-full rounded-btn border border-border-strong bg-bg-elevated px-4 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  >
                    <option value="">Không có — danh mục gốc</option>

                    {availableParents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  {errors.parentId && (
                    <p
                      id={`${generatedId}-parent-error`}
                      className="mt-1.5 text-xs text-status-danger"
                    >
                      {errors.parentId}
                    </p>
                  )}

                  <p className="mt-1.5 text-xs text-text-muted">
                    Chọn danh mục cha để tạo cấu trúc danh mục nhiều cấp.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`${generatedId}-description`}
                    className="mb-2 block text-sm font-medium text-text-secondary"
                  >
                    Mô tả
                  </label>

                  <textarea
                    id={`${generatedId}-description`}
                    rows={3}
                    maxLength={2000}
                    value={form.description}
                    onChange={(event) =>
                      updateField('description', event.target.value)
                    }
                    placeholder="Mô tả ngắn về danh mục sản phẩm..."
                    className="w-full resize-y rounded-btn border border-border-strong bg-bg-elevated px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  />

                  <p className="mt-1 text-right text-xs text-text-muted">
                    {form.description.length}/2000 ký tự
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Trạng thái hiển thị
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    Thiết lập trạng thái hoạt động của danh mục.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={`${generatedId}-status`}
                    className="mb-2 block text-sm font-medium text-text-secondary"
                  >
                    Trạng thái
                  </label>

                  <select
                    id={`${generatedId}-status`}
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        'status',
                        event.target.value as CategoryFormValues['status'],
                      )
                    }
                    className="h-input w-full rounded-btn border border-border-strong bg-bg-elevated px-4 text-sm text-text-primary outline-none transition focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </div>

                <div className="flex gap-2 rounded-lg border border-border-default bg-bg-elevated/60 p-3">
                  <Info
                    size={16}
                    className="mt-0.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />

                  <p className="text-xs leading-5 text-text-secondary">
                    {form.status === 'active'
                      ? 'Danh mục được đánh dấu đang hoạt động trong dữ liệu hiện tại.'
                      : 'Danh mục được đánh dấu ngừng hoạt động. Cần xử lý thêm ở backend nếu muốn tự động ẩn sản phẩm trên cửa hàng.'}
                  </p>
                </div>
              </section>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border-default bg-bg-surface px-5 py-4 sm:px-6">
              <p className="hidden text-xs text-text-muted sm:block">
                Kiểm tra thông tin trước khi lưu.
              </p>

              <div className="ml-auto flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                  onClick={onClose}
                >
                  Hủy
                </Button>

                <Button type="submit" loading={submitting} disabled={submitting}>
                  {category ? 'Lưu thay đổi' : 'Tạo danh mục'}
                </Button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </div>
  );
}