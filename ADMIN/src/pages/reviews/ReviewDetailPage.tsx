
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Package,
  ShoppingBag,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/buttons/Button';
import { Card } from '../../components/ui/data-display/Card';

import { reviewsService } from '../../services/reviews/reviews.service';

import type { ReviewDetail } from '../../types/review.types';

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Chưa có dữ liệu';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : 'Đã xảy ra lỗi khi xử lý yêu cầu.';
};

function Stars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${rating} trên 5 sao`}
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={19}
          className={
            value <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-text-muted/40'
          }
        />
      ))}

      <span className="ml-2 text-sm font-semibold text-text-primary">
        {rating}/5
      </span>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-border-default py-3 last:border-0 sm:grid-cols-[125px_minmax(0,1fr)] sm:gap-3">
      <span className="text-sm text-text-muted">
        {label}
      </span>

      <div className="min-w-0 break-words text-sm text-text-primary">
        {children}
      </div>
    </div>
  );
}

export default function ReviewDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [review, setReview] = useState<ReviewDetail | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();

    const loadReview = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await reviewsService.getReviewById(id);

        if (!controller.signal.aborted) {
          setReview(result.review);
          setFailedImages([]);
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setError(getErrorMessage(requestError));
        setReview(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadReview();

    return () => controller.abort();
  }, [id]);

  const goBack = () => {
    navigate('/admin/reviews');
  };

  const changeVisibility = async () => {
    if (!review || actionLoading) return;

    const nextValue = !review.is_approved;

    const confirmed = window.confirm(
      nextValue
        ? `Hiển thị lại đánh giá #${review.id}?`
        : `Ẩn đánh giá #${review.id}?`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');

    try {
      await reviewsService.updateReviewApproval(
        review.id,
        nextValue,
      );

      setReview((current) =>
        current
          ? {
            ...current,
            is_approved: nextValue,
            updated_at: new Date().toISOString(),
          }
          : current,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteReview = async () => {
    if (!review || actionLoading) return;

    const confirmed = window.confirm(
      `Xóa vĩnh viễn đánh giá #${review.id} của ${review.customer.name}? Thao tác này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError('');

    try {
      await reviewsService.deleteReview(review.id);

      navigate('/admin/reviews', { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
        <LoaderCircle
          size={32}
          className="animate-spin text-accent-primary"
        />

        <p className="text-sm text-text-secondary">
          Đang tải chi tiết đánh giá...
        </p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated text-text-muted">
          <MessageSquareText size={28} />
        </div>

        <h1 className="mt-5 text-xl font-bold text-text-primary">
          Không tìm thấy đánh giá
        </h1>

        <p className="mt-2 text-sm text-text-secondary">
          {error ||
            'Đánh giá không tồn tại hoặc đã bị xóa.'}
        </p>

        <div className="mt-6">
          <Button variant="secondary" onClick={goBack}>
            <ArrowLeft size={16} className="mr-2" />
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 pb-8">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-status-danger/30 bg-status-danger/5 p-4"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0 text-status-danger"
          />

          <p className="min-w-0 flex-1 text-sm text-text-primary">
            {error}
          </p>

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Đóng thông báo"
            className="text-text-muted hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">
              Chi tiết đánh giá
            </h1>

            <span className="max-w-full break-all rounded-lg border border-border-default bg-bg-surface px-3 py-1 font-mono text-sm text-text-secondary">
              #{review.id}
            </span>
          </div>

          <p className="mt-2 text-sm text-text-secondary">
            Nội dung phản hồi và thông tin liên quan trong SweetShop.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={goBack}>
            <ArrowLeft size={16} className="mr-2" />
            Quay lại
          </Button>

          <Button
            variant="secondary"
            disabled={actionLoading}
            onClick={() => void changeVisibility()}
          >
            {actionLoading ? (
              <LoaderCircle
                size={16}
                className="mr-2 animate-spin"
              />
            ) : review.is_approved ? (
              <EyeOff size={16} className="mr-2" />
            ) : (
              <Eye size={16} className="mr-2" />
            )}

            {review.is_approved
              ? 'Ẩn đánh giá'
              : 'Hiển thị lại'}
          </Button>

          <Button
            variant="secondary"
            disabled={actionLoading}
            onClick={() => void deleteReview()}
          >
            <Trash2
              size={16}
              className="mr-2 text-status-danger"
            />
            Xóa đánh giá
          </Button>
        </div>
      </header>

      <Card className="border border-border-default bg-bg-surface p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={
                review.is_approved
                  ? 'Đang hiển thị'
                  : 'Đang ẩn'
              }
              variant={
                review.is_approved ? 'success' : 'neutral'
              }
            />

            {review.is_verified_purchase && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary/10 px-3 py-1.5 text-xs font-medium text-accent-primary">
                <CheckCircle2 size={14} />
                Đã xác nhận mua hàng
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              Tạo: {formatDateTime(review.created_at)}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              Cập nhật: {formatDateTime(review.updated_at)}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0 border border-border-default bg-bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent-primary/10 p-3 text-accent-primary">
                <MessageSquareText size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-text-primary">
                  Nội dung đánh giá
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Phản hồi đầy đủ của khách hàng
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Stars rating={review.rating} />
            </div>

            <h3 className="mt-5 break-words text-xl font-semibold text-text-primary">
              {review.title?.trim() ||
                'Đánh giá không có tiêu đề'}
            </h3>

            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary">
              {review.content?.trim() ||
                'Khách hàng không để lại nội dung.'}
            </p>

            <div className="mt-6 border-t border-border-default pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  Hình ảnh đính kèm
                </h3>

                <span className="text-xs text-text-muted">
                  {review.imageUrls.length} ảnh
                </span>
              </div>

              {review.imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {review.imageUrls.map((src, index) =>
                    failedImages.includes(src) ? (
                      <div
                        key={`${src}-${index}`}
                        className="flex aspect-square items-center justify-center rounded-xl border border-border-default bg-bg-elevated p-3 text-center text-xs text-text-muted"
                      >
                        Không tải được ảnh
                      </div>
                    ) : (
                      <a
                        key={`${src}-${index}`}
                        href={src}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded-xl border border-border-default bg-bg-elevated"
                      >
                        <img
                          src={src}
                          alt={`Ảnh đánh giá ${index + 1}`}
                          loading="lazy"
                          onError={() =>
                            setFailedImages((current) =>
                              current.includes(src)
                                ? current
                                : [...current, src],
                            )
                          }
                          className="h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      </a>
                    ),
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-xl border border-dashed border-border-default bg-bg-app/50 px-4 py-8 text-center">
                  <Package
                    size={25}
                    className="text-text-muted"
                  />

                  <p className="mt-3 text-sm text-text-secondary">
                    Không có hình ảnh đính kèm
                  </p>
                </div>
              )}
            </div>
          </Card>

          <Card className="min-w-0 border border-border-default bg-bg-surface p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-bg-elevated p-3 text-text-secondary">
                <Package size={21} />
              </div>

              <div>
                <h2 className="font-semibold text-text-primary">
                  Sản phẩm được đánh giá
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Thông tin sản phẩm được backend cung cấp
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-default bg-bg-elevated">
                {review.product.image ? (
                  <img
                    src={review.product.image}
                    alt={review.product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package
                    size={30}
                    className="text-text-muted"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="break-words font-semibold text-text-primary">
                  {review.product.name}
                </h3>

                <InfoRow label="Product ID">
                  {review.product.id || 'Chưa có dữ liệu'}
                </InfoRow>

                <InfoRow label="SKU">
                  Chưa có dữ liệu
                </InfoRow>

                <InfoRow label="Slug">
                  {review.product.slug || 'Chưa có dữ liệu'}
                </InfoRow>

                <InfoRow label="Trạng thái sản phẩm">
                  Chưa có dữ liệu
                </InfoRow>
              </div>
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card className="min-w-0 border border-border-default bg-bg-surface p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-bg-elevated p-3 text-text-secondary">
                <UserRound size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-text-primary">
                  Khách hàng
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Thông tin được backend cung cấp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-border-default pb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-primary/10 text-lg font-semibold text-accent-primary">
                {review.customer.avatar ? (
                  <img
                    src={review.customer.avatar}
                    alt={review.customer.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  review.customer.name
                    .charAt(0)
                    .toLocaleUpperCase('vi')
                )}
              </div>

              <div className="min-w-0">
                <p className="break-words font-semibold text-text-primary">
                  {review.customer.name}
                </p>

                <p className="mt-1 break-all text-xs text-text-muted">
                  Customer ID: {review.customer.id || '—'}
                </p>
              </div>
            </div>

            <div className="pt-1">
              <InfoRow label="Email">
                <span className="inline-flex items-start gap-2">
                  <Mail
                    size={14}
                    className="mt-0.5 shrink-0 text-text-muted"
                  />
                  {review.customer.email}
                </span>
              </InfoRow>

              <InfoRow label="Điện thoại">
                {review.customer.phone || 'Chưa có dữ liệu'}
              </InfoRow>

              <InfoRow label="Tài khoản">
                Chưa có dữ liệu
              </InfoRow>
            </div>
          </Card>

          <Card className="min-w-0 border border-border-default bg-bg-surface p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-bg-elevated p-3 text-text-secondary">
                <ShoppingBag size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-text-primary">
                  Đơn hàng liên quan
                </h2>

                <p className="mt-1 text-xs text-text-muted">
                  Thông tin đơn hàng được backend cung cấp
                </p>
              </div>
            </div>

            {review.order ? (
              <>
                <div className="rounded-xl border border-border-default bg-bg-app p-4">
                  <p className="text-xs text-text-muted">
                    Mã đơn hàng
                  </p>

                  <p className="mt-2 break-all font-mono text-lg font-semibold text-text-primary">
                    {review.order.order_number ??
                      review.order.id}
                  </p>

                  <p className="mt-2 break-all text-xs text-text-muted">
                    Order ID: {review.order.id}
                  </p>
                </div>

                <div className="mt-3">
                  <InfoRow label="Trạng thái đơn">
                    Chưa có dữ liệu
                  </InfoRow>

                  <InfoRow label="Tổng đơn hàng">
                    Chưa có dữ liệu
                  </InfoRow>

                  <InfoRow label="Ngày đặt">
                    Chưa có dữ liệu
                  </InfoRow>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border-default px-4 py-6 text-center">
                <ShoppingBag
                  size={25}
                  className="mx-auto text-text-muted"
                />

                <p className="mt-3 text-sm font-medium text-text-primary">
                  Không liên kết đơn hàng
                </p>

                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Đánh giá này không có orderId.
                </p>
              </div>
            )}
          </Card>

          <Card className="min-w-0 border border-border-default bg-bg-surface p-5">
            <h2 className="font-semibold text-text-primary">
              Thông tin bản ghi
            </h2>

            <div className="mt-3">
              <InfoRow label="Review ID">
                {review.id}
              </InfoRow>

              <InfoRow label="Product ID">
                {review.product_id || '—'}
              </InfoRow>

              <InfoRow label="User ID">
                {review.user_id || '—'}
              </InfoRow>

              <InfoRow label="Order ID">
                {review.order_id ?? 'NULL'}
              </InfoRow>

              <InfoRow label="Ngày tạo">
                {formatDateTime(review.created_at)}
              </InfoRow>

              <InfoRow label="Cập nhật">
                {formatDateTime(review.updated_at)}
              </InfoRow>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
