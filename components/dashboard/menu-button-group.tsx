// components/dashboard/menu-button-group.tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const tabs = [
  { name: 'Settings', value: 'settings' },
  { name: 'Payments', value: 'payments' },
  { name: 'Overflow', value: 'overflow' },
];

export default function MenuButtonGroup() {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'payments';
  const prev = searchParams.get('prev');

  return (
    <div className="flex justify-center mt-24">
      <div className="flex space-x-4 bg-muted p-1 rounded-full w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard?tab=${tab.value}${prev ? `&prev=${encodeURIComponent(prev)}` : ''}`}
            className={`px-4 py-2 rounded-full h-10 flex items-center justify-center 
                ${currentTab === tab.value ? 'bg-background text-sidebar-accent-foreground' : 'bg-muted text-sidebar-foreground'}`}
          >
            {tab.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
