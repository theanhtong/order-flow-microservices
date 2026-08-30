import { authApiClient } from './auth-api';

export interface ApiInventory {
  id: string;
  productId: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAllInventoryApi(): Promise<Record<string, ApiInventory>> {
  try {
    const res = await authApiClient.get<ApiInventory[]>('/inventory');
    const items = Array.isArray(res.data) ? res.data : [];
    const map: Record<string, ApiInventory> = {};
    items.forEach((item) => {
      if (item.productId) {
        map[item.productId] = item;
      }
    });
    return map;
  } catch (err) {
    console.warn('Unable to fetch inventory list:', err);
    return {};
  }
}

export async function updateProductStockApi(productId: string, quantity: number): Promise<ApiInventory | null> {
  try {
    const res = await authApiClient.patch<ApiInventory>(`/inventory/${productId}/stock`, { quantity });
    return res.data;
  } catch (err) {
    console.error('Failed to update product stock:', err);
    throw err;
  }
}
