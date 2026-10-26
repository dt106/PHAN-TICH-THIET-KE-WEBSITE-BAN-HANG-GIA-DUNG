
/**
 * FILE: ADMIN/src/services/api/endpoints.ts
 *
 * Các route Admin đã biết và những route cần đối chiếu.
 */

export const API_ENDPOINTS = {
  auth: {
    login: '/admin/auth/login',
    forgotPassword: '/admin/auth/forgot-password',
    resetPassword: '/admin/auth/reset-password',
    changePassword: '/admin/auth/change-password',
    me: '/admin/auth/me',
    profile: '/admin/auth/profile',
    requestChangeEmailOtp: '/admin/auth/change-email/request-otp',
    verifyChangeEmailOtp: '/admin/auth/change-email/verify',
    logout: '/admin/auth/logout',
  },

  customers: {
    list: '/admin/customers',
    detail: (id: string) => `/admin/customers/${id}`,
    status: (id: string) => `/admin/customers/${id}/status`,
  },

  products: {
    list: '/products',
    detail: (id: string) => `/products/${id}`,
    featured: '/products/featured',
    related: (id: string) => `/products/related/${id}`,
    bySlug: (slug: string) => `/products/slug/${encodeURIComponent(slug)}`,
    adminList: '/products/admin/all',
    adminDetail: (id: string) => `/products/admin/${id}`,
    create: '/products/admin',
    update: (id: string) => `/products/admin/${id}`,
    status: (id: string) => `/products/admin/${id}/status`,
    featuredStatus: (id: string) => `/products/admin/${id}/featured`,
    delete: (id: string) => `/products/admin/${id}`,
  },

  // Các nhóm dưới đây cần đối chiếu với file routes backend
  // trước khi sử dụng trên môi trường thật.
  dashboard: {
    overview: '/admin/dashboard/overview',
    revenue: '/admin/dashboard/revenue',
    orders: '/admin/dashboard/orders',
    products: '/admin/dashboard/products',
    customers: '/admin/dashboard/customers',
  },

  categories: {
    base: '/categories',
  },

  brands: {
    base: '/brands',
  },

  attributes: {
    base: '/attributes',
  },

  attributeValues: {
    base: '/attribute-values',
  },

  productVariants: {
    base: '/product-variants',
  },

  productMedia: {
    base: '/product-media',
  },

  variantAttributes: {
    base: '/variant-attributes',
  },

  inventory: {
    base: '/admin/inventory',
  },

  orders: {
    base: '/admin/orders',
  },

  orderItems: {
    base: '/admin/order-items',
  },

  payments: {
    base: '/admin/payments',
  },

  coupons: {
    base: '/coupons',
  },

  reviews: {
    base: '/admin/reviews',
  },

  conversations: {
    base: '/admin/conversations',
  },

  notifications: {
    base: '/admin/notifications',
  },

  announcements: {
    base: '/admin/announcements',
  },
} as const;
