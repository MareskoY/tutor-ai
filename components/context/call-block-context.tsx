// context/CallBlockContext.tsx
'use client';

import React, { createContext, useContext } from 'react';
import { useCallBlock } from '@/hooks/use-call-block';

/**
 * Тип возвращаемого значения из useCallBlock
 */
type CallBlockContextValue = ReturnType<typeof useCallBlock>;

/**
 * Контекст
 */
const CallBlockContext = createContext<CallBlockContextValue | null>(null);

/**
 * Провайдер, оборачивающий использование useCallBlock
 */
export function CallBlockProvider({ children }: { children: React.ReactNode }) {
  const value = useCallBlock();
  return (
    <CallBlockContext.Provider value={value}>
      {children}
    </CallBlockContext.Provider>
  );
}

/**
 * Хук для использования контекста
 */
export function useCallBlockContext() {
  const ctx = useContext(CallBlockContext);
  if (!ctx) {
    throw new Error(
      'useCallBlockContext must be used within a CallBlockProvider',
    );
  }
  return ctx;
}
