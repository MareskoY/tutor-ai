// components/dashboard/dashboard-content.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CrossIcon } from '@/components/icons';
import MenuButtonGroup from '@/components/dashboard/menu-button-group';
import PaymentsComponent from '@/components/dashboard/payments';
import SettingsComponent from '@/components/dashboard/settings';
import OverflowComponent from '@/components/dashboard/overflow';
import { SubscriptionProvider } from '@/components/context/subscription-context';
import { UserPreferenceProvider } from '@/components/context/user-preference-context';

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'settings';

  return (
    <SubscriptionProvider>
      <UserPreferenceProvider>
        <div className="min-h-screen bg-background relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 rounded-full"
            onClick={() => router.push('/')}
          >
            <CrossIcon />
          </Button>
          <div className="p-4">
            <MenuButtonGroup />
            <div className="mt-24">
              {tab === 'payments' && <PaymentsComponent />}
              {tab === 'settings' && <SettingsComponent />}
              {tab === 'overflow' && <OverflowComponent />}
            </div>
          </div>
        </div>
      </UserPreferenceProvider>
    </SubscriptionProvider>
  );
}
