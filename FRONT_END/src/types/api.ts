import type { Pagination } from "../services/http.ts";

export type { Pagination };

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: "customer";
  status: "active" | "inactive" | "blocked";
  emailVerifiedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResult = { user: Customer; token: string };

export type NamedRef = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  image?: string | null;
};

export type Category = {
  id: string;
  parentId?: string | NamedRef | null;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  isActive?: boolean;
};

export type AttributeValue = { id: string; value: string; slug?: string };
export type Attribute = { id: string; name: string; slug: string; values?: AttributeValue[] };

export type ProductListItem = {
  id: string;
  categoryId: string | NamedRef | null;
  brandId: string | NamedRef | null;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  averageRating?: number;
  totalReviews?: number;
  totalSales?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  thumbnail?: string | null;
};

export type ProductMedia = {
  id: string;
  productId: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type VariantAttribute = {
  id: string;
  attributeId: string | { id: string; name: string; slug?: string };
  attributeValueId: string | { id: string; value: string; slug?: string };
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  weight?: number | null;
  image?: string | null;
  isActive?: boolean;
  attributes?: VariantAttribute[];
};

export type ProductDetail = ProductListItem & {
  media?: ProductMedia[];
  variants?: ProductVariant[];
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantId: string | null;
  variantSku: string | null;
  unitPrice: number;
  originalPrice: number | null;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  isActive: boolean;
};

export type CartPayload = {
  items: CartItem[];
  totalQuantity: number;
  totalUniqueItems: number;
  subtotal: number;
};

export type WishlistItem = {
  id: string;
  productId: string;
  name: string;
  slug: string;
  basePrice: number;
  salePrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  averageRating?: number;
  totalReviews?: number;
  primaryImage?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
  createdAt?: string;
};

export type Coupon = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minimumOrderAmount?: number | null;
  maximumDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount?: number;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
};

export type CouponCheck = {
  valid: boolean;
  coupon: Coupon;
  discountAmount: number;
  finalAmount: number;
};

export type UserAddress = {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district?: string | null;
  province?: string | null;
  isDefault?: boolean;
};

export type PaymentMethod = "COD" | "BANK" | "MOMO" | "VNPAY" | "ZALOPAY";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";

export type CheckoutLine = {
  cartItemId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productSku?: string | null;
  variantSku?: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

export type CheckoutSummary = {
  items: CheckoutLine[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  coupon: { id: string; code: string; name: string } | null;
  shippingAddress: {
    customerName: string;
    customerPhone: string;
    addressLine: string;
    ward: string | null;
    district: string | null;
    province: string | null;
  };
};

export type Order = {
  id: string;
  orderNumber: string;
  userId?: string;
  couponId?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: string;
  shippingWard?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  note?: string | null;
  confirmedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  productSku?: string | null;
  variantSku?: string | null;
  variantAttributes?: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
};

export type BankTransferInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
};

export type PaymentRecord = {
  id?: string;
  _id?: string;
  orderId: string | { id?: string; _id?: string };
  paymentMethod: PaymentMethod;
  transactionCode?: string | null;
  amount: number;
  currency?: string;
  paymentUrl?: string | null;
  expiredAt?: string | null;
  status: PaymentStatus;
  failedReason?: string | null;
  paidAt?: string | null;
  order?: { orderNumber: string; status: string } | null;
};

export type CreatePaymentResult = {
  payment: PaymentRecord;
  paymentUrl: string | null;
  bankTransferInfo?: BankTransferInfo | null;
};

export type StatusCount = { status: string; total: number };

export type CustomerOverview = {
  totalOrders: number;
  ordersByStatus: StatusCount[];
  totalSpent: number;
  totalReviews: number;
  totalWishlistItems: number;
};

export type AiChatProduct = {
  _id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  salePrice: number | null;
  averageRating?: number;
  totalReviews?: number;
  stockQuantity?: number;
};

export type AiChatReply = {
  conversationId: string;
  title: string;
  answer: string;
  products: AiChatProduct[];
  createdAt: string;
};

export type AiConversationSummary = {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AiConversationDetail = {
  conversationId: string;
  title: string;
  messages: { role: "user" | "assistant"; content: string; createdAt?: string }[];
  createdAt: string;
  updatedAt: string;
};

export type AiSearchProduct = {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  averageRating?: number;
  totalReviews?: number;
  category?: { name?: string; slug?: string } | string | null;
  brand?: { name?: string; slug?: string } | string | null;
  media?: { mediaUrl?: string; isPrimary?: boolean; mediaType?: string }[];
  availableVariantPriceRange?: { min: number; max: number } | null;
};

export type AiSearchResult = {
  reply: string;
  appliedFilters: Record<string, unknown>;
  products: AiSearchProduct[];
  pagination: {
    page: number;
    limit: number;
    totalProducts: number;
    totalPages: number;
    hasMore: boolean;
  };
};
