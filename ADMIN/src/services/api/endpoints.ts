
/**
 * FILE: ADMIN/src/services/api/endpoints.ts
 *
 * Quản lý tập trung các API endpoint.
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
    detail: (id: string) => `/admin/customers/${encodeURIComponent(id)}`,
    status: (id: string) => `/admin/customers/${encodeURIComponent(id)}/status`,
  },

  products: {
    // Public API
    list: '/products',
    detail: (id: string) => `/products/${encodeURIComponent(id)}`,
    featured: '/products/featured',
    related: (id: string) => `/products/related/${encodeURIComponent(id)}`,
    bySlug: (slug: string) => `/products/slug/${encodeURIComponent(slug)}`,

    // Admin API
    adminList: '/admin/products/all',
    adminDetail: (id: string) =>
      `/admin/products/${encodeURIComponent(id)}`,
    create: '/admin/products',
    update: (id: string) =>
      `/admin/products/${encodeURIComponent(id)}`,
    status: (id: string) =>
      `/admin/products/${encodeURIComponent(id)}/status`,
    featuredStatus: (id: string) =>
      `/admin/products/${encodeURIComponent(id)}/featured`,
    delete: (id: string) =>
      `/admin/products/${encodeURIComponent(id)}`,
  },

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
    // Public
    base: '/brands',

    // Admin
    adminList: '/admin/brands/all',
    adminDetail: (id: string) =>
      `/admin/brands/${encodeURIComponent(id)}`,
    create: '/admin/brands',
    update: (id: string) =>
      `/admin/brands/${encodeURIComponent(id)}`,
    status: (id: string) =>
      `/admin/brands/${encodeURIComponent(id)}/status`,
    delete: (id: string) =>
      `/admin/brands/${encodeURIComponent(id)}`,
  },

  attributes: {
    // Public
    base: '/attributes',
    detail: (id: string) =>
      `/attributes/${encodeURIComponent(id)}`,

    // Admin
    adminBase: '/admin/attributes',
    create: '/admin/attributes',
    update: (id: string) =>
      `/admin/attributes/${encodeURIComponent(id)}`,
    delete: (id: string) =>
      `/admin/attributes/${encodeURIComponent(id)}`,

    createValue: (id: string) =>
      `/admin/attributes/${encodeURIComponent(id)}/values`,

    updateValue: (valueId: string) =>
      `/admin/attributes/values/${encodeURIComponent(valueId)}`,

    deleteValue: (valueId: string) =>
      `/admin/attributes/values/${encodeURIComponent(valueId)}`,
  },

  attributeValues: {
    base: '/attribute-values',
  },

  productVariants: {
    adminListByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/variants`,

    adminCreateByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/variants`,

    adminUpdate: (id: string) =>
      `/admin/variants/${encodeURIComponent(id)}`,

    adminUpdateStock: (id: string) =>
      `/admin/variants/${encodeURIComponent(id)}/stock`,

    adminUpdateStatus: (id: string) =>
      `/admin/variants/${encodeURIComponent(id)}/status`,

    adminDelete: (id: string) =>
      `/admin/variants/${encodeURIComponent(id)}`,
  },

  productMedia: {
    // Lấy danh sách media theo sản phẩm.
    adminListByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media`,

    // Tạo một media bằng URL.
    adminCreateByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media`,

    // Tạo nhiều media bằng URL.
    adminCreateBatchByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media/batch`,

    // Upload một hoặc nhiều ảnh từ máy tính.
    adminUploadByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media/upload`,

    // Cập nhật media.
    adminUpdate: (id: string) =>
      `/admin/media/${encodeURIComponent(id)}`,

    // Đặt ảnh chính.
    adminSetPrimary: (id: string) =>
      `/admin/media/${encodeURIComponent(id)}/primary`,

    // Cập nhật thứ tự media.
    adminUpdateSortOrder: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media/sort-order`,

    // Xóa một media.
    adminDelete: (id: string) =>
      `/admin/media/${encodeURIComponent(id)}`,

    // Xóa toàn bộ media của sản phẩm.
    adminDeleteByProduct: (productId: string) =>
      `/admin/products/${encodeURIComponent(productId)}/media`,
  },

  variantAttributes: {
    base: '/variant-attributes',
  },

  inventory: {
    base: '/admin/inventory',
  },

  orders: {
    // GET /admin/orders
    base: '/admin/orders',
  },

  orderItems: {
    // GET /admin/order-items
    base: '/admin/order-items',
  },

  payments: {
    base: '/admin/payments',
  },

  coupons: {
    // Admin Coupons API
    // GET/POST /admin/coupons
    base: '/admin/coupons',

    // GET/PUT/DELETE /admin/coupons/:id
    detail: (id: string) =>
      `/admin/coupons/${encodeURIComponent(id)}`,

    // PATCH /admin/coupons/:id/status
    status: (id: string) =>
      `/admin/coupons/${encodeURIComponent(id)}/status`,

    // GET /admin/coupons/:id/usages
    usages: (id: string) =>
      `/admin/coupons/${encodeURIComponent(id)}/usages`,
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
