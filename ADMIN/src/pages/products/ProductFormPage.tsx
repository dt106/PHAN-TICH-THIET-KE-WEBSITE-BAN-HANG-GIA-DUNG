import {
  ArrowLeft,
  Save,
} from 'lucide-react';
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/buttons/Button';

import { categoriesService } from '../../services/catalog/categories.service';
import { brandsService } from '../../services/catalog/brands.service';
import { productsService } from '../../services/catalog/products.service';

import type { Category } from '../../types/category.types';
import type { Brand } from '../../types/brand.types';
import type {
  ProductReference,
  ProductCreatePayload,
} from '../../types/product.types';

const initialForm = {
  name: '',
  sku: '',
  slug: '',
  description: '',
  categoryId: '',
  brandId: '',
  basePrice: '',
  salePrice: '',
  metaTitle: '',
  metaDescription: '',
  isActive: true,
  isFeatured: false,
};

type ProductFormValues = typeof initialForm;

const fieldClass =
  'mt-2.5 block w-full min-w-0 rounded-xl border border-border-default bg-bg-elevated px-4 py-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15';

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
      <div className="border-b border-border-default px-5 py-5">
        <h2 className="font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function getReferenceId(
  value: string | ProductReference | null | undefined,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id ?? value.id ?? '';
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<ProductFormValues>(initialForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadFormData() {
      setLoading(true);
      setError('');

      try {
        const [categoryResponse, brandResponse] = await Promise.all([
          categoriesService.getAdminList({
            page: 1,
            limit: 100,
          }),
          brandsService.getList({
            page: 1,
            limit: 100,
          }),
        ]);

        if (cancelled) return;

        const categoryItems = categoryResponse.data ?? [];
        const brandItems = brandResponse.data ?? [];

        setCategories(categoryItems);
        setBrands(brandItems);

        if (!id) {
          setForm(initialForm);
          return;
        }

        const response = await productsService.getAdminProductById(id);

        if (cancelled) return;

        const product = response.data;

        if (!product) {
          navigate('/products', { replace: true });
          return;
        }

        setForm({
          name: product.name ?? '',
          sku: product.sku ?? '',
          slug: product.slug ?? '',
          description: product.description ?? '',
          categoryId: getReferenceId(product.categoryId),
          brandId: getReferenceId(product.brandId),
          basePrice: String(product.basePrice ?? ''),
          salePrice:
            product.salePrice === null || product.salePrice === undefined
              ? ''
              : String(product.salePrice),
          metaTitle: product.metaTitle ?? '',
          metaDescription: product.metaDescription ?? '',
          isActive: Boolean(product.isActive),
          isFeatured: Boolean(product.isFeatured),
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Không thể tải dữ liệu sản phẩm.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadFormData();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  function updateField<K extends keyof ProductFormValues>(
    key: K,
    value: ProductFormValues[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setError('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const name = form.name.trim();
    const sku = form.sku.trim().toUpperCase();
    const categoryId = form.categoryId;

    const basePrice = Number(form.basePrice);
    const salePrice =
      form.salePrice.trim() === '' ? null : Number(form.salePrice);

    if (!name || !sku || !categoryId) {
      setError('Vui lòng nhập tên, SKU và chọn danh mục sản phẩm.');
      return;
    }

    if (
      form.basePrice.trim() === '' ||
      !Number.isFinite(basePrice) ||
      basePrice < 0
    ) {
      setError('Giá gốc phải là số hợp lệ và không được âm.');
      return;
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0)
    ) {
      setError('Giá khuyến mãi phải là số hợp lệ và không được âm.');
      return;
    }

    if (salePrice !== null && salePrice > basePrice) {
      setError('Giá khuyến mãi không được lớn hơn giá gốc.');
      return;
    }

    const payload: ProductCreatePayload = {
      name,
      sku,
      slug: form.slug.trim() || undefined,
      categoryId,
      brandId: form.brandId || null,
      description: form.description.trim() || null,
      basePrice,
      salePrice,
      metaTitle: form.metaTitle.trim() || null,
      metaDescription: form.metaDescription.trim() || null,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
    };

    setSaving(true);

    try {
      if (id) {
        await productsService.updateProduct(id, payload);
        navigate(`/products/${id}`);
      } else {
        const response = await productsService.createProduct(payload);
        const createdProduct = response.data;

        if (createdProduct?.id) {
          navigate(`/products/${createdProduct.id}`);
        } else {
          navigate('/products');
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu sản phẩm. Vui lòng thử lại.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="p-4 sm:p-6">
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border-default bg-bg-surface text-sm text-text-secondary">
          Đang tải dữ liệu sản phẩm...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title={isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
        description="Quản lý thông tin cơ bản, phân loại và giá của sản phẩm."
        eyebrow={isEditing ? 'PRODUCT / EDIT' : 'PRODUCT / CREATE'}
        actions={
          <Link to="/products">
            <Button variant="secondary">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSection
          title="Thông tin cơ bản"
          description="Thông tin nhận diện sản phẩm trong hệ thống."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-text-secondary">
                Tên sản phẩm *
              </span>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
                maxLength={255}
                placeholder="Nhập tên sản phẩm"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                SKU *
              </span>
              <input
                className={fieldClass}
                value={form.sku}
                onChange={(e) => updateField('sku', e.target.value)}
                required
                placeholder="VD: NOI-INOX-001"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                Slug
              </span>
              <input
                className={fieldClass}
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                placeholder="Để trống để Backend tự tạo"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                Danh mục *
              </span>
              <select
                className={fieldClass}
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.status === 'inactive' ? ' (Ngừng hoạt động)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                Thương hiệu
              </span>
              <select
                className={fieldClass}
                value={form.brandId}
                onChange={(e) => updateField('brandId', e.target.value)}
              >
                <option value="">-- Không chọn thương hiệu --</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                    {!brand.isActive ? ' (Ngừng hoạt động)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2">
              <span className="text-sm font-medium text-text-secondary">
                Mô tả sản phẩm
              </span>
              <textarea
                className={`${fieldClass} min-h-32 resize-y`}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={5}
                placeholder="Nhập mô tả sản phẩm..."
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          title="Thông tin giá"
          description="basePrice là giá gốc; salePrice là giá khuyến mãi."
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-text-secondary">
                Giá gốc (VNĐ) *
              </span>
              <input
                className={fieldClass}
                type="number"
                min="0"
                step="1"
                value={form.basePrice}
                onChange={(e) => updateField('basePrice', e.target.value)}
                required
                placeholder="VD: 500000"
              />
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                Giá khuyến mãi (VNĐ)
              </span>
              <input
                className={fieldClass}
                type="number"
                min="0"
                step="1"
                value={form.salePrice}
                onChange={(e) => updateField('salePrice', e.target.value)}
                placeholder="Để trống nếu không giảm giá"
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          title="SEO"
          description="Thông tin hỗ trợ hiển thị trên công cụ tìm kiếm."
        >
          <div className="grid grid-cols-1 gap-5">
            <label>
              <span className="text-sm font-medium text-text-secondary">
                Meta title
              </span>
              <input
                className={fieldClass}
                maxLength={255}
                value={form.metaTitle}
                onChange={(e) => updateField('metaTitle', e.target.value)}
              />
            </label>

            <label>
              <span className="text-sm font-medium text-text-secondary">
                Meta description
              </span>
              <textarea
                className={`${fieldClass} min-h-24`}
                value={form.metaDescription}
                onChange={(e) =>
                  updateField('metaDescription', e.target.value)
                }
              />
            </label>
          </div>
        </FormSection>

        <FormSection
          title="Trạng thái sản phẩm"
          description="Thiết lập trạng thái kinh doanh và sản phẩm nổi bật."
        >
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="h-4 w-4 accent-current"
              />
              Đang kinh doanh
            </label>

            <label className="flex items-center gap-3 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => updateField('isFeatured', e.target.checked)}
                className="h-4 w-4 accent-current"
              />
              Sản phẩm nổi bật
            </label>
          </div>
        </FormSection>

        <div className="rounded-xl border border-border-default bg-bg-elevated/40 p-4 text-sm leading-6 text-text-muted">
          <p className="font-medium text-text-secondary">
            Lưu ý về biến thể, tồn kho và hình ảnh
          </p>
          <p className="mt-1">
            Tồn kho và SKU từng phiên bản cần được quản lý trong ProductVariant
            và Inventory. Hình ảnh được quản lý riêng trong ProductMedia sau
            khi sản phẩm được tạo.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link to="/products">
            <Button variant="secondary" className="w-full sm:w-auto">
              Hủy
            </Button>
          </Link>

          <Button
            variant="primary"
            type="submit"
            loading={saving}
            className="w-full sm:w-auto"
          >
            <Save className="mr-2 h-4 w-4" />
            {isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </form>
    </main>
  );
}