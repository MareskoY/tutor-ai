'use client';

import * as React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CHAT_TYPES, chatTypeConfig, type ChatType } from '@/lib/ai/chat-type';
import { useUserPreference } from '@/components/context/user-preference-context';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ChatSettingItemProps {
  type: ChatType;
  config: {
    iconKey: string;
    title: string;
    label?: string;
  };
}

function ChatSettingItem({ type, config }: ChatSettingItemProps) {
  const { studentPreference, updateStudentPreference } = useUserPreference();

  const currentChatPreferences = studentPreference?.['chats-preferences'] || {};

  // Инициализация состояния без `defaultPrompt`
  const [prompt, setPrompt] = React.useState<string>(
    currentChatPreferences?.[type] ?? '',
  );

  const [saveStatus, setSaveStatus] = React.useState<
    'Save' | 'Saving...' | 'Saved'
  >('Saved');

  // Обновление состояния при изменении данных из `studentPreference`
  React.useEffect(() => {
    setPrompt(currentChatPreferences?.[type] ?? '');
    setSaveStatus('Saved');
  }, [studentPreference, type]);

  // Проверяем, изменилось ли значение
  const isDirty = React.useMemo(() => {
    const hasChanges = prompt !== (currentChatPreferences?.[type] ?? '');

    if (hasChanges) {
      setSaveStatus('Save');
    }

    return hasChanges;
  }, [prompt, currentChatPreferences, type]);

  const handleSave = async () => {
    if (!studentPreference) return;

    setSaveStatus('Saving...');

    const updatedPreferences = {
      ...studentPreference,
      'chats-preferences': {
        ...studentPreference['chats-preferences'],
        ...(prompt.trim() ? { [type]: prompt } : {}), // Если пусто, не сохраняем
      },
    };

    await updateStudentPreference(updatedPreferences);
    setSaveStatus('Saved');
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-6">
      <div>
        <h3 className="font-semibold">{config.title}</h3>
        <p className="text-sm text-muted-foreground">
          {config.label || 'Prompt configuration'}
        </p>
      </div>

      {/* Фиксированный размер для Textarea */}
      <Textarea
        className="h-32 resize-none"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Enter prompt for ${config.title}`}
      />

      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={!isDirty}>
          {saveStatus}
        </Button>
      </div>
    </div>
  );
}

export function ChatSettings() {
  const { studentPreference, isLoading } = useUserPreference();

  // Показываем лоадер, если данные еще не загрузились
  if (isLoading) {
    return (
      <div className="space-y-12">
        {CHAT_TYPES.map((type) => (
          <div
            key={type}
            className="border border-gray-200 rounded-2xl flex items-center justify-center h-[286px]"
          >
            <LoadingSpinner />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {CHAT_TYPES.map((type) => {
        const config = chatTypeConfig[type];
        return <ChatSettingItem key={type} type={type} config={config} />;
      })}
    </div>
  );
}
