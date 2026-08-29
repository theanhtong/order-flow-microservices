'use client';

import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const silentRefresh = useAuthStore((state) => state.silentRefresh);

  useEffect(() => {
    silentRefresh();
  }, [silentRefresh]);

  return <>{children}</>;
}
