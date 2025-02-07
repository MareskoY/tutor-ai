// app/api/message/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generateUUID } from '@/lib/utils';
import {
  getChatById,
  saveChat,
  saveMessage,
  updateMessage,
} from '@/lib/db/queries';
import type { ChatType } from '@/lib/ai/chat-type';
import type { Message } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    // Ожидаем, что клиент передаёт:
    //   id       – идентификатор чата (если чат ещё не создан)
    //   message  – объект сообщения (без id, chatId, createdAt)
    //   modelId  – id модели
    //   chatType – тип чата (по умолчанию 'default')
    const {
      id,
      message,
      chatType = 'default',
    }: {
      id: string;
      message: Partial<Message> & { role: string; content: any; id?: string };
      chatType?: ChatType;
    } = await request.json();

    // Аутентификация
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Проверяем наличие чата
    let chat = await getChatById({ id });

    let type = chatType;
    if (!chat) {
      // Если чат не существует, генерируем заголовок (например, на основе переданного сообщения)
      const title = 'Call with';
      // Создаём чат
      await saveChat({ id, userId: session.user.id, title, type: chatType });
    } else {
      type = chat.type || 'default';
    }

    // Генерируем уникальный id для сообщения
    console.log('message.id', message.id);
    const messageId = message.id ? message.id : generateUUID();
    const newMessage: Message = {
      id: messageId,
      chatId: id,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
    };

    // Сохраняем сообщение с помощью saveMessage
    await saveMessage({ message: newMessage });

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('Error in POST /api/message/message', error);
    return NextResponse.json(
      { error: 'Failed to save message message' },
      { status: 500 },
    );
  }
}

// Если требуется обновление сообщения (например, при изменении длительности звонка), можно реализовать PATCH:
export async function PATCH(request: Request) {
  try {
    const { id, content } = await request.json();
    await updateMessage({ id, content });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/message/message', error);
    return NextResponse.json(
      { error: 'Failed to update message message' },
      { status: 500 },
    );
  }
}
