export interface VariantAttributePayload {
  attributeId: string;
  attributeValueId: string;
}

export interface VariantAttributeRecord {
  _id?: string;
  id?: string;
  variantId: string;
  attributeId:
  | string
  | {
    _id?: string;
    id?: string;
    name?: string;
    slug?: string;
  };
  attributeValueId:
  | string
  | {
    _id?: string;
    id?: string;
    value?: string;
    slug?: string;
  };
}

export interface ProductVariant {
  _id: string;
  id?: string;
  productId: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  weight: number | null;
  image: string | null;
  isActive: boolean;
  attributes?: VariantAttributeRecord[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductVariantPayload {
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  weight?: number | null;
  image?: string | null;
  isActive?: boolean;
  attributes?: VariantAttributePayload[];
}

export interface UpdateVariantStockPayload {
  stockQuantity: number;
}

export interface UpdateVariantStatusPayload {
  isActive: boolean;
}

export interface ProductVariantApiResponse {
  success: boolean;
  message?: string;
  data: ProductVariant;
}

export interface ProductVariantListResponse {
  success: boolean;
  message?: string;
  data: ProductVariant[];
}

export interface ProductVariantMessageResponse {
  success: boolean;
  message: string;
}