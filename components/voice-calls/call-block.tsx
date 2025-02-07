// components/voice-calls/call-block.tsx
'use client';

import { useEffect, useState } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollToBottom } from '@/components/use-scroll-to-bottom';
import {useCallBlockContext} from "@/components/context/call-block-context";


interface CallBlockProps {
  onClose: () => void;
  isSessionActive: boolean;
  isConnecting: boolean;
  callDuration?: number;
  handleStartStopClick: () => void;
  conversation: any[];
}

export function CallBlock({
                            onClose,
                            isSessionActive,
                            isConnecting,
                            callDuration,
                            handleStartStopClick,
                            conversation,
                          }: CallBlockProps) {
  // Получаем поле mode и метод openNewCall
  const { mode, openNewCall } = useCallBlockContext();

  // Для теста:
  // const finalMessages = finalMessages1.filter((msg) => msg.isFinal);
  const finalMessages = conversation.filter((msg) => msg.isFinal);

  // Состояние для мобильной панели: по умолчанию свернута
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Хук для автоскрола (для мобильной и десктопной панели)
  const [desktopContainerRef, desktopEndRef] =
      useScrollToBottom<HTMLDivElement>();
  const [mobileContainerRef, mobileEndRef] =
      useScrollToBottom<HTMLDivElement>();

  useEffect(() => {
    mobileEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finalMessages, mobileExpanded]);

  // Автоскролл для десктопной панели (при изменении finalMessages)
  useEffect(() => {
    desktopEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finalMessages]);

  /**
   * Логика нажатия на кнопку внизу:
   * - Если mode === 'existing', показываем "Call Again".
   *   По клику вызываем openNewCall() и сбрасываем старую историю.
   * - Если mode === 'new', поведение "Start Call"/"End Call" (handleStartStopClick).
   */
  function handleButtonClick() {
    if (mode === 'existing') {
      // Переходим в режим нового звонка
      // 1. Вызываем openNewCall() из контекста
      openNewCall();
      // 2. Так как "CallBlock" уже открыт, возможно, достаточно просто
      //    очистить старую историю? (Если вы хотите, чтобы история
      //    в useWebRTCAudioSession обнулилась).
      //    Либо пусть useWebRTCAudioSession при startSession()
      //    создаёт новую историю.
      handleStartStopClick();
    } else {
      // mode === 'new'
      handleStartStopClick();
    }
  }

  // Определим надпись на кнопке
  let buttonLabel = 'Start Call';
  if (mode === 'new' && isSessionActive) {
    buttonLabel = 'End Call';
  } else if (mode === 'existing') {
    buttonLabel = 'Call Again';
  }

  function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    // Преобразуем в строку HH:MM:SS (с ведущими нулями при необходимости)
    const hh = h < 10 ? `0${h}` : `${h}`;
    const mm = m < 10 ? `0${m}` : `${m}`;
    const ss = s < 10 ? `0${s}` : `${s}`;
    return `${hh}:${mm}:${ss}`;
  }
console.log("isConnecting", isConnecting)

  return (
      <AnimatePresence>
        <motion.div
            className="fixed inset-0 z-50 bg-background"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
          {/* Кнопка закрытия */}
          {(!isSessionActive && !isConnecting) &&
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-50 text-white hover:text-gray-300"
            >
              <XIcon className="w-8 h-8" />
            </button>
          }

          <div className="w-full h-full flex flex-col">
            {/* Мобильная панель транскрипций */}
            <div
                className={`block md:hidden p-4 transition-all duration-300 mt-[60px] scrollbar-hide  ${
                    mobileExpanded
                        ? 'h-[50vh] overflow-y-auto '
                        : 'h-28 overflow-y-hidden mt-[110px] '
                }`}
                style={{
                  maskImage:
                      'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                  WebkitMaskImage:
                      'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                }}
                onClick={() => finalMessages.length > 0 && setMobileExpanded((prev) => !prev)}
                ref={mobileContainerRef}
            >
              <div>
                {finalMessages.map((msg) => (
                    <div key={msg.id} className="mb-2">
                      <p className="text-sm text-white text-center">
                    <span className={msg.role !== 'user' ? 'font-bold' : ''}>
                      {msg.text}
                    </span>
                      </p>
                    </div>
                ))}
                <div ref={mobileEndRef} className="min-w-[24px] min-h-[24px]" />
              </div>
            </div>

            {/* Основная область звонка */}
            <div className="relative flex-1 flex items-center justify-center">
              {/* Desktop панель транскрипций */}
              <div className="hidden md:block absolute left-0 top-0 bottom-0 w-1/3 p-4 pr-0">
                <div className="relative h-full">
                  <div
                      className="absolute top-1/2 right-0 w-full max-w-sm p-2 overflow-y-auto max-h-[60vh] transform -translate-y-1/2 scrollbar-hide"
                      style={{
                        maskImage:
                            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                        WebkitMaskImage:
                            'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
                      }}
                      ref={desktopContainerRef}
                  >
                    {finalMessages.map((msg) => (
                        <div key={msg.id} className="mb-3">
                          <p className="text-base text-white">
                            <span className="font-bold">{msg.role}:</span>{' '}
                            {msg.text}
                          </p>
                        </div>
                    ))}
                    <div ref={desktopEndRef} className="min-w-[24px] min-h-[24px]"/>
                  </div>
                </div>
              </div>



              {/* Центральный блок звонка */}
                <div className="w-full md:w-2/3 flex flex-col items-center justify-center">

                    {/* Аватарка */}
                    <div className="mb-4 -mt-10 md:mt-0">
                        <div
                            className={`w-56 h-56 rounded-full overflow-hidden border-8 border-white shadow-2xl ${
                                isSessionActive ? 'animate-pulse' : ''
                            }`}
                        >
                            <img
                                src="/placeholder-call.jpg"
                                alt="Call"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    <div
                        style={{
                            // Если идёт соединение (isConnecting = true) ИЛИ уже есть время звонка (callDuration > 0),
                            // делаем элемент видимым. Иначе — прячем.
                            visibility: (isConnecting || (callDuration) || isSessionActive)
                                ? 'visible'
                                : 'hidden',
                        }}
                        className="mt-2 text-foreground text-xl font-bold"
                    >
                        {formatDuration(callDuration ?? 0)}
                    </div>

                    {/* Кнопка внизу */}
                    <div className={`mt-6`}>
                        <Button
                            onClick={handleButtonClick}
                            className="py-4 text-xl font-bold flex items-center justify-center gap-4"
                            disabled={!isSessionActive && isConnecting}
                        >
                            {/* Если isSessionActive и mode='new' => End Call, если mode='existing' => Call Again */}
                            {mode === 'new' && isSessionActive && (
                                <Badge
                                    variant="secondary"
                                    className="animate-pulse bg-red-500 text-white"
                                >
                                    Live
                                </Badge>
                            )}
                            {buttonLabel}
                        </Button>
                    </div>
                </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
