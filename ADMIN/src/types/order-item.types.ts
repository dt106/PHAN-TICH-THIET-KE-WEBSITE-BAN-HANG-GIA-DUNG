
/**
 * Order item document từ MongoDB.
 */
export interface OrderItem {
  _id: string;
  orderId: string;

  productId: string;
  variantId: string | null;

  productName: string;
  productSku: string | null;

  variantSku: string | null;
  variantAttributes: string | null;

  quantity: number;

  unitPrice: number;
  discountAmount: number;
  totalPrice: number;

  createdAt: string | null;
}

export interface OrderItemsResponse {
  success: boolean;
  message?: string;
  data: OrderItem[];

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  summary?: {
    totalQuantity: number;
    totalRevenue: number;
  };
}
