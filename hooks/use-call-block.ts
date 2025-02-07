import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';

type CallMode = 'new' | 'existing';

interface UseCallBlockReturn {
  isOpen: boolean;
  mode: CallMode;
  activeCallId: string | null;

  openNewCall: () => void;
  openExistingCall: (callId: string) => void;
  closeCall: () => void;

  // Массив транскрипций, загруженных для существующего звонка
  existingCallTranscriptions: any[];
}

/**
 * Хук для управления окнами звонка:
 * - mode === 'new': создаём новый звонок
 * - mode === 'existing': читаем историю старого звонка
 */
export function useCallBlock(): UseCallBlockReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<CallMode>('new');
  const [activeCallId, setActiveCallId] = useState<string | null>(null);

  // Если мы в режиме existing, делаем запрос за транскрипциями
  // /api/message/call-transcriptions?callMessageId=...
  // Если activeCallId нет, отключаем SWR, передавая null
  const { data: rawData } = useSWR(
    mode === 'existing' && activeCallId
      ? `/api/message/call-transcriptions?callMessageId=${activeCallId}`
      : null,
    fetcher,
  );

  // Преобразуем записи из БД: добавляем isFinal: true и timestamp: createdAt
  const transcriptionsData = rawData
    ? rawData.map((t: any) => ({
        ...t,
        isFinal: true,
        timestamp: t.createdAt,
      }))
    : [];

  function openNewCall() {
    setIsOpen(true);
    setMode('new');
    setActiveCallId(null);
  }

  function openExistingCall(callId: string) {
    setIsOpen(true);
    setMode('existing');
    setActiveCallId(callId);
  }

  function closeCall() {
    setIsOpen(false);
    // Можно сбросить или оставить activeCallId
    setActiveCallId(null);
  }

  return {
    isOpen,
    mode,
    activeCallId,
    openNewCall,
    openExistingCall,
    closeCall,
    existingCallTranscriptions: transcriptionsData || [],
  };
}
