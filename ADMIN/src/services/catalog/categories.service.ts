
/**
 * FILE: ADMIN/src/services/catalog/categories.service.ts
 */

import { API_ENDPOINTS } from '../api/endpoints';
import { createResourceService } from '../api/resourceService';

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export const categoriesService = createResourceService<
  Category,
  CategoryPayload,
  Partial<CategoryPayload>
>({
  base: API_ENDPOINTS.categories.base,
});
