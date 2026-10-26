
/**
 * FILE: ADMIN/src/services/catalog/variantAttributes.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface VariantAttribute {
  _id: string;
  variantId: string;
  attributeId: string;
  attributeValueId: string;
}

export type VariantAttributePayload = Omit<VariantAttribute, '_id'>;

export const variantAttributesService = createResourceService<
  VariantAttribute,
  VariantAttributePayload,
  Partial<VariantAttributePayload>
>({
  base: API_ENDPOINTS.variantAttributes.base,
});
