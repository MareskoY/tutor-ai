// components/chat-type-icons.tsx
import type { ReactElement } from 'react';
import { LogoGoogle, LogoOpenAI } from '@/components/icons';
// Импортируйте свои реальные иконки

/**
 * Словарь сопоставления ключа (iconKey) с реальной React-компонентой
 */
export const iconMap: Record<string, ReactElement> = {
  default: <LogoGoogle />,
  more: <LogoOpenAI />,
  math: <LogoOpenAI />,
  chemistry: <LogoOpenAI />,
  physics: <LogoOpenAI />,
  history: <LogoOpenAI />,
};
