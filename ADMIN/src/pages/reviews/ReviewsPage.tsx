import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  MessageSquareText,
  Search,
  Star,
  Trash2,
} from 'lucide-react';

import DataTable, {
  type DataTableColumn,
} from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import { Button } from '../../components/ui/buttons/Button';
import { Card } from '../../components/ui/data-display/Card';
import { reviewsMock } from '../../mocks/reviews.mock';
import type { ReviewDetail } from '../../types/review.types';

const PAGE_SIZE = 8;

type Visibility = 'all' | 'visible' | 'hidden';
type RatingFilter = 'all' | 'low' | 'middle' | 'high';
type Period = 'all' | '7days' | '30days';

const formatDate = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
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
      <span className="text-xs text-text-secondary">{rating}</span>
    </span>
  );
}

export default function ReviewsPage() {
  const navigate = useNavigate();

  const [revision, setRevision] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [page, setPage] = useState(1);

  const reviews = useMemo(() => [...reviewsMock], [revision]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const visible = reviews.filter((review) => review.is_approved).length;
    const hidden = total - visible;
    const average = total
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;
    const lowRating = reviews.filter((review) => review.rating <= 2).length;

    return { total, visible, hidden, average, lowRating };
  }, [reviews]);

  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));

  const filtered = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase('vi');
    const now = Date.now();
    const days =
      period === '7days' ? 7 : period === '30days' ? 30 : null;

    return reviews.filter((review) => {
      const matchesQuery =
        !query ||
        [
          String(review.id),
          review.title ?? '',
          review.content ?? '',
          review.customer.name,
          review.customer.email,
          review.product.name,
          review.product.sku,
          review.order?.order_number ?? '',
        ].some((value) => value.toLocaleLowerCase('vi').includes(query));

      const matchesVisibility =
        visibility === 'all' ||
        (visibility === 'visible' && review.is_approved) ||
        (visibility === 'hidden' && !review.is_approved);

      const matchesRating =
        ratingFilter === 'all' ||
        (ratingFilter === 'low' && review.rating <= 2) ||
        (ratingFilter === 'middle' && review.rating === 3) ||
        (ratingFilter === 'high' && review.rating >= 4);

      const createdAt = new Date(review.created_at).getTime();
      const matchesPeriod =
        days === null ||
        (!Number.isNaN(createdAt) &&
          createdAt >= now - days * 24 * 60 * 60 * 1000);

      return (
        matchesQuery &&
        matchesVisibility &&
        matchesRating &&
        matchesPeriod
      );
    });
  }, [reviews, keyword, visibility, ratingFilter, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const changeVisibility = (review: ReviewDetail) => {
    const nextValue = !review.is_approved;
    const action = nextValue ? 'hiển thị lại' : 'ẩn';

    if (!window.confirm(`Bạn có chắc muốn ${action} đánh giá #${review.id}?`)) {
      return;
    }

    const target = reviewsMock.find((item) => item.id === review.id);
    if (!target) return;

    target.is_approved = nextValue;
    target.updated_at = new Date().toISOString();
    setRevision((value) => value + 1);
  };

  const removeReview = (review: ReviewDetail) => {
    if (
      !window.confirm(
        `Xóa đánh giá #${review.id} của ${review.customer.name}? Thao tác này không thể hoàn tác.`,
      )
    ) {
      return;
    }

    const index = reviewsMock.findIndex((item) => item.id === review.id);
    if (index < 0) return;

    reviewsMock.splice(index, 1);
    setRevision((value) => value + 1);
    setPage(1);
  };

  const resetFilters = () => {
    setKeyword('');
    setVisibility('all');
    setRatingFilter('all');
    setPeriod('all');
    setPage(1);
  };

  const columns: DataTableColumn<ReviewDetail>[] = [
    {
      key: 'review',
      header: 'ĐÁNH GIÁ',
      className: 'min-w-[250px]',
      headerClassName: 'min-w-[250px]',
      render: (review) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/reviews/${review.id}`)}
          className="block max-w-[360px] text-left"
        >
          <span className="block font-semibold text-text-primary transition-colors hover:text-accent-primary">
            {review.title?.trim() || 'Đánh giá không có tiêu đề'}
          </span>
          <span className="mt-1 block line-clamp-2 text-sm text-text-secondary">
            {review.content?.trim() || 'Không có nội dung đánh giá.'}
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
            <span className="mt-1 inline-block rounded-md bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
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
            {review.product.image ? (
              <img
                src={review.product.image}
                alt={review.product.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <MessageSquareText
                size={17}
                className="text-text-muted"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm text-text-primary">
              {review.product.name}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              SKU: {review.product.sku}
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
          {review.order?.order_number ?? 'Không liên kết'}
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
          status={review.is_approved ? 'Đang hiển thị' : 'Đang ẩn'}
          variant={review.is_approved ? 'success' : 'neutral'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'THAO TÁC',
      className: 'min-w-[140px]',
      headerClassName: 'text-right',
      render: (review) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon"
            title="Xem chi tiết"
            aria-label="Xem chi tiết"
            onClick={() => navigate(`/admin/reviews/${review.id}`)}
          >
            <Eye size={16} />
          </Button>

          <Button
            variant="icon"
            title={review.is_approved ? 'Ẩn đánh giá' : 'Hiển thị lại'}
            aria-label={review.is_approved ? 'Ẩn đánh giá' : 'Hiển thị lại'}
            onClick={() => changeVisibility(review)}
          >
            {review.is_approved ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>

          <Button
            variant="icon"
            title="Xóa đánh giá"
            aria-label="Xóa đánh giá"
            onClick={() => removeReview(review)}
          >
            <Trash2 size={16} className="text-status-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 p-4 pb-8 sm:p-5 sm:pb-8 xl:p-6 xl:pb-8">
      {/* Page header */}
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
          <strong className="text-text-primary">{stats.total}</strong>
        </span>
      </header>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Điểm trung bình',
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
            label: 'Đánh giá thấp (1–2 sao)',
            value: String(stats.lowRating),
            suffix: 'đánh giá',
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="border border-border-default bg-bg-surface p-4 sm:p-5"
          >
            <p className="text-sm text-text-secondary">{item.label}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-text-primary">
                {item.value}
              </span>
              <span className="text-xs text-text-muted">{item.suffix}</span>
            </div>
          </Card>
        ))}
      </section>

      {/* Rating overview */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="border border-border-default bg-bg-surface p-4 sm:p-5">
          <h2 className="font-semibold text-text-primary">
            Phân bố số sao
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Chọn một mức sao để lọc danh sách.
          </p>

          <div className="mt-5 space-y-3">
            {distribution.map(({ rating, count }) => (
              <button
                key={rating}
                type="button"
                onClick={() => {
                  setRatingFilter(
                    rating >= 4
                      ? 'high'
                      : rating === 3
                        ? 'middle'
                        : 'low',
                  );
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
                      width: `${stats.total ? (count / stats.total) * 100 : 0
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
            Tỷ lệ đánh giá tích cực và xác nhận mua hàng.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">4–5 sao</span>
              <strong className="text-text-primary">
                {distribution
                  .filter((item) => item.rating >= 4)
                  .reduce((sum, item) => sum + item.count, 0)}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">1–2 sao</span>
              <strong className="text-status-danger">
                {stats.lowRating}
              </strong>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">
                Có xác nhận mua hàng
              </span>
              <strong className="text-text-primary">
                {reviews.filter((item) => item.is_verified_purchase).length}
              </strong>
            </div>
          </div>
        </Card>
      </section>

      {/* Reviews list */}
      <Card className="min-w-0 overflow-hidden border border-border-default bg-bg-surface">
        <div className="space-y-4 border-b border-border-default p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-text-primary">
              Danh sách đánh giá
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {filtered.length} kết quả phù hợp
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_165px_155px_auto]">
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
                placeholder="Tìm đánh giá, khách, SKU, đơn hàng..."
                aria-label="Tìm kiếm đánh giá"
                className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
              />
            </div>

            <select
              value={visibility}
              onChange={(event) => {
                setVisibility(event.target.value as Visibility);
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
                setRatingFilter(event.target.value as RatingFilter);
                setPage(1);
              }}
              aria-label="Lọc mức sao"
              className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            >
              <option value="all">Mọi mức sao</option>
              <option value="low">Thấp · 1–2 sao</option>
              <option value="middle">Trung bình · 3 sao</option>
              <option value="high">Tốt · 4–5 sao</option>
            </select>

            <select
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as Period);
                setPage(1);
              }}
              aria-label="Lọc thời gian"
              className="h-[42px] w-full rounded-xl border border-border-default bg-bg-app px-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            >
              <option value="all">Mọi thời gian</option>
              <option value="7days">7 ngày gần đây</option>
              <option value="30days">30 ngày gần đây</option>
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

        <div className="min-w-0">
          <DataTable<ReviewDetail>
            columns={columns}
            data={pageRows}
            getRowId={(review) => String(review.id)}
            emptyTitle="Không tìm thấy đánh giá"
            emptyDescription="Thử thay đổi từ khóa hoặc điều kiện lọc."
          />
        </div>

        <div className="border-t border-border-default px-4 py-4 sm:px-5">
          <Pagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </main>
  );
}