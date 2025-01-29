// components/suggested-actions.tsx
'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo } from 'react';

// Импортируем chatTypeConfig
import { chatTypeConfig, ChatType } from '@/lib/ai/chat-type';
// Если нужны иконки
import { iconMap } from './chat-type-icons';

interface SuggestedActionsProps {
  chatId: string;
  append: (
      message: Message | CreateMessage,
      chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({ chatId, append }: SuggestedActionsProps) {
  // Превращаем объект в массив, исключая 'default'
  const entries = Object.entries(chatTypeConfig).filter(
      ([type]) => type !== 'default',
  ) as [ChatType, (typeof chatTypeConfig)[ChatType]][];

  return (
      <div className="grid sm:grid-cols-2 gap-2 w-full">
        {entries.map(([type, config], index) => {
          const { title, label, initialMessage, iconKey } = config;

          // Находим иконку по iconKey
          const IconEl = iconMap[iconKey] || null;

          return (
              <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ delay: 0.05 * index }}
                  key={`suggested-action-${type}-${index}`}
                  className={index > 1 ? 'hidden sm:block' : 'block'}
              >
                <Button
                    variant="ghost"
                    onClick={async () => {
                      // Ставим новый URL (необязательно)
                      window.history.replaceState({}, '', `/chat/${chatId}`);

                      // Отправляем пользовательское сообщение с initialMessage
                      if (initialMessage) {
                        await append(
                            {
                              role: 'user',
                              content: initialMessage,
                            },
                            {
                              body: {
                                // Передаём chatType для бэка, чтобы установить нужный тип
                                chatType: type,
                                id: chatId,
                              },
                            },
                        );
                      }
                    }}
                    className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                >
                  {/* Верхняя строка: иконка + title */}
                  <div className="flex items-center gap-2">
                    {IconEl}
                    <span className="font-medium">{title}</span>
                  </div>

                  {/* Вторая строка: label */}
                  {label && (
                      <span className="text-muted-foreground">{label}</span>
                  )}
                </Button>
              </motion.div>
          );
        })}
      </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions);
