
/**
 * FILE: ADMIN/src/services/catalog/brands.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface Brand {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  logo?: string;
  isActive?: boolean;
}

export type BrandPayload = Omit<Brand, '_id'>;

export const brandsService = createResourceService<
  Brand,
  BrandPayload,
  Partial<BrandPayload>
>({
  base: API_ENDPOINTS.brands.base,
});
