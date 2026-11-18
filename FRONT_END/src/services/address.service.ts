import type { AddressInput, UserAddress } from "../types/api.ts";
import { request } from "./http.ts";

const getAddresses = () => request<UserAddress[]>("/api/user-addresses");

const createAddress = (body: AddressInput) =>
  request<UserAddress>("/api/user-addresses", { method: "POST", body });

const updateAddress = (id: string, body: Partial<AddressInput>) =>
  request<UserAddress>(`/api/user-addresses/${id}`, { method: "PATCH", body });

const setDefaultAddress = (id: string) =>
  request<UserAddress>(`/api/user-addresses/${id}/default`, { method: "PATCH" });

const removeAddress = (id: string) => request<null>(`/api/user-addresses/${id}`, { method: "DELETE" });

export const addressService = {
  getAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
};
