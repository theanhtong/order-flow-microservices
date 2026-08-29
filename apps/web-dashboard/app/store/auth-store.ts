import { create } from 'zustand';
import axios from 'axios';
import {
  UserProfile,
  loginApi,
  registerApi,
  logoutApi,
  getProfileApi,
  setInMemoryAccessToken,
  setInMemoryUser,
} from '../utils/auth-api';
import { useCartStore } from './cart-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  silentRefresh: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,

  setUser: (user) => {
    setInMemoryUser(user);
    set({ user, isAuthenticated: !!user });
  },

  setAccessToken: (token) => {
    setInMemoryAccessToken(token);
    set({ accessToken: token });
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await loginApi(email, password);
      setInMemoryAccessToken(res.accessToken);
      setInMemoryUser(res.user);
      set({
        user: res.user,
        accessToken: res.accessToken,
        isAuthenticated: true,
      });

      // Merge guest localStorage cart into Redis DB and clear localStorage
      await useCartStore.getState().mergeGuestCartToRedis();
    } finally {
      set({ loading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ loading: true });
    try {
      const res = await registerApi(email, password, fullName);
      setInMemoryAccessToken(res.accessToken);
      setInMemoryUser(res.user);
      set({
        user: res.user,
        accessToken: res.accessToken,
        isAuthenticated: true,
      });

      // Merge guest localStorage cart into Redis DB and clear localStorage
      await useCartStore.getState().mergeGuestCartToRedis();
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    set({ loading: true });
    try {
      await logoutApi();
    } finally {
      setInMemoryAccessToken(null);
      setInMemoryUser(null);
      // Clear in-memory cart display and clear localStorage
      useCartStore.getState().logoutCartCleanUp();
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        loading: false,
      });
    }
  },

  silentRefresh: async () => {
    set({ loading: true });
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newAccessToken = res.data.accessToken;
      setInMemoryAccessToken(newAccessToken);

      const profile = await getProfileApi();
      setInMemoryUser(profile);

      set({
        accessToken: newAccessToken,
        user: profile,
        isAuthenticated: true,
      });

      // Sync latest user cart from Redis DB
      await useCartStore.getState().syncUserCartFromRedis();
    } catch {
      setInMemoryAccessToken(null);
      setInMemoryUser(null);
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
