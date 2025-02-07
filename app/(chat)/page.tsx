// app/(chat)/page.tsx
import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_MODEL_NAME, models } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import {CallBlockProvider} from "@/components/context/call-block-context";

export default async function Page() {
  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;
  const defaultChatType = 'default';

  const selectedModelId =
    models.find((model) => model.id === modelIdFromCookie)?.id ||
    DEFAULT_MODEL_NAME;

  return (
    <>
        <CallBlockProvider>
          <Chat
            key={id}
            id={id}
            initialMessages={[]}
            selectedModelId={selectedModelId}
            selectedVisibilityType="private"
            isReadonly={false}
            defaultChatType={defaultChatType}
          />
          <DataStreamHandler id={id} />
        </CallBlockProvider>
    </>
  );
}
