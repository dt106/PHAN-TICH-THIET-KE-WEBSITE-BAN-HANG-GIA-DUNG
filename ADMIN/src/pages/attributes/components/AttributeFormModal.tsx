
import { useState, type FormEvent } from 'react';

import { Button } from '../../../components/ui/buttons/Button';
import Modal from '../../../components/ui/overlays/Modal';

import type {
    AttributeFormData,
    ProductAttribute,
} from '../../../types/attribute.types';

interface AttributeFormModalProps {
    open: boolean;
    attribute?: ProductAttribute | null;
    loading?: boolean;
    onClose: () => void;
    onSubmit: (values: AttributeFormData) => void | Promise<void>;
}

function createSlug(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export default function AttributeFormModal({
    open,
    attribute,
    loading = false,
    onClose,
    onSubmit,
}: AttributeFormModalProps) {
    const [name, setName] = useState(attribute?.name ?? '');
    const [slug, setSlug] = useState(attribute?.slug ?? '');
    const [valuesText, setValuesText] = useState(
        attribute?.values?.map((item) => item.value).join('\n') ?? '',
    );
    const [slugTouched, setSlugTouched] = useState(Boolean(attribute));
    const [error, setError] = useState('');

    function handleNameChange(value: string) {
        setName(value);

        if (!slugTouched) {
            setSlug(createSlug(value));
        }
    }

    function handleSlugChange(value: string) {
        setSlugTouched(true);
        setSlug(createSlug(value));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const normalizedName = name.trim();
        const normalizedSlug = slug.trim();

        if (!normalizedName) {
            setError('Vui lòng nhập tên thuộc tính.');
            return;
        }

        if (!normalizedSlug) {
            setError('Vui lòng nhập slug thuộc tính.');
            return;
        }

        const values = Array.from(
            new Set(
                valuesText
                    .split(/[\n,]+/)
                    .map((value) => value.trim())
                    .filter(Boolean),
            ),
        );

        setError('');

        try {
            await onSubmit({
                name: normalizedName,
                slug: normalizedSlug,
                values,
            });
        } catch {
            setError('Không thể lưu thuộc tính. Vui lòng thử lại.');
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={attribute ? 'Cập nhật thuộc tính' : 'Thêm thuộc tính'}
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                    <label
                        htmlFor="attribute-name"
                        className="text-sm font-medium text-text-primary"
                    >
                        Tên thuộc tính <span className="text-status-danger">*</span>
                    </label>

                    <input
                        id="attribute-name"
                        value={name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        placeholder="Ví dụ: Màu sắc"
                        disabled={loading}
                        className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
                    />
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="attribute-slug"
                        className="text-sm font-medium text-text-primary"
                    >
                        Slug <span className="text-status-danger">*</span>
                    </label>

                    <input
                        id="attribute-slug"
                        value={slug}
                        onChange={(event) => handleSlugChange(event.target.value)}
                        placeholder="mau-sac"
                        disabled={loading}
                        className="h-11 w-full rounded-lg border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
                    />

                    <p className="text-xs text-text-muted">
                        Slug được tạo tự động từ tên thuộc tính. Bạn có thể chỉnh sửa.
                    </p>
                </div>

                <div className="space-y-2">
                    <label
                        htmlFor="attribute-values"
                        className="text-sm font-medium text-text-primary"
                    >
                        Giá trị thuộc tính
                    </label>

                    <textarea
                        id="attribute-values"
                        value={valuesText}
                        onChange={(event) => setValuesText(event.target.value)}
                        placeholder={'Đỏ\nXanh\nĐen\nTrắng'}
                        rows={5}
                        disabled={loading}
                        className="w-full resize-y rounded-lg border border-border-default bg-bg-elevated px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent-primary disabled:opacity-60"
                    />

                    <p className="text-xs text-text-muted">
                        Mỗi giá trị nhập trên một dòng hoặc phân cách bằng dấu phẩy.
                    </p>
                </div>

                {error && (
                    <p className="rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger">
                        {error}
                    </p>
                )}

                <div className="flex justify-end gap-3 border-t border-border-default pt-4">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Hủy
                    </Button>

                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 rounded-lg bg-accent-primary px-5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading
                            ? 'Đang lưu...'
                            : attribute
                                ? 'Lưu thay đổi'
                                : 'Tạo thuộc tính'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
