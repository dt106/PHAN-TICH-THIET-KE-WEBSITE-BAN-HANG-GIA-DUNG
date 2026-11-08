
import { useState, type FormEvent } from 'react';

import { Button } from '../../../components/ui/buttons/Button';
import Modal from '../../../components/ui/overlays/Modal';

import type {
    AttributeOption,
    AttributeValue,
    AttributeValueFormData,
} from '../../../types/attribute-value.types';

interface AttributeValueFormModalProps {
    open: boolean;
    loading: boolean;
    attributes: AttributeOption[];
    editing: AttributeValue | null;
    onClose: () => void;
    onSubmit: (payload: AttributeValueFormData) => Promise<void>;
}

const inputClass =
    'w-full rounded-lg border border-border-default bg-bg-app px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-accent-primary';

const slugify = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export default function AttributeValueFormModal({
    open,
    loading,
    attributes,
    editing,
    onClose,
    onSubmit,
}: AttributeValueFormModalProps) {
    const [attributeId, setAttributeId] = useState(
        editing?.attributeId ?? attributes[0]?.id ?? '',
    );
    const [value, setValue] = useState(editing?.value ?? '');
    const [error, setError] = useState('');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const cleanValue = value.trim();

        if (!attributeId) {
            setError('Vui lòng chọn thuộc tính.');
            return;
        }

        if (!cleanValue) {
            setError('Vui lòng nhập giá trị thuộc tính.');
            return;
        }

        if (cleanValue.length > 100) {
            setError('Giá trị không được vượt quá 100 ký tự.');
            return;
        }

        try {
            setError('');

            await onSubmit({
                attributeId,
                value: cleanValue,
            });
        } catch (submitError) {
            setError(
                submitError instanceof Error
                    ? submitError.message
                    : 'Không thể lưu giá trị thuộc tính.',
            );
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={editing ? 'Cập nhật giá trị' : 'Thêm giá trị thuộc tính'}
            maxWidth="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium">
                        Thuộc tính <span className="text-status-danger">*</span>
                    </label>

                    <select
                        value={attributeId}
                        onChange={(event) => setAttributeId(event.target.value)}
                        className={inputClass}
                        required
                        disabled={loading || attributes.length === 0 || Boolean(editing)}
                    >
                        <option value="">Chọn thuộc tính</option>

                        {attributes.map((attribute) => (
                            <option key={attribute.id} value={attribute.id}>
                                {attribute.name}
                            </option>
                        ))}
                    </select>

                    {attributes.length === 0 && (
                        <p className="mt-1.5 text-xs text-status-danger">
                            Chưa có thuộc tính. Vui lòng tạo thuộc tính trước.
                        </p>
                    )}
                </div>

                <div>
                    <label className="mb-1.5 block text-sm font-medium">
                        Giá trị <span className="text-status-danger">*</span>
                    </label>

                    <input
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        className={inputClass}
                        placeholder="Ví dụ: Trắng, Inox, 2 lít..."
                        maxLength={100}
                        required
                        autoFocus
                        disabled={loading}
                    />

                    <p className="mt-1.5 text-xs text-text-muted">
                        Slug sẽ được tạo tự động từ giá trị.
                    </p>
                </div>

                {value.trim() && (
                    <div className="rounded-lg border border-border-default bg-bg-app p-3">
                        <p className="text-xs text-text-muted">Slug dự kiến</p>
                        <p className="mt-1 break-all font-mono text-sm text-text-secondary">
                            {slugify(value)}
                        </p>
                    </div>
                )}

                {error && (
                    <p className="text-sm text-status-danger">{error}</p>
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

                    <Button
                        type="submit"
                        loading={loading}
                        disabled={!attributes.length}
                    >
                        {editing ? 'Lưu thay đổi' : 'Thêm giá trị'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
