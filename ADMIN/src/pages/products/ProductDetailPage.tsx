import {
  ArrowLeft,
  CalendarDays,
  Package,
  Pencil,
  Star,
  Tag,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import PageHeader from '../../components/shared/PageHeader';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/buttons/Button';

import { productsService } from '../../services/catalog/products.service';

import type {
  Product,
  ProductReference,
} from '../../types/product.types';

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const formatDate = (value?: string) => {
  if (!value) return 'Chưa cập nhật';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function getReferenceName(
  value: string | ProductReference | null | undefined,
) {
  if (!value) return 'Chưa liên kết';
  if (typeof value === 'string') return value;
  return value.name || 'Chưa cập nhật';
}

function getReferenceId(
  value: string | ProductReference | null | undefined,
) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id ?? value.id ?? '';
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-text-primary">
        {value || 'Chưa cập nhật'}
      </p>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!id) {
        navigate('/products', { replace: true });
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await productsService.getAdminProductById(id);

        if (cancelled) return;

        if (!response.data) {
          navigate('/products', { replace: true });
          return;
        }

        setProduct(response.data);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải thông tin sản phẩm.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6">
        <div className="flex min-h-48 items-center justify-center rounded-2xl border border-border-default bg-bg-surface text-sm text-text-secondary">
          Đang tải thông tin sản phẩm...
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/products')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Button>

        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error || 'Không tìm thấy sản phẩm.'}
        </div>
      </main>
    );
  }

  const discount =
    product.salePrice !== null &&
      product.salePrice !== undefined &&
      product.basePrice > 0 &&
      product.salePrice < product.basePrice
      ? Math.round(
        ((product.basePrice - product.salePrice) / product.basePrice) *
        100,
      )
      : 0;

  const categoryId = getReferenceId(product.categoryId);
  const brandId = getReferenceId(product.brandId);

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Chi tiết sản phẩm"
        description="Thông tin sản phẩm được lấy trực tiếp từ hệ thống."
        eyebrow={`PRODUCT / ${product.sku}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/products">
              <Button variant="secondary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại
              </Button>
            </Link>

            <Link to={`/products/${product.id}/edit`}>
              <Button variant="primary">
                <Pencil className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </Button>
            </Link>
          </div>
        }
      />

      <section className="overflow-hidden rounded-2xl border border-border-default bg-bg-surface">
        <div className="flex flex-col gap-4 border-b border-border-default p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {product.isActive ? (
                <StatusBadge status="Đang kinh doanh" variant="success" />
              ) : (
                <StatusBadge status="Ngừng kinh doanh" variant="neutral" />
              )}

              {product.isFeatured && (
                <StatusBadge status="Nổi bật" variant="warning" />
              )}
            </div>

            <h2 className="mt-4 break-words text-2xl font-bold text-text-primary">
              {product.name}
            </h2>

            <p className="mt-2 text-sm text-text-muted">
              SKU: {product.sku}
            </p>

            <p className="mt-1 text-sm text-text-muted">
              Slug: {product.slug}
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border-default bg-bg-elevated text-text-muted">
            <Package className="h-7 w-7" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
          <DetailItem
            label="Danh mục"
            value={getReferenceName(product.categoryId)}
          />

          <DetailItem
            label="ID danh mục"
            value={categoryId}
          />

          <DetailItem
            label="Thương hiệu"
            value={getReferenceName(product.brandId)}
          />

          <DetailItem
            label="ID thương hiệu"
            value={brandId || 'Không chọn thương hiệu'}
          />

          <DetailItem
            label="Giá gốc"
            value={formatCurrency(product.basePrice)}
          />

          <DetailItem
            label="Giá khuyến mãi"
            value={
              product.salePrice === null
                ? 'Không áp dụng'
                : formatCurrency(product.salePrice)
            }
          />

          <DetailItem
            label="Giá thấp nhất"
            value={
              product.minPrice === null
                ? 'Chưa có dữ liệu'
                : formatCurrency(product.minPrice)
            }
          />

          <DetailItem
            label="Giá cao nhất"
            value={
              product.maxPrice === null
                ? 'Chưa có dữ liệu'
                : formatCurrency(product.maxPrice)
            }
          />

          <DetailItem
            label="Đánh giá trung bình"
            value={`${Number(product.averageRating ?? 0).toFixed(1)} / 5`}
          />

          <DetailItem
            label="Tổng lượt đánh giá"
            value={String(product.totalReviews ?? 0)}
          />

          <DetailItem
            label="Tổng lượt bán"
            value={String(product.totalSales ?? 0)}
          />

          <DetailItem
            label="Trạng thái nổi bật"
            value={product.isFeatured ? 'Có' : 'Không'}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              Mô tả sản phẩm
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Nội dung mô tả được lưu trong Product.
            </p>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-text-secondary">
          {product.description || 'Sản phẩm chưa có mô tả.'}
        </p>
      </section>

      <section className="rounded-2xl border border-border-default bg-bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">
              Thông tin quản lý
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Thời gian tạo và cập nhật dữ liệu.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem
            label="ID sản phẩm"
            value={product.id}
          />
          <DetailItem
            label="Ngày tạo"
            value={formatDate(product.createdAt)}
          />
          <DetailItem
            label="Cập nhật lần cuối"
            value={formatDate(product.updatedAt)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-default bg-bg-elevated/40 p-5">
        <div className="flex items-center gap-2 text-text-primary">
          <Star className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold">
            Quản lý dữ liệu liên quan
          </h3>
        </div>

        <p className="mt-2 text-sm leading-6 text-text-muted">
          Biến thể, thuộc tính biến thể, hình ảnh và tồn kho được quản lý
          thông qua các module riêng. Không có các trường này trong Product
          document nên trang chi tiết không tự tạo dữ liệu thay thế.
        </p>
      </section>
    </main>
  );
}