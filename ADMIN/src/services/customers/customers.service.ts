
/**
 * FILE: ADMIN/src/services/customers/customers.service.ts
 */

import { httpClient } from '../api/httpClient';
import { API_ENDPOINTS } from '../api/endpoints';
import type { QueryParams } from '../api/api.types';

export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface CustomerListParams {
  keyword?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateCustomerStatusPayload {
  status: CustomerStatus;
}

export const customersService = {
  getCustomers(params: CustomerListParams = {}) {
    return httpClient.get<unknown>(API_ENDPOINTS.customers.list, {
      params: params as QueryParams,
    });
  },

  getCustomerById(id: string) {
    return httpClient.get<unknown>(API_ENDPOINTS.customers.detail(id));
  },

  updateCustomerStatus(
    id: string,
    payload: UpdateCustomerStatusPayload,
  ) {
    return httpClient.patch<unknown>(
      API_ENDPOINTS.customers.status(id),
      payload,
    );
  },
};
