import axios from 'axios';
import { getInMemoryAccessToken } from './auth-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface ApiCartItem {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

const getAuthHeaders = () => {
  const token = getInMemoryAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getCartApi = async (): Promise<ApiCartItem[]> => {
  const res = await axios.get(`${API_BASE_URL}/cart`, {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return res.data;
};

export const addItemApi = async (item: {
  productId: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}): Promise<ApiCartItem[]> => {
  const res = await axios.post(`${API_BASE_URL}/cart/items`, item, {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return res.data;
};

export const removeItemApi = async (productId: string): Promise<ApiCartItem[]> => {
  const res = await axios.delete(`${API_BASE_URL}/cart/items/${productId}`, {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
  return res.data;
};

export const clearCartApi = async (): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/cart`, {
    headers: getAuthHeaders(),
    withCredentials: true,
  });
};

export const mergeCartApi = async (
  guestItems: {
    productId: string;
    sku: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }[]
): Promise<ApiCartItem[]> => {
  const res = await axios.post(
    `${API_BASE_URL}/cart/merge`,
    { guestItems },
    {
      headers: getAuthHeaders(),
      withCredentials: true,
    }
  );
  return res.data;
};
