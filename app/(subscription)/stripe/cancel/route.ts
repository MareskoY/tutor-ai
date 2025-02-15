// app/(subscription)/stripe/cancel/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { auth } from '@/app/(auth)/auth';
import { getUserSubscription } from '@/lib/db/queries';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }
    const userId = session.user.id;
    const subs = await getUserSubscription(userId);
    if (!subs || subs.length === 0) {
      return new Response('No subscription found', { status: 404 });
    }
    // Предполагаем, что у пользователя одна активная подписка
    const subscriptionRecord = subs[0];
    if (subscriptionRecord.plan !== 'pro') {
      return new Response('No active pro subscription to cancel', {
        status: 400,
      });
    }
    if (!subscriptionRecord.subscriptionId) {
      throw new Error('Subscription ID is missing');
    }
    // Отмена подписки с установкой cancel_at_period_end
    const canceledSubscription = await stripe.subscriptions.update(
      subscriptionRecord.subscriptionId,
      {
        cancel_at_period_end: true,
      },
    );
    return NextResponse.json({ canceledSubscription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
