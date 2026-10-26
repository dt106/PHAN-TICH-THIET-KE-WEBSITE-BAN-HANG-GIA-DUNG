
/**
 * FILE: ADMIN/src/services/api/resourceService.ts
 *
 * Bộ hàm CRUD dùng chung.
 * Chỉ sử dụng cho nghiệp vụ có route tương thích với cấu hình truyền vào.
 */

import { httpClient } from './httpClient';
import type { QueryParams } from './api.types';

export interface ResourceEndpoints {
  base: string;
  detail?: (id: string) => string;
  create?: string;
  update?: (id: string) => string;
  remove?: (id: string) => string;
}

export function createResourceService<TItem, TCreate = Partial<TItem>, TUpdate = Partial<TItem>>(
  endpoints: ResourceEndpoints,
) {
  return {
    getList(params?: QueryParams) {
      return httpClient.get<unknown>(endpoints.base, { params });
    },

    getById(id: string) {
      const path = endpoints.detail
        ? endpoints.detail(id)
        : `${endpoints.base}/${encodeURIComponent(id)}`;

      return httpClient.get<TItem>(path);
    },

    create(payload: TCreate) {
      return httpClient.post<TItem>(
        endpoints.create ?? endpoints.base,
        payload,
      );
    },

    update(id: string, payload: TUpdate) {
      const path = endpoints.update
        ? endpoints.update(id)
        : `${endpoints.base}/${encodeURIComponent(id)}`;

      return httpClient.put<TItem>(path, payload);
    },

    remove(id: string) {
      const path = endpoints.remove
        ? endpoints.remove(id)
        : `${endpoints.base}/${encodeURIComponent(id)}`;

      return httpClient.delete<unknown>(path);
    },
  };
}
