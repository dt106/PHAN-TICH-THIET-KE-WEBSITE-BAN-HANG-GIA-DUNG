export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: "customer" | "admin";
  status: "active" | "inactive" | "blocked";
  emailVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Ref = string | { id: string; name?: string; slug?: string; logo?: string | null } | null;

export type Category = {
  id: string;
  parentId?: string | null;
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

export type ProductMedia = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type VariantAttribute = {
  id: string;
  attributeId?: { id: string; name?: string; slug?: string } | string;
  attributeValueId?: { id: string; value?: string; slug?: string } | string;
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

export type Product = {
  id: string;
  categoryId: Ref;
  brandId: Ref;
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
  thumbnail?: string | null;
  media?: ProductMedia[];
  variants?: ProductVariant[];
};

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string | null;
  variantId?: string | null;
  variantSku?: string | null;
  unitPrice: number;
  originalPrice?: number | null;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  isActive: boolean;
};

export type CartSummary = {
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
  primaryImage?: string | null;
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

export type PaymentMethod = "COD" | "BANK" | "VNPAY" | "MOMO" | "ZALOPAY";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipping"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned";

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingWard?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  note?: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  productName: string;
  productSku?: string | null;
  variantSku?: string | null;
  variantAttributes?: unknown;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type CheckoutLine = {
  cartItemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type CheckoutSummary = {
  items: CheckoutLine[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  coupon?: { id: string; code: string; name: string } | null;
};

export type CheckoutInput = {
  addressId?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingProvince?: string;
  couponCode?: string;
  shippingFee?: number;
  paymentMethod?: PaymentMethod;
  note?: string;
};

export type BankTransferInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  transferContent: string;
};

export type PaymentSession = {
  payment: { id: string; status: string; amount: number };
  paymentUrl: string | null;
  bankTransferInfo: BankTransferInfo | null;
};

export type CustomerOverview = {
  totalOrders: number;
  ordersByStatus: { status: string; total: number }[];
  totalSpent: number;
  totalReviews: number;
  totalWishlistItems: number;
};

export type AiSearchResult = {
  reply: string;
  appliedFilters?: unknown;
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    totalProducts: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type AiChatResult = {
  conversationId: string;
  title: string;
  answer: string;
  products: Product[];
  createdAt: string;
};
