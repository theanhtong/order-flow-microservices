import axios from 'axios';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// In-Memory Token & User Storage (Secured against XSS token theft)
let inMemoryAccessToken: string | null = null;
let inMemoryUser: UserProfile | null = null;

export const setInMemoryAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getInMemoryAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

export const setInMemoryUser = (user: UserProfile | null) => {
  inMemoryUser = user;
};

export const getInMemoryUser = (): UserProfile | null => {
  return inMemoryUser;
};

export const authApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enables browser HttpOnly Cookie transport
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach In-Memory Access Token
authApiClient.interceptors.request.use(
  (config) => {
    const token = getInMemoryAccessToken();
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Token Refresh via HttpOnly Cookie on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

authApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return authApiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Send HttpOnly cookie automatically with refresh request
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = refreshResponse.data;
        setInMemoryAccessToken(accessToken);

        processQueue(null, accessToken);

        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return authApiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setInMemoryAccessToken(null);
        setInMemoryUser(null);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API Endpoints
export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await authApiClient.post('/auth/login', { email, password });
  const data = response.data;
  setInMemoryAccessToken(data.accessToken);
  setInMemoryUser(data.user);
  return data;
}

export async function registerApi(email: string, password: string, fullName?: string): Promise<AuthResponse> {
  const response = await authApiClient.post('/auth/register', { email, password, fullName });
  const data = response.data;
  setInMemoryAccessToken(data.accessToken);
  setInMemoryUser(data.user);
  return data;
}

export async function logoutApi(): Promise<void> {
  try {
    await authApiClient.post('/auth/logout', {});
  } catch {
    // Ignore logout failure
  }
  setInMemoryAccessToken(null);
  setInMemoryUser(null);
}

export async function getProfileApi(): Promise<UserProfile> {
  const response = await authApiClient.get('/auth/me');
  const user = response.data;
  setInMemoryUser(user);
  return user;
}
