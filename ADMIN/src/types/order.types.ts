export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipping'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type PaymentMethod =
  | 'COD'
  | 'BANK'
  | 'MOMO'
  | 'VNPAY'
  | 'ZALOPAY';

/**
 * Order document từ MongoDB.
 * Backend trả về _id và các field camelCase.
 */
export interface Order {
  _id: string;

  orderNumber: string;

  userId: string | null;
  couponId: string | null;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  shippingAddress: string;
  shippingWard: string | null;
  shippingDistrict: string | null;
  shippingProvince: string | null;

  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;

  note: string | null;

  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  success: boolean;
  message?: string;
  data: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: Record<string, unknown>;
}

export interface OrderDetailResponse {
  success: boolean;
  message?: string;
  data: {
    order: Order;
    itemCount: number;
  };
}