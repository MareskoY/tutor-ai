// app/(chat)/api/message/call-transcriptions/route.ts
import { NextResponse } from 'next/server';
import {
  getCallTranscriptionsByCallId,
  saveCallTranscriptions,
} from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    // Парсим параметр callMessageId из query
    const { searchParams } = new URL(request.url);
    const callMessageId = searchParams.get('callMessageId');

    if (!callMessageId) {
      return NextResponse.json(
        { error: 'Missing callMessageId' },
        { status: 400 },
      );
    }

    // Загружаем транскрипции из базы
    const transcriptions = await getCallTranscriptionsByCallId(callMessageId);
    return NextResponse.json(transcriptions);
  } catch (error) {
    console.error('Error in GET /api/message/call-transcriptions', error);
    return NextResponse.json(
      { error: 'Failed to load call transcriptions' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Ожидаем JSON вида:
    // {
    //   chatId: string,
    //   callMessageId: string,
    //   transcriptions: [
    //     { id: string, role: string, text: string, timestamp: string }
    //   ]
    // }
    const { chatId, callMessageId, transcriptions } = await request.json();

    const data = transcriptions.map((t: any) => ({
      id: t.id, // используем id из conversation
      chatId,
      callMessageId,
      role: t.role,
      text: t.text,
      createdAt: new Date(t.timestamp), // timestamp из conversation как createdAt
    }));

    await saveCallTranscriptions({ transcriptions: data });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/message/call-transcriptions', error);
    return NextResponse.json(
      { error: 'Failed to save call transcriptions' },
      { status: 500 },
    );
  }
}
