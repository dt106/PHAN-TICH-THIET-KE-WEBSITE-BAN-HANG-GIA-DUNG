import { useState, type FormEvent } from 'react';

import { Button } from '../../../components/ui/buttons/Button';
import Modal from '../../../components/ui/overlays/Modal';

import type { ProductAttribute } from '../../../types/attribute.types';
import type {
  VariantAttribute,
  VariantAttributeFormData,
} from '../../../types/variant-attribute.types';

export interface VariantOption {
  id: string;
  productName: string;
  sku: string;
}

interface VariantAttributeFormModalProps {
  open: boolean;
  editing: VariantAttribute | null;
  variants: VariantOption[];
  attributes: ProductAttribute[];
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: VariantAttributeFormData) => Promise<void>;
}

export function VariantAttributeFormModal({
  open,
  editing,
  variants,
  attributes,
  loading = false,
  onClose,
  onSubmit,
}: VariantAttributeFormModalProps) {
  const [variantId, setVariantId] = useState(editing?.variantId ?? '');
  const [attributeId, setAttributeId] = useState(editing?.attributeId ?? '');
  const [attributeValueId, setAttributeValueId] = useState(
    editing?.attributeValueId ?? '',
  );
  const [error, setError] = useState('');

  const selectedAttribute = attributes.find(
    (attribute) => attribute.id === attributeId,
  );

  const availableValues = selectedAttribute?.values ?? [];

  const handleAttributeChange = (nextAttributeId: string) => {
    setAttributeId(nextAttributeId);
    setAttributeValueId('');
    setError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!variantId) {
      setError('Vui lòng chọn biến thể sản phẩm.');
      return;
    }

    if (!attributeId) {
      setError('Vui lòng chọn thuộc tính.');
      return;
    }

    if (!attributeValueId) {
      setError('Vui lòng chọn giá trị thuộc tính.');
      return;
    }

    try {
      await onSubmit({
        variantId,
        attributeId,
        attributeValueId,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Không thể lưu thuộc tính biến thể.',
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Chỉnh sửa thuộc tính biến thể' : 'Thêm thuộc tính biến thể'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="variantId"
            className="mb-2 block text-sm font-medium text-text-secondary"
          >
            Biến thể sản phẩm <span className="text-status-danger">*</span>
          </label>

          <select
            id="variantId"
            value={variantId}
            onChange={(event) => setVariantId(event.target.value)}
            disabled={Boolean(editing) || loading}
            className="h-11 w-full rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Chọn biến thể sản phẩm</option>

            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.productName} — {variant.sku}
              </option>
            ))}
          </select>

          {editing && (
            <p className="mt-1.5 text-xs text-text-muted">
              Không thể thay đổi biến thể khi đang chỉnh sửa liên kết.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="attributeId"
            className="mb-2 block text-sm font-medium text-text-secondary"
          >
            Thuộc tính <span className="text-status-danger">*</span>
          </label>

          <select
            id="attributeId"
            value={attributeId}
            onChange={(event) => handleAttributeChange(event.target.value)}
            disabled={loading}
            className="h-11 w-full rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">Chọn thuộc tính</option>

            {attributes.map((attribute) => (
              <option key={attribute.id} value={attribute.id}>
                {attribute.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="attributeValueId"
            className="mb-2 block text-sm font-medium text-text-secondary"
          >
            Giá trị thuộc tính{' '}
            <span className="text-status-danger">*</span>
          </label>

          <select
            id="attributeValueId"
            value={attributeValueId}
            onChange={(event) => setAttributeValueId(event.target.value)}
            disabled={!attributeId || loading}
            className="h-11 w-full rounded-xl border border-border-default bg-bg-elevated px-3 text-sm text-text-primary outline-none transition focus:border-accent-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {attributeId
                ? 'Chọn giá trị thuộc tính'
                : 'Vui lòng chọn thuộc tính trước'}
            </option>

            {availableValues.map((value) => (
              <option key={value.id} value={value.id}>
                {value.value}
              </option>
            ))}
          </select>

          {attributeId && availableValues.length === 0 && (
            <p className="mt-1.5 text-xs text-status-danger">
              Thuộc tính này chưa có giá trị nào.
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-status-danger/30 bg-status-danger/10 px-4 py-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-border-default pt-4">
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
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {editing ? 'Lưu thay đổi' : 'Thêm thuộc tính'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}