// lib/ai/chat-type.ts

/**
 * Список всех типов чатов (должен быть "as const")
 * чтобы Drizzle мог подтянуть значения для enum
 */
export const CHAT_TYPES = [
  'default',
  'math',
  'chemistry',
  'physics',
  'history',
] as const;

/**
 * Тип, позволяющий использовать только эти строчные значения
 */
export type ChatType = (typeof CHAT_TYPES)[number];

/**
 * Минимальная конфигурация для каждого типа чата
 * (тут главное не использовать JSX).
 *
 * iconKey: строковый ключ, по которому мы потом
 *         на фронте выберем нужную иконку.
 * prompt: доменный промпт
 * title: "человекочитаемое" название
 * initialMessage: если хотим автоматически отправлять при старте
 */
export const chatTypeConfig: Record<
  ChatType,
  {
    iconKey: string;
    prompt: string;
    title: string;
    label?: string; // Добавили label
    initialMessage?: string;
  }
> = {
  default: {
    iconKey: 'more',
    title: 'Default Chat',
    prompt: 'You are a helpful AI assistant ready to discuss any topic.',
    initialMessage: 'Hello there! How can I help you today?',
  },
  math: {
    iconKey: 'math',
    title: 'Math Tutor',
    prompt:
      'You are an expert math tutor. Provide detailed solutions for math problems.',
    label: 'Focus on mathematics',
    initialMessage: 'Hi, can you help me with a math question?',
  },
  chemistry: {
    iconKey: 'chemistry',
    title: 'Chemistry Tutor',
    prompt:
      'You are a chemistry tutor. Explain chemical concepts and equations clearly.',
    label: 'Learn about chemical reactions',
    initialMessage: 'Hello, let’s talk about chemistry!',
  },
  physics: {
    iconKey: 'physics',
    title: 'Physics Tutor',
    prompt:
      'You are a physics tutor. Provide step-by-step explanations of physical phenomena.',
    label: 'Discuss physics problems',
    initialMessage: 'Hey, I have a question about physics!',
  },
  history: {
    iconKey: 'history',
    title: 'History Tutor',
    prompt:
      'You are a history tutor. Discuss historical events, timelines, and context.',
    label: 'Dive into historical timelines',
    initialMessage: 'Can you tell me about a historical event?',
  },
};
