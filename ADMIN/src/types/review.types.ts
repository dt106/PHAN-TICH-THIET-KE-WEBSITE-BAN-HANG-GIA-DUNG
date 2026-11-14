
export type ReviewId = string | number;

export interface ProductReview {
  id: ReviewId;
  product_id: ReviewId;
  user_id: ReviewId;
  order_id: ReviewId | null;
  rating: number;
  title: string | null;
  content: string | null;
  images: string | null;
  is_verified_purchase: boolean;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewCustomer {
  id: ReviewId;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: 'active' | 'inactive' | 'blocked' | null;
}

export interface ReviewProduct {
  id: ReviewId;
  name: string;
  slug: string;
  sku: string | null;
  image: string | null;
  is_active: boolean | null;
}

export interface ReviewOrder {
  id: ReviewId;
  order_number: string;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
}

export interface ReviewDetail extends ProductReview {
  customer: ReviewCustomer;
  product: ReviewProduct;
  order: ReviewOrder | null;
  imageUrls: string[];
}

export type ReviewVisibility = 'all' | 'visible' | 'hidden';
export type ReviewRatingFilter = 'all' | 'low' | 'middle' | 'high';
export type ReviewPeriod = 'all' | '7days' | '30days';

export interface ReviewListParams {
  [key: string]: string | number | boolean | undefined;

  keyword?: string;
  rating?: number;
  isApproved?: boolean;
  isVerifiedPurchase?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
