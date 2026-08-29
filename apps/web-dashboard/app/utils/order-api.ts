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
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  note?: string;
  createdAt: string;
}

export interface ApiOrder {
  id: string;
  customerId: string;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  cancelReason?: string;
  items: ApiOrderItem[];
  statusHistory?: ApiOrderStatusHistory[];
  createdAt: string;
  updatedAt?: string;
  recipientName?: string;
  phone?: string;
  shippingAddress?: string;
}

export interface CreateOrderPayload {
  customerId?: string;
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
    (productsResult.data || []).forEach((p) => {
      productMap.set(p.id, p.name);
    });

    return (ordersResponse.data || []).map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount || 0),
      items: (order.items || []).map((item) => ({
        ...item,
        price: Number(item.price || 0),
        productName: productMap.get(item.productId) || item.productName || `Product (${item.productId.substring(0, 8)})`,
      })),
      statusHistory: order.statusHistory || [],
    }));
  } catch (error) {
    console.error('Failed to fetch user orders:', error);
    throw error;
  }
}

export async function updateOrderStatusApi(
  orderId: string,
  status: 'CONFIRMED' | 'CANCELLED',
  cancelReason?: string
): Promise<ApiOrder> {
  try {
    const response = await authApiClient.patch<ApiOrder>(
      `/orders/${orderId}/status`,
      { status, cancelReason }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update order #${orderId} status:`, error);
    throw error;
  }
}
