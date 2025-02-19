'use client';

import { StudentSettings } from '@/components/dashboard/student-settings';
import { ChatSettings } from '@/components/dashboard/chat-settings';

export default function SettingsComponent() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <StudentSettings />
      <div className={'h-12'}></div>
      <ChatSettings />
    </div>
  );
}
