import { authApiClient } from './auth-api';

export interface SystemUser {
  id: string;
  email: string;
  fullName?: string;
  role: 'CUSTOMER' | 'OPERATOR' | 'SYSTEM_ADMIN';
  isActive: boolean;
  createdAt: string;
}

export async function fetchAdminUsersApi(): Promise<SystemUser[]> {
  try {
    const response = await authApiClient.get<SystemUser[]>('/auth/admin/users');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch admin users:', error);
    throw error;
  }
}

export async function updateAdminUserStatusApi(
  userId: string,
  isActive: boolean
): Promise<SystemUser> {
  try {
    const response = await authApiClient.patch<SystemUser>(
      `/auth/admin/users/${userId}/status`,
      { isActive }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to update user status for ${userId}:`, error);
    throw error;
  }
}

export async function deleteAdminUserApi(userId: string): Promise<void> {
  try {
    await authApiClient.delete(`/auth/admin/users/${userId}`);
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
    throw error;
  }
}

export async function remoteLogoutUserApi(userId: string): Promise<void> {
  try {
    await authApiClient.post(`/auth/admin/users/${userId}/logout`);
  } catch (error) {
    console.error(`Failed to logout user ${userId}:`, error);
    throw error;
  }
}
