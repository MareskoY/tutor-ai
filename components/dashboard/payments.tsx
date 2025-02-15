// components/dashboard/payments.tsx
'use client';

import { Button } from '@/components/ui/button';
import PaymentCard from '@/components/dashboard/payment-card';
import { useState, useEffect } from 'react';
import { useSubscription } from '@/components/context/subscription-context';

export default function PaymentsComponent() {
  const { subscription, refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true); // Флаг загрузки подписки

  useEffect(() => {
    if (subscription) {
      setIsFetching(false);
    }
  }, [subscription]);

  // Вычисляем состояние подписки для карточки Pro
  const now = Date.now();
  let proState: 'none' | 'active' | 'canceled' = 'none';
  let headerLabel: string | undefined = undefined;

  if (subscription?.plan === 'pro') {
    if (subscription.status === 'active') {
      proState = 'active';
      headerLabel = 'Active';
    } else if (
      subscription.status === 'canceled' &&
      subscription.currentPeriodEnd
    ) {
      const endDate = new Date(subscription.currentPeriodEnd);
      const diffTime = endDate.getTime() - now;
      if (diffTime > 0) {
        proState = 'canceled';
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        headerLabel = `Active for ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else {
        proState = 'none';
      }
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    try {
      const response = await fetch('/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await response.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        console.error('Ошибка создания сессии:', data.error);
      }
    } catch (error) {
      console.error('Ошибка при подписке:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch('/stripe/cancel', { method: 'POST' });
      const data = await res.json();
      console.log('Отмена подписки:', data);
      setTimeout(() => {
        refreshSubscription();
      }, 1000);
    } catch (error) {
      console.error('Ошибка отмены подписки:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleResubscribe() {
    setLoading(true);
    try {
      const response = await fetch('/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' }),
      });
      const data = await response.json();
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        console.error('Ошибка создания сессии:', data.error);
      }
    } catch (error) {
      console.error('Ошибка при повторной подписке:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={'content-center w-full flex justify-center'}>
      <div className="mt-24 container space-y-12 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 max-w-4xl ">
        {/* Карточка Free */}
        <PaymentCard
          title="Free"
          description="You just want to discover"
          price="$0"
          period="/month"
          features={[
            '10 Credits',
            'Generate video (2 credits)',
            'Quizz (1 credits)',
          ]}
          isActive={subscription?.plan === 'free'}
          isLoading={isFetching}
        />
        {/* Карточка Pro */}
        <PaymentCard
          title="Pro"
          description="You want to learn and have a personal assistant"
          price="$10"
          period="/month"
          features={[
            '30 credits',
            'Powered by GPT-4 (more accurate)',
            'Generate video (2 credits)',
            'Quizz (1 credits)',
            'Analytics on the quizz',
          ]}
          isActive={proState === 'active' || proState === 'canceled'}
          activeLabel={isFetching ? undefined : headerLabel}
          isLoading={isFetching}
          actionNode={
            <>
              {proState === 'none' && (
                <Button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className={'w-full'}
                >
                  Get Pro
                </Button>
              )}
              {proState === 'active' && (
                <Button
                  onClick={handleCancel}
                  disabled={loading}
                  className={'w-full'}
                >
                  Cancel subscription
                </Button>
              )}
              {proState === 'canceled' && (
                <Button
                  onClick={handleResubscribe}
                  disabled={loading}
                  className={'w-full'}
                >
                  Resubscribe
                </Button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
