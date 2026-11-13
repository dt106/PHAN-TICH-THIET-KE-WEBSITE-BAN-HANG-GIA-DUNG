import { useState, type FormEvent } from 'react';

import { Button } from '../../../components/ui/buttons/Button';
import Modal from '../../../components/ui/overlays/Modal';
import type {
    Brand,
    BrandCreatePayload,
} from '../../../types/brand.types';

interface BrandFormModalProps {
    open: boolean;
    brand: Brand | null;
    loading: boolean;
    onClose: () => void;
    onSubmit: (payload: BrandCreatePayload) => Promise<void>;
}

interface BrandFormValues {
    name: string;
    slug: string;
    description: string;
    logo: string;
    isActive: boolean;
}

function createSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function getInitialValues(brand: Brand | null): BrandFormValues {
    return {
        name: brand?.name ?? '',
        slug: brand?.slug ?? '',
        description: brand?.description ?? '',
        logo: brand?.logo ?? '',
        isActive: brand?.isActive ?? true,
    };
}

export default function BrandFormModal({
    open,
    brand,
    loading,
    onClose,
    onSubmit,
}: BrandFormModalProps) {
    const [form, setForm] = useState<BrandFormValues>(() =>
        getInitialValues(brand),
    );
    const [slugEdited, setSlugEdited] = useState(Boolean(brand?.slug));
    const [error, setError] = useState('');

    const isEditing = Boolean(brand);

    function handleNameChange(value: string) {
        setForm((current) => ({
            ...current,
            name: value,
            slug: slugEdited ? current.slug : createSlug(value),
        }));
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');

        const name = form.name.trim();
        const slug = form.slug.trim();

        if (!name) {
            setError('Vui lòng nhập tên thương hiệu.');
            return;
        }

        if (!slug) {
            setError('Vui lòng nhập slug thương hiệu.');
            return;
        }

        void onSubmit({
            name,
            slug,
            description: form.description.trim() || null,
            logo: form.logo.trim() || null,
            isActive: form.isActive,
        }).catch((submitError: unknown) => {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : 'Không thể lưu thương hiệu. Vui lòng thử lại.',
            );
        });
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={isEditing ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu'}
            maxWidth="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label
                        htmlFor="brand-name"
                        className="mb-2 block text-sm font-medium text-text-primary"
                    >
                        Tên thương hiệu <span className="text-danger">*</span>
                    </label>

                    <input
                        id="brand-name"
                        value={form.name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        placeholder="Nhập tên thương hiệu"
                        maxLength={100}
                        className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary"
                    />
                </div>

                <div>
                    <label
                        htmlFor="brand-slug"
                        className="mb-2 block text-sm font-medium text-text-primary"
                    >
                        Slug <span className="text-danger">*</span>
                    </label>

                    <input
                        id="brand-slug"
                        value={form.slug}
                        onChange={(event) => {
                            setSlugEdited(true);
                            setForm((current) => ({
                                ...current,
                                slug: createSlug(event.target.value),
                            }));
                        }}
                        placeholder="ten-thuong-hieu"
                        maxLength={120}
                        className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary"
                    />

                    <p className="mt-1.5 text-xs text-text-muted">
                        Slug được tự động tạo từ tên thương hiệu. M có thể chỉnh sửa nếu cần.
                    </p>
                </div>

                <div>
                    <label
                        htmlFor="brand-logo"
                        className="mb-2 block text-sm font-medium text-text-primary"
                    >
                        Logo URL
                    </label>

                    <input
                        id="brand-logo"
                        type="url"
                        value={form.logo}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                logo: event.target.value,
                            }))
                        }
                        placeholder="https://example.com/logo.png"
                        className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary"
                    />

                    {form.logo && (
                        <div className="mt-3 flex items-center gap-3">
                            <img
                                src={form.logo}
                                alt="Xem trước logo"
                                className="h-14 w-14 rounded-lg border border-border-default bg-bg-elevated object-contain p-1"
                            />
                            <span className="text-xs text-text-muted">
                                Xem trước logo thương hiệu
                            </span>
                        </div>
                    )}
                </div>

                <div>
                    <label
                        htmlFor="brand-description"
                        className="mb-2 block text-sm font-medium text-text-primary"
                    >
                        Mô tả
                    </label>

                    <textarea
                        id="brand-description"
                        value={form.description}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                description: event.target.value,
                            }))
                        }
                        placeholder="Nhập mô tả thương hiệu..."
                        rows={4}
                        maxLength={1000}
                        className="w-full resize-y rounded-lg border border-border-default bg-bg-elevated px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary"
                    />
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-default bg-bg-elevated p-3">
                    <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                isActive: event.target.checked,
                            }))
                        }
                        className="h-4 w-4 accent-primary"
                    />

                    <span>
                        <span className="block text-sm font-medium text-text-primary">
                            Hoạt động
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                            Cho phép thương hiệu được sử dụng trong hệ thống.
                        </span>
                    </span>
                </label>

                {error && (
                    <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-2 border-t border-border-default pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Hủy
                    </Button>

                    <Button type="submit" variant="primary" loading={loading}>
                        {isEditing ? 'Lưu thay đổi' : 'Tạo thương hiệu'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}