import type {
  AiChatReply,
  AiConversationDetail,
  AiConversationSummary,
  AiSearchResult,
  Attribute,
  AuthResult,
  Brand,
  CartPayload,
  Category,
  CheckoutSummary,
  Coupon,
  CouponCheck,
  CreatePaymentResult,
  Customer,
  CustomerOverview,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentRecord,
  ProductDetail,
  ProductListItem,
  StatusCount,
  UserAddress,
  WishlistItem,
} from "../types/api.ts";
import { request, type Pagination } from "./http.ts";

export type Page<T> = { items: T[]; pagination?: Pagination; message: string };

function pageOf<T>(result: { data: T[]; pagination?: Pagination; message: string }): Page<T> {
  return { items: result.data ?? [], pagination: result.pagination, message: result.message };
}

export const authApi = {
  requestRegisterOtp(email: string) {
    return request<undefined>("/api/customer/register/request-otp", {
      body: { email },
      auth: false,
    });
  },
  verifyRegisterOtp(email: string, otp: string) {
    return request<undefined>("/api/customer/register/verify-otp", {
      body: { email, otp },
      auth: false,
    });
  },
  register(body: {
    email: string;
    name: string;
    phone?: string;
    password: string;
    confirmPassword: string;
  }) {
    return request<AuthResult>("/api/customer/register", { body, auth: false });
  },
  login(email: string, password: string) {
    return request<AuthResult>("/api/customer/login", {
      body: { email, password },
      auth: false,
    });
  },
  forgotPassword(email: string) {
    return request<undefined>("/api/customer/forgot-password", { body: { email }, auth: false });
  },
  resetPassword(body: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return request<undefined>("/api/customer/reset-password", { body, auth: false });
  },
  me() {
    return request<{ user: Customer }>("/api/customer/me");
  },
  changePassword(body: { currentPassword: string; newPassword: string; confirmPassword: string }) {
    return request<undefined>("/api/customer/change-password", { body });
  },
  updateProfile(form: FormData) {
    return request<{ user: Customer }>("/api/customer/profile", { method: "PATCH", form });
  },
  logout() {
    return request<undefined>("/api/customer/logout", { method: "POST" });
  },
};

export const catalogApi = {
  async categories(params: Record<string, string | number | undefined> = {}) {
    const result = await request<Category[]>(`/api/categories${qs(params)}`, { auth: false });
    return pageOf(result);
  },
  categoryTree() {
    return request<Category[]>("/api/categories/tree", { auth: false });
  },
  async brands(params: Record<string, string | number | undefined> = {}) {
    const result = await request<Brand[]>(`/api/brands${qs(params)}`, { auth: false });
    return pageOf(result);
  },
  attributes() {
    return request<Attribute[]>("/api/attributes", { auth: false });
  },
  async products(params: Record<string, string | number | undefined> = {}) {
    const result = await request<ProductListItem[]>(`/api/products${qs(params)}`, { auth: false });
    return pageOf(result);
  },
  async featured(limit = 8) {
    const result = await request<ProductListItem[]>(`/api/products/featured?limit=${limit}`, {
      auth: false,
    });
    return pageOf(result);
  },
  async related(id: string, limit = 4) {
    const result = await request<ProductListItem[]>(`/api/products/related/${id}?limit=${limit}`, {
      auth: false,
    });
    return pageOf(result);
  },
  productBySlug(slug: string) {
    return request<ProductDetail>(`/api/products/slug/${encodeURIComponent(slug)}`, { auth: false });
  },
  productById(id: string) {
    return request<ProductDetail>(`/api/products/${id}`, { auth: false });
  },
};

export const cartApi = {
  get() {
    return request<CartPayload>("/api/cart");
  },
  add(body: { productId: string; variantId?: string | null; quantity?: number }) {
    return request<unknown>("/api/cart", { body });
  },
  update(id: string, quantity: number) {
    return request<unknown>(`/api/cart/${id}`, { method: "PUT", body: { quantity } });
  },
  remove(id: string) {
    return request<undefined>(`/api/cart/${id}`, { method: "DELETE" });
  },
  clear() {
    return request<undefined>("/api/cart", { method: "DELETE" });
  },
};

