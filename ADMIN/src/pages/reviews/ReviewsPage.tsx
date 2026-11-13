
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  MessageSquareText,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';

import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/buttons/Button';
import { Card } from '../../components/ui/data-display/Card';

import { reviewsService } from '../../services/reviews/reviews.service';

import type {
  ReviewDetail,
  ReviewId,
  ReviewListParams,
  ReviewPagination,
  ReviewVisibility,
} from '../../types/review.types';

const PAGE_SIZE = 8;

type RatingFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type VerifiedFilter = 'all' | 'verified' | 'unverified';

const EMPTY_PAGINATION: ReviewPagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
};

const formatDate = (value: string) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error
    ? error.message
    : 'Đã xảy ra lỗi khi xử lý yêu cầu.';
};

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`${rating} trên 5 sao`}
    >
      <span className="inline-flex gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={13}
            className={
              value <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'text-text-muted/40'
            }
          />
        ))}
      </span>

      <span className="text-xs text-text-secondary">
        {rating}
      </span>
    </span>
  );
}

export default function ReviewsPage() {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<ReviewDetail[]>([]);
  const [pagination, setPagination] =
    useState<ReviewPagination>(EMPTY_PAGINATION);

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const [visibility, setVisibility] =
    useState<ReviewVisibility>('all');

  const [ratingFilter, setRatingFilter] =
    useState<RatingFilter>('all');

  const [verifiedFilter, setVerifiedFilter] =
    useState<VerifiedFilter>('all');

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionId, setActionId] =
    useState<ReviewId | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Debounce tìm kiếm.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [keyword]);

  // Tải danh sách đánh giá từ backend.
  useEffect(() => {
    let cancelled = false;

    const loadReviews = async () => {
      setLoading(true);
      setError('');

      const params: ReviewListParams = {
        page,
        limit: PAGE_SIZE,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      if (debouncedKeyword) {
        params.keyword = debouncedKeyword;
      }

      if (visibility === 'visible') {
        params.isApproved = true;
      }

      if (visibility === 'hidden') {
        params.isApproved = false;
      }

      if (ratingFilter !== 'all') {
        params.rating = Number(ratingFilter);
      }

      if (verifiedFilter === 'verified') {
        params.isVerifiedPurchase = true;
      }

      if (verifiedFilter === 'unverified') {
        params.isVerifiedPurchase = false;
      }

      try {
        const result = await reviewsService.getReviews(params);

        if (cancelled) return;

        setReviews(result.reviews);
        setPagination(result.pagination);
      } catch (requestError) {
        if (cancelled) return;

        setError(getErrorMessage(requestError));
        setReviews([]);
        setPagination(EMPTY_PAGINATION);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReviews();

    return () => {
      cancelled = true;
    };
  }, [
    page,
    debouncedKeyword,
    visibility,
    ratingFilter,
    verifiedFilter,
    refreshKey,
  ]);

  // Thống kê trên dữ liệu trang hiện tại.
  const stats = useMemo(() => {
    const total = reviews.length;

    const visible = reviews.filter(
      (review) => review.is_approved,
    ).length;

    const hidden = total - visible;

    const average = total
      ? reviews.reduce(
        (sum, review) => sum + review.rating,
        0,
      ) / total
      : 0;

    const lowRating = reviews.filter(
      (review) => review.rating <= 2,
    ).length;

    const verified = reviews.filter(
      (review) => review.is_verified_purchase,
    ).length;

    return {
      total,
      visible,
      hidden,
      average,
      lowRating,
      verified,
    };
  }, [reviews]);

  const distribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: reviews.filter(
          (review) => review.rating === rating,
        ).length,
      })),
    [reviews],
  );

  // Ẩn hoặc hiển thị đánh giá.
  const changeVisibility = async (review: ReviewDetail) => {
    if (actionId !== null) return;

    const nextValue = !review.is_approved;

    const action = nextValue ? 'hiển thị lại' : 'ẩn';

    if (
      !window.confirm(
        `Bạn có chắc muốn ${action} đánh giá #${review.id}?`,
      )
    ) {
      return;
    }

    setActionId(review.id);
    setError('');

    try {
      await reviewsService.updateReviewApproval(
        review.id,
        nextValue,
      );

      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  // Xóa đánh giá.
  const removeReview = async (review: ReviewDetail) => {
    if (actionId !== null) return;

    if (
      !window.confirm(
        `Xóa đánh giá #${review.id} của ${review.customer.name}? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    setActionId(review.id);
    setError('');

    try {
      await reviewsService.deleteReview(review.id);

      if (reviews.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setActionId(null);
    }
  };

  // Xóa điều kiện lọc.
  const resetFilters = () => {
    setKeyword('');
    setDebouncedKeyword('');
    setVisibility('all');
    setRatingFilter('all');
    setVerifiedFilter('all');
    setPage(1);
  };

  // Cấu hình cột bảng.
  const columns: DataTableColumn<ReviewDetail>[] = [
    {
      key: 'review',
      header: 'ĐÁNH GIÁ',
      className: 'min-w-[250px]',
      headerClassName: 'min-w-[250px]',
      render: (review) => (
        <button
          type="button"
          onClick={() =>
            navigate(`/admin/reviews/${review.id}`)
          }
          className="block max-w-[360px] text-left"
        >
          <span className="block font-semibold text-text-primary transition-colors hover:text-accent-primary">
            {review.title?.trim() ||
              'Đánh giá không có tiêu đề'}
          </span>

          <span className="mt-1 block line-clamp-2 text-sm text-text-secondary">
            {review.content?.trim() ||
              'Không có nội dung đánh giá.'}
          </span>

          <span className="mt-2 block">
            <Stars rating={review.rating} />
          </span>
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'KHÁCH HÀNG',
      className: 'min-w-[175px]',
      render: (review) => (
        <div className="min-w-0">
          <p className="font-medium text-text-primary">
            {review.customer.name}
          </p>

          <p className="mt-1 break-all text-xs text-text-muted">
            {review.customer.email}
          </p>

          {review.is_verified_purchase && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
              <CheckCircle2 size={12} />
              Đã mua hàng
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'SẢN PHẨM',
      className: 'min-w-[200px]',
      render: (review) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-default bg-bg-elevated">
            <MessageSquareText
              size={17}
              className="text-text-muted"
            />
          </div>

          <div className="min-w-0">
            <p className="line-clamp-2 text-sm text-text-primary">
              {review.product.name}
            </p>

            <p className="mt-1 text-xs text-text-muted">
              SKU: Chưa có dữ liệu
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'ĐƠN HÀNG',
      className: 'min-w-[145px]',
      render: (review) => (
        <span className="font-mono text-xs text-text-secondary">
          {review.order?.order_number ??
            review.order?.id ??
            'Không liên kết'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'NGÀY TẠO',
      className: 'min-w-[105px]',
      render: (review) => (
        <span className="text-sm text-text-secondary">
          {formatDate(review.created_at)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'TRẠNG THÁI',
      className: 'min-w-[125px]',
      render: (review) => (
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
      ),
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      className: 'min-w-[140px]',
      headerClassName: 'text-right',
      render: (review) => {
        const busy = actionId === review.id;

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="icon"
              title="Xem chi tiết"
              aria-label="Xem chi tiết"
              disabled={actionId !== null}
              onClick={() =>
                navigate(`/admin/reviews/${review.id}`)
              }
            >
              <Eye size={16} />
            </Button>

            <Button
              variant="icon"
              title={
                review.is_approved
                  ? 'Ẩn đánh giá'
                  : 'Hiển thị lại'
              }
              aria-label={
                review.is_approved
                  ? 'Ẩn đánh giá'
                  : 'Hiển thị lại'
              }
              disabled={actionId !== null}
              onClick={() => void changeVisibility(review)}
            >
              {busy ? (
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />
              ) : review.is_approved ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </Button>

            <Button
              variant="icon"
              title="Xóa đánh giá"
              aria-label="Xóa đánh giá"
              disabled={actionId !== null}
              onClick={() => void removeReview(review)}
            >
              <Trash2
                size={16}
                className="text-status-danger"
              />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 p-4 pb-8 sm:p-5 xl:p-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-primary">
            CUSTOMER EXPERIENCE
          </p>

          <h1 className="mt-2 text-2xl font-bold text-text-primary">
            Quản lý đánh giá
          </h1>

          <p className="mt-1 text-sm leading-6 text-text-secondary">
            Quản lý phản hồi sản phẩm và trải nghiệm khách hàng.
          </p>
        </div>

        <span className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-secondary sm:self-auto">
          <MessageSquareText
            size={17}
            className="text-accent-primary"
          />
          Tổng số:
          <strong className="text-text-primary">
            {pagination.total}
          </strong>
        </span>
      </header>

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
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Điểm trung bình trang này',
            value: stats.average.toFixed(1),
            suffix: '/ 5',
          },
          {
            label: 'Đang hiển thị',
            value: String(stats.visible),
            suffix: 'đánh giá',
          },
          {
            label: 'Đang ẩn',
            value: String(stats.hidden),
            suffix: 'đánh giá',
          },
          {
            label: 'Đánh giá thấp · 1–2 sao',
            value: String(stats.lowRating),
            suffix: 'đánh giá',
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="border border-border-default bg-bg-surface p-4 sm:p-5"
          >
            <p className="text-sm text-text-secondary">
              {item.label}
            </p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">
                {item.value}
              </span>

              <span className="text-xs text-text-muted">
                {item.suffix}
              </span>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border border-border-default bg-bg-surface p-4 sm:p-5">
          <h2 className="font-semibold text-text-primary">
            Phân bố số sao
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Dữ liệu trong trang hiện tại. Chọn mức sao để lọc.
          </p>

          <div className="mt-5 space-y-3">
            {distribution.map(({ rating, count }) => (
              <button
                key={rating}
                type="button"
                onClick={() => {
                  setRatingFilter(String(rating) as RatingFilter);
                  setPage(1);
                }}
                className="flex w-full items-center gap-3 rounded-md text-left transition-colors hover:bg-bg-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                <span className="flex w-9 shrink-0 items-center gap-1 text-sm text-text-secondary">
                  {rating}
                  <Star
                    size={12}
                    className="fill-amber-400 text-amber-400"
                  />
                </span>

                <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-elevated">
                  <span
                    className="block h-full rounded-full bg-amber-400 transition-all"
                    style={{
                      width: `${stats.total
                          ? (count / stats.total) * 100
                          : 0
                        }%`,
                    }}
                  />
                </span>

                <span className="w-8 shrink-0 text-right text-sm text-text-secondary">
                  {count}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="border border-border-default bg-bg-surface p-4 sm:p-5">
          <h2 className="font-semibold text-text-primary">
            Tổng quan phản hồi
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Thống kê trên dữ liệu trang hiện tại.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">
                4–5 sao
              </span>

              <strong className="text-text-primary">
                {distribution
                  .filter((item) => item.rating >= 4)
                  .reduce((sum, item) => sum + item.count, 0)}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">
                1–2 sao
              </span>

              <strong className="text-status-danger">
                {stats.lowRating}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">
                Có xác nhận mua hàng
              </span>

              <strong className="text-text-primary">
                {stats.verified}
              </strong>
            </div>
          </div>
        </Card>
      </section>

      <Card className="min-w-0 overflow-hidden border border-border-default bg-bg-surface">
        <div className="space-y-4 border-b border-border-default p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-text-primary">
              Danh sách đánh giá
            </h2>

            <p className="mt-1 text-sm text-text-muted">
              {pagination.total} kết quả phù hợp
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_155px_175px_auto]">
            <div className="relative min-w-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(1);
                }}
                placeholder="Tìm nội dung, khách hàng, sản phẩm..."
                aria-label="Tìm kiếm đánh giá"
                className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
              />
            </div>

            <select
              value={visibility}
              onChange={(event) => {
                setVisibility(
                  event.target.value as ReviewVisibility,
                );
                setPage(1);
              }}
              aria-label="Lọc trạng thái"
              className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="visible">Đang hiển thị</option>
              <option value="hidden">Đang ẩn</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(event) => {
                setRatingFilter(
                  event.target.value as RatingFilter,
                );
                setPage(1);
              }}
              aria-label="Lọc mức sao"
              className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            >
              <option value="all">Mọi mức sao</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>

            <select
              value={verifiedFilter}
              onChange={(event) => {
                setVerifiedFilter(
                  event.target.value as VerifiedFilter,
                );
                setPage(1);
              }}
              aria-label="Lọc xác nhận mua hàng"
              className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            >
              <option value="all">Mọi người mua</option>
              <option value="verified">Đã mua hàng</option>
              <option value="unverified">Chưa xác nhận</option>
            </select>

            <Button
              variant="secondary"
              className="h-[42px] w-full xl:w-auto"
              onClick={resetFilters}
            >
              Xóa lọc
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 border-b border-border-default px-4 py-3 text-sm text-text-secondary">
            <LoaderCircle
              size={16}
              className="animate-spin text-accent-primary"
            />
            Đang tải dữ liệu đánh giá...
          </div>
        )}

        <div className="min-w-0">
          <DataTable<ReviewDetail>
            columns={columns}
            data={reviews}
            getRowId={(review) => String(review.id)}
            emptyTitle={
              loading
                ? 'Đang tải dữ liệu'
                : 'Không tìm thấy đánh giá'
            }
            emptyDescription={
              error
                ? 'Không thể tải danh sách. Vui lòng thử lại.'
                : 'Thử thay đổi từ khóa hoặc điều kiện lọc.'
            }
          />
        </div>

        <div className="border-t border-border-default px-4 py-4 sm:px-5">
          <Pagination
            page={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </main>
  );
}
