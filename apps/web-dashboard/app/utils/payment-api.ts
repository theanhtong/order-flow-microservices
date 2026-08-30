import { authApiClient } from './auth-api';

export type PaymentMethodType = 'COD' | 'BANK_QR' | 'VNPAY' | 'MOMO' | 'CREDIT_CARD';
export type PaymentStatusType = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface ApiPayment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  status: PaymentStatusType;
  transactionId: string;
  paymentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchPaymentByOrderIdApi(orderId: string): Promise<ApiPayment | null> {
  try {
    const response = await authApiClient.get<ApiPayment>(`/payments/order/${orderId}`);
    return response.data;
  } catch {
    return null;
  }
}

export async function refundPaymentApi(paymentId: string): Promise<ApiPayment> {
  try {
    const response = await authApiClient.post<ApiPayment>(`/payments/${paymentId}/refund`);
    return response.data;
  } catch (error) {
    console.error(`Failed to refund payment #${paymentId}:`, error);
    throw error;
  }
}

export async function cancelPaymentByOrderIdApi(orderId: string, reason?: string): Promise<ApiPayment | null> {
  try {
    const response = await authApiClient.post<ApiPayment>(`/payments/order/${orderId}/cancel`, { reason });
    return response.data;
  } catch {
    return null;
  }
}
