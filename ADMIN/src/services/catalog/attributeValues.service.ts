
/**
 * FILE: ADMIN/src/services/catalog/attributeValues.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface AttributeValue {
  _id: string;
  attributeId: string;
  value: string;
  label?: string;
}

export type AttributeValuePayload = Omit<AttributeValue, '_id'>;

export const attributeValuesService = createResourceService<
  AttributeValue,
  AttributeValuePayload,
  Partial<AttributeValuePayload>
>({
  base: API_ENDPOINTS.attributeValues.base,
});
