'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserProfile,
  loginApi,
  registerApi,
  logoutApi,
  getProfileApi,
  setInMemoryAccessToken,
  setInMemoryUser,
  getInMemoryAccessToken,
  getInMemoryUser,
} from '../utils/auth-api';

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const silentRefresh = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const newAccessToken = res.data.accessToken;
      setInMemoryAccessToken(newAccessToken);
      setAccessToken(newAccessToken);

      const profile = await getProfileApi();
      setUser(profile);
      setInMemoryUser(profile);
    } catch {
      setInMemoryAccessToken(null);
      setInMemoryUser(null);
      setUser(null);
      setAccessToken(null);
    }
  };

  useEffect(() => {
    async function initAuth() {
      await silentRefresh();
      setLoading(false);
    }
    initAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await loginApi(email, password);
      setUser(res.user);
      setAccessToken(res.accessToken);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const res = await registerApi(email, password, fullName);
      setUser(res.user);
      setAccessToken(res.accessToken);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutApi();
    } finally {
      setInMemoryAccessToken(null);
      setInMemoryUser(null);
      setUser(null);
      setAccessToken(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshSession: silentRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
