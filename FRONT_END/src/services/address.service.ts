import { request } from "./http.ts";
import type { UserAddress } from "../types/api.ts";

export type AddressInput = {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  province?: string;
  isDefault?: boolean;
};

const getAddresses = () => {
  return request<UserAddress[]>("/api/user-addresses");
};

const createAddress = (body: AddressInput) => {
  return request<UserAddress>("/api/user-addresses", { method: "POST", body });
};

const updateAddress = (id: string, body: Partial<AddressInput>) => {
  return request<UserAddress>(`/api/user-addresses/${id}`, { method: "PATCH", body });
};

const setDefaultAddress = (id: string) => {
  return request<UserAddress>(`/api/user-addresses/${id}/default`, { method: "PATCH" });
};

const removeAddress = (id: string) => {
  return request<null>(`/api/user-addresses/${id}`, { method: "DELETE" });
};

export const addressService = {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
};
