import { authApiClient } from './auth-api';
import { getProducts } from './product-api';

export interface ApiOrderItem {
  id?: string;
  productId: string;
  quantity: number;
  price: number;
  productName?: string;
}

export interface ApiOrderStatusHistory {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  note?: string;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  customerId: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  cancelReason?: string;
  items: ApiOrderItem[];
  statusHistory?: ApiOrderStatusHistory[];
  createdAt: string;
  updatedAt?: string;
  recipientName?: string;
  phone?: string;
  shippingAddress?: string;
  toWardCode?: string;
  toDistrictId?: number;
  paymentMethod?: string;
}

export interface CreateOrderPayload {
  customerId?: string;
  recipientName?: string;
  phone?: string;
  shippingAddress?: string;
  toWardCode?: string;
  toDistrictId?: number;
  paymentMethod?: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
}

export async function createOrderApi(payload: CreateOrderPayload): Promise<ApiOrder> {
  try {
    const response = await authApiClient.post<ApiOrder>('/orders', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
}

export async function fetchUserOrdersApi(): Promise<ApiOrder[]> {
  try {
    const [ordersResponse, productsResult] = await Promise.all([
      authApiClient.get<ApiOrder[]>('/orders'),
      getProducts().catch(() => ({ data: [] })),
    ]);

    const productMap = new Map<string, string>();
    if (productsResult && productsResult.data) {
      productsResult.data.forEach((p) => {
        productMap.set(p.id, p.name);
      });
    }

    const orders = ordersResponse.data.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        productName: productMap.get(item.productId) || item.productId,
      })),
    }));

    return orders;
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    throw error;
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED',
  cancelReason?: string,
): Promise<ApiOrder> {
  try {
    const response = await authApiClient.patch<ApiOrder>(`/orders/${orderId}/status`, {
      status,
      cancelReason,
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to update order status for Order #${orderId}:`, error);
    throw error;
  }
}