export const wishlistApi = {
  list() {
    return request<WishlistItem[]>("/api/wishlist");
  },
  add(productId: string) {
    return request<unknown>("/api/wishlist", { body: { productId } });
  },
  check(productId: string) {
    return request<{ isInWishlist: boolean; wishlistId?: string | null }>(
      `/api/wishlist/check/${productId}`,
    );
  },
  moveToCart(id: string, body?: { variantId?: string | null; quantity?: number }) {
    return request<unknown>(`/api/wishlist/${id}/move-to-cart`, { body: body ?? {} });
  },
  remove(id: string) {
    return request<undefined>(`/api/wishlist/${id}`, { method: "DELETE" });
  },
  removeByProduct(productId: string) {
    return request<undefined>(`/api/wishlist/product/${productId}`, { method: "DELETE" });
  },
  clear() {
    return request<undefined>("/api/wishlist", { method: "DELETE" });
  },
};

export const couponApi = {
  publicList() {
    return request<Coupon[]>("/api/coupons/public", { auth: false });
  },
  check(code: string, orderAmount: number) {
    return request<CouponCheck>("/api/coupons/check", { body: { code, orderAmount } });
  },
};

export const addressApi = {
  list() {
    return request<UserAddress[]>("/api/user-addresses");
  },
  create(body: {
    recipientName: string;
    phone: string;
    addressLine: string;
    ward?: string;
    district?: string;
    province?: string;
    isDefault?: boolean;
  }) {
    return request<UserAddress>("/api/user-addresses", { body });
  },
  update(id: string, body: Partial<UserAddress>) {
    return request<UserAddress>(`/api/user-addresses/${id}`, { method: "PATCH", body });
  },
  setDefault(id: string) {
    return request<UserAddress>(`/api/user-addresses/${id}/default`, { method: "PATCH" });
  },
  remove(id: string) {
    return request<undefined>(`/api/user-addresses/${id}`, { method: "DELETE" });
  },
};

export type CheckoutBody = {
  addressId?: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingWard?: string;
  shippingDistrict?: string;
  shippingProvince?: string;
  selectedCartItemIds?: string[];
  couponCode?: string;
  shippingFee?: number;
  paymentMethod?: PaymentMethod;
  note?: string;
};

export const checkoutApi = {
  preview(body: CheckoutBody) {
    return request<CheckoutSummary>("/api/checkout/preview", { body });
  },
  place(body: CheckoutBody & { paymentMethod: PaymentMethod }) {
    return request<{ order: Order; items: OrderItem[] }>("/api/checkout", { body });
  },
};

export const orderApi = {
  async mine(params: { status?: string; page?: number; limit?: number } = {}) {
    const result = await request<Order[]>(`/api/orders/my-orders${qs(params)}`);
    return pageOf(result);
  },
  detail(id: string) {
    return request<Order>(`/api/orders/${id}`);
  },
  items(id: string) {
    return request<OrderItem[]>(`/api/orders/${id}/items`);
  },
  cancel(id: string) {
    return request<Order>(`/api/orders/${id}/cancel`, { method: "PUT" });
  },
  confirmDelivery(id: string) {
    return request<Order>(`/api/orders/${id}/confirm-delivery`, { method: "PUT" });
  },
};

export const paymentApi = {
  create(orderId: string) {
    return request<CreatePaymentResult>("/api/payments", { body: { orderId } });
  },
  mine() {
    return request<PaymentRecord[]>("/api/payments/my-payments");
  },
  mockComplete(orderNumber: string, success = true) {
    return request<unknown>("/api/payments/mock/complete", {
      body: { orderNumber, success },
      auth: false,
    });
  },
};

export const statsApi = {
  overview() {
    return request<CustomerOverview>("/api/customer/statistics/overview");
  },
  orders() {
    return request<{ totalOrders: number; ordersByStatus: StatusCount[] }>(
      "/api/customer/statistics/orders",
    );
  },
  reviews() {
    return request<{ totalReviews: number }>("/api/customer/statistics/reviews");
  },
};

export const aiApi = {
  search(query: string, page = 1, limit = 8) {
    return request<AiSearchResult>("/api/ai/products/search", {
      body: { query, page, limit },
      auth: false,
    });
  },
  chat(body: { message: string; conversationId?: string; sessionId: string }) {
    return request<AiChatReply>("/api/ai/chat", { body, auth: false });
  },
  conversations(sessionId: string) {
    return request<AiConversationSummary[]>(
      `/api/ai/chat/conversations?sessionId=${encodeURIComponent(sessionId)}`,
      { auth: false },
    );
  },
  conversation(id: string, sessionId: string) {
    return request<AiConversationDetail>(
      `/api/ai/chat/conversations/${id}?sessionId=${encodeURIComponent(sessionId)}`,
      { auth: false },
    );
  },
  deleteConversation(id: string, sessionId: string) {
    return request<undefined>(
      `/api/ai/chat/conversations/${id}?sessionId=${encodeURIComponent(sessionId)}`,
      { method: "DELETE", auth: false },
    );
  },
};

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
