import { authApiClient } from './auth-api';

export type ShipmentStatusType =
  | 'READY_TO_PICK'
  | 'PICKING'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'DELIVERY_FAIL';

export interface ApiShipment {
  id: string;
  orderId: string;
  status: ShipmentStatusType;
  carrierCode: string;
  trackingCode: string;
  recipientName?: string;
  phone?: string;
  address?: string;
  toWardCode?: string;
  toDistrictId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
}

export interface GhnDistrict {
  DistrictID: number;
  DistrictName: string;
  ProvinceID: number;
}

export interface GhnWard {
  WardCode: string;
  WardName: string;
  DistrictID: number;
}

export async function fetchShipmentByOrderIdApi(orderId: string): Promise<ApiShipment | null> {
  try {
    const response = await authApiClient.get<ApiShipment>(`/shipments/order/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch shipment for Order #${orderId}:`, error);
    return null;
  }
}

export async function updateShipmentStatusApi(
  orderId: string,
  status: ShipmentStatusType,
  trackingCode?: string,
  carrierCode?: string,
  toWardCode?: string,
  toDistrictId?: number,
  address?: string,
  recipientName?: string,
  phone?: string
): Promise<ApiShipment> {
  try {
    const response = await authApiClient.patch<ApiShipment>(
      `/shipments/order/${orderId}/status`,
      {
        status,
        trackingCode,
        carrierCode,
        toWardCode,
        toDistrictId,
        address,
        recipientName,
        phone,
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update shipment status for Order #${orderId}:`, error);
    throw error;
  }
}

export async function fetchGhnProvincesApi(): Promise<GhnProvince[]> {
  try {
    const response = await authApiClient.get<GhnProvince[]>('/shipments/ghn/provinces');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch GHN Provinces:', error);
    return [];
  }
}

export async function fetchGhnDistrictsApi(provinceId: number): Promise<GhnDistrict[]> {
  try {
    const response = await authApiClient.get<GhnDistrict[]>(
      `/shipments/ghn/districts?provinceId=${provinceId}`
    );
    return response.data || [];
  } catch (error) {
    console.error(`Failed to fetch GHN Districts for Province #${provinceId}:`, error);
    return [];
  }
}

export async function fetchGhnWardsApi(districtId: number): Promise<GhnWard[]> {
  try {
    const response = await authApiClient.get<GhnWard[]>(
      `/shipments/ghn/wards?districtId=${districtId}`
    );
    return response.data || [];
  } catch (error) {
    console.error(`Failed to fetch GHN Wards for District #${districtId}:`, error);
    return [];
  }
}
