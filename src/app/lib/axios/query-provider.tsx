'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient();

interface QueryProviderProps {
  children: ReactNode;
}

const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;