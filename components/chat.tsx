// components/chat.tsx
'use client';

import type { Attachment, Message } from 'ai';
import { useChat } from 'ai/react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

import { Block } from './block';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages';
import type { VisibilityType } from './visibility-selector';
import { useBlockSelector } from '@/hooks/use-block';
import type { ChatType } from '@/lib/ai/chat-type';
import { CallBlock } from '@/components/voice-calls/call-block';
import useWebRTCAudioSession from '@/hooks/use-webrtc';
import { useCallBlockContext } from '@/components/context/call-block-context';

export function Chat({
  id,
  initialMessages,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  defaultChatType,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  defaultChatType?: ChatType;
}) {
  const { mutate } = useSWRConfig();

  const [chatType, setChatType] = useState<ChatType>(
    defaultChatType || 'default',
  );

  const {
    isOpen: isCallBlockOpen,
    mode: callMode,
    activeCallId,
    openNewCall,
    openExistingCall,
    closeCall,
    existingCallTranscriptions,
  } = useCallBlockContext();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    isLoading,
    stop,
    reload,
  } = useChat({
    id,
    body: { id, modelId: selectedModelId, chatType },
    initialMessages,
    experimental_throttle: 100,
    onFinish: () => {
      mutate('/api/history');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    `/api/vote?chatId=${id}`,
    fetcher,
  );

  const {
    status,
    isSessionActive,
    isConnecting,
    callDuration,
    conversation,
    handleStartStopClick,
  } = useWebRTCAudioSession('ash', id, messages, setMessages);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isBlockVisible = useBlockSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedModelId}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <Messages
          chatId={id}
          isLoading={isLoading}
          votes={votes}
          messages={messages}
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          isBlockVisible={isBlockVisible}
        />

        <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
          {!isReadonly && (
            <MultimodalInput
              chatId={id}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              setMessages={setMessages}
              append={append}
            />
          )}
        </form>
      </div>

      <Block
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />

      {isCallBlockOpen && (
        <CallBlock
          isSessionActive={callMode === 'new' ? isSessionActive : false}
          isConnecting={isConnecting}
          callDuration={callDuration}
          handleStartStopClick={handleStartStopClick}
          onClose={closeCall}
          // Если "new" => conversation (из useWebRTCAudioSession)
          // Если "existing" => existingCallTranscriptions
          conversation={
            callMode === 'new' ? conversation : existingCallTranscriptions
          }
        />
      )}
    </>
  );
}
