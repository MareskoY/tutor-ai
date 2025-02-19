// app/(chat)/api/stream/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserById } from '@/lib/db/queries';
import { StudentPreference } from '@/components/context/user-preference-context';
import { buildStudentCallTutorPrompt } from '@/lib/ai/prompts';
import { ChatType } from '@/lib/ai/chat-type';

function getSilenceDuration(age: number): number {
  if (age >= 3 && age <= 5) return 3000; // 3-5 лет → 3 секунды
  if (age > 5 && age <= 7) return 2500; // 5-7 лет → 2.5 секунды
  if (age > 7 && age <= 9) return 1700; // 7-9 лет → 2 секунды
  if (age > 9 && age <= 12) return 1300; // 9-12 лет → 1.5 секунды
  if (age > 12 && age <= 14) return 1000; // 12-14 лет → 1.2 секунды
  if (age > 14 && age <= 17) return 800; // 14-17 лет → 1 секунда
  return 600; // 17+ лет → 0.8 секунды
}

const getThreshold = (age: number): number => {
  if (age >= 3 && age <= 7) return 0.3; // Дети говорят тише, делаем чувствительнее
  return 0.5; // Стандартное значение для остальных
};

const getPrefixPadding = (age: number): number => {
  if (age >= 3 && age <= 7) return 700; // Увеличиваем захват перед речью
  return 500; // Стандартное значение
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { chatId, chatType, voice } = await request.json();
  if (!chatId || !chatType) {
    return new Response('Missing chatId or chatType', { status: 400 });
  }

  // 1) получаем данные пользователя
  const userRecord = await getUserById({ id: session.user.id });
  // дефолтный StudentPreference на случай, если нет данных в БД
  const defaultStudentPref: StudentPreference = {
    name: '',
    age: '',
    language: '',
    country: '',
    grade: '',
    'school-program': '',
    'chats-preferences': {},
  };
  // сливаем с данными из БД
  const rawStudentPref = userRecord?.studentPreference ?? {};
  const studentPref: StudentPreference = {
    ...defaultStudentPref,
    ...(rawStudentPref as Partial<StudentPreference>),
  };

  const prompt = buildStudentCallTutorPrompt(chatType as ChatType, studentPref);

  const userAge = studentPref.age ? Number(studentPref.age) : 12;
  const silenceDuration = getSilenceDuration(userAge);
  const threshold = getThreshold(userAge);
  const prefixPadding = getPrefixPadding(userAge);

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(`OPENAI_API_KEY is not set`);
    }
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-realtime-preview-2024-12-17',
          voice: voice || 'alloy',
          modalities: ['audio', 'text'],
          instructions: prompt,
          tool_choice: 'auto',
          turn_detection: {
            type: 'server_vad',
            threshold: threshold, // Настраиваем чувствительность VAD
            prefix_padding_ms: prefixPadding, // Добавляем звук перед речью
            silence_duration_ms: silenceDuration, // Время ожидания перед ответом
            create_response: true, // AI должен сразу отвечать
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `API request failed with status ${JSON.stringify(response)}`,
      );
    }

    const data = await response.json();

    // Return the JSON response to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching session data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session data' },
      { status: 500 },
    );
  }
}
