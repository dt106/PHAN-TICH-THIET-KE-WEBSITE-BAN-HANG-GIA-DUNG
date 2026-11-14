
export type PaymentMethod =
  | 'COD'
  | 'BANK'
  | 'MOMO'
  | 'VNPAY'
  | 'ZALOPAY';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export interface PaymentOrder {
  _id: string;
  orderNumber?: string;
  customerName?: string;
  status?: string;
}

export interface Payment {
  _id: string;
  orderId: PaymentOrder | string;

  paymentMethod: PaymentMethod;
  transactionCode?: string | null;
  gatewayOrderId?: string | null;

  amount: number;
  currency: string;
  orderInfo?: string | null;
  paymentUrl?: string | null;
  expiredAt?: string | null;

  status: PaymentStatus;
  gatewayResponse?: unknown;
  failedReason?: string | null;

  refundAmount: number;
  refundedAt?: string | null;
  refundTransactionCode?: string | null;

  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentSummary {
  totalPaidAmount: number;
  totalPaidCount: number;
  totalRefundedAmount: number;
}

export interface PaymentListResponse {
  success: boolean;
  message?: string;
  data: Payment[];
  pagination: PaymentPagination;
  summary: PaymentSummary;
}

export interface PaymentRefundPayload {
  amount?: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  message?: string;
  data: Payment;
}

export interface PaymentListParams {
  paymentMethod?: PaymentMethod;
  status?: PaymentStatus;
  orderId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
