import { authApiClient } from './auth-api';

export interface UserAddress {
  id: string;
  recipientName: string;
  phone: string;
  address: string;
  note?: string;
  isDefault?: boolean;
}

export interface CreateAddressPayload {
  recipientName: string;
  phone: string;
  address: string;
  note?: string;
  isDefault?: boolean;
}

export interface UpdateAddressPayload {
  recipientName?: string;
  phone?: string;
  address?: string;
  note?: string;
  isDefault?: boolean;
}

export async function fetchUserAddressesApi(): Promise<UserAddress[]> {
  try {
    const res = await authApiClient.get('/auth/addresses');
    return res.data;
  } catch (err) {
    console.warn('Failed to fetch addresses from backend:', err);
    return [];
  }
}

export async function createAddressApi(payload: CreateAddressPayload): Promise<UserAddress> {
  const res = await authApiClient.post('/auth/addresses', payload);
  return res.data;
}

export async function updateAddressApi(id: string, payload: UpdateAddressPayload): Promise<UserAddress> {
  const res = await authApiClient.put(`/auth/addresses/${id}`, payload);
  return res.data;
}

export async function deleteAddressApi(id: string): Promise<{ message: string }> {
  const res = await authApiClient.delete(`/auth/addresses/${id}`);
  return res.data;
}

export async function setDefaultAddressApi(id: string): Promise<UserAddress> {
  const res = await authApiClient.patch(`/auth/addresses/${id}/default`);
  return res.data;
}
