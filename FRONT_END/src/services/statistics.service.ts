import { request } from "./http.ts";
import type { CustomerOverview } from "../types/api.ts";

const getCustomerOverview = () => {
  return request<CustomerOverview>("/api/customer/statistics/overview");
};

export const statisticsService = {
  getCustomerOverview,
};
