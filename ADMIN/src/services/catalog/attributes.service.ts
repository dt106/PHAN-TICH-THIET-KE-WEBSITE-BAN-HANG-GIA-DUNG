
/**
 * FILE: ADMIN/src/services/catalog/attributes.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface ProductAttribute {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export type AttributePayload = Omit<ProductAttribute, '_id'>;

export const attributesService = createResourceService<
  ProductAttribute,
  AttributePayload,
  Partial<AttributePayload>
>({
  base: API_ENDPOINTS.attributes.base,
});
