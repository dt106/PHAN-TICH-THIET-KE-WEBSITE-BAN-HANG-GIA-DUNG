
/**
 * FILE: ADMIN/src/services/catalog/productVariants.service.ts
 *
 * Đối chiếu route và field của ProductVariant trong backend.
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface ProductVariant {
  _id: string;
  productId: string;
  sku?: string;
  price?: number;
  stock?: number;
  isActive?: boolean;
}

export type ProductVariantPayload = Omit<ProductVariant, '_id'>;

export const productVariantsService = createResourceService<
  ProductVariant,
  ProductVariantPayload,
  Partial<ProductVariantPayload>
>({
  base: API_ENDPOINTS.productVariants.base,
});
