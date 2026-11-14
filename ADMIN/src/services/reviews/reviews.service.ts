
import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type {
  ReviewDetail,
  ReviewId,
  ReviewListParams,
  ReviewPagination,
} from '../../types/review.types';

interface BackendReview {
  _id: string;
  productId: string | {
    _id: string;
    name?: string;
    slug?: string;
  };
  userId: string | {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string | null;
  };
  orderId?: string | { _id: string } | null;
  rating: number;
  title?: string | null;
  content?: string | null;
  images?: string | null;
  isVerifiedPurchase?: boolean;
  isApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ReviewListResponse {
  success: boolean;
  message?: string;
  data: BackendReview[];
  pagination: ReviewPagination;
}

interface ReviewDetailResponse {
  success: boolean;
  message?: string;
  data: BackendReview;
}

interface ReviewMutationResponse {
  success: boolean;
  message?: string;
  data?: BackendReview;
}

const getObjectId = (
  value: string | { _id: string } | null | undefined,
): string | null => {
  if (!value) return null;
  return typeof value === 'string' ? value : value._id;
};

const parseImages = (images?: string | null): string[] => {
  if (!images?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(images);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      );
    }
  } catch {
    // Backend lưu một URL đơn lẻ thay vì JSON array.
  }

  return [images.trim()];
};

const mapReview = (raw: BackendReview): ReviewDetail => {
  const product =
    typeof raw.productId === 'object' ? raw.productId : null;

  const customer =
    typeof raw.userId === 'object' ? raw.userId : null;

  const orderId = getObjectId(raw.orderId);

  return {
    id: raw._id,
    product_id: getObjectId(raw.productId) ?? '',
    user_id: getObjectId(raw.userId) ?? '',
    order_id: orderId,
    rating: raw.rating,
    title: raw.title ?? null,
    content: raw.content ?? null,
    images: raw.images ?? null,
    imageUrls: parseImages(raw.images),
    is_verified_purchase: Boolean(raw.isVerifiedPurchase),
    is_approved: Boolean(raw.isApproved),
    created_at: raw.createdAt,
    updated_at: raw.updatedAt,

    customer: {
      id: customer?._id ?? getObjectId(raw.userId) ?? '',
      name: customer?.name ?? 'Khách hàng',
      email: customer?.email ?? '',
      phone: customer?.phone ?? null,
      avatar: customer?.avatar ?? null,
      status: null,
    },

    product: {
      id: product?._id ?? getObjectId(raw.productId) ?? '',
      name: product?.name ?? 'Sản phẩm',
      slug: product?.slug ?? '',
      sku: null,
      image: null,
      is_active: null,
    },

    order: orderId
      ? {
        id: orderId,
        order_number: orderId,
        status: null,
        total_amount: null,
        created_at: null,
      }
      : null,
  };
};

export const reviewsService = {
  async getReviews(params: ReviewListParams = {}) {
    const response = await httpClient.get<ReviewListResponse>(
      API_ENDPOINTS.reviews.base,
      { params },
    );

    return {
      reviews: (response.data ?? []).map(mapReview),
      pagination: response.pagination,
      message: response.message,
    };
  },

  async getReviewById(id: ReviewId) {
    const response = await httpClient.get<ReviewDetailResponse>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(String(id))}`,
    );

    return {
      review: mapReview(response.data),
      message: response.message,
    };
  },

  async updateReviewApproval(
    id: ReviewId,
    isApproved: boolean,
  ) {
    const response = await httpClient.patch<ReviewMutationResponse>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(String(id))}/approval`,
      { isApproved },
    );

    return {
      review: response.data ? mapReview(response.data) : null,
      message: response.message,
    };
  },

  async deleteReview(id: ReviewId) {
    return httpClient.delete<{
      success: boolean;
      message?: string;
      data?: unknown;
    }>(
      `${API_ENDPOINTS.reviews.base}/${encodeURIComponent(String(id))}`,
    );
  },
};
