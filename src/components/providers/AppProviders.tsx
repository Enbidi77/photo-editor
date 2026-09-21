'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
