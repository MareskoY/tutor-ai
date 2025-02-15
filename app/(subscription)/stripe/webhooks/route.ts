// app/(subscription)/stripe/webhooks/route.ts

import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/config';
import { updateUserSubscription } from '@/lib/db/queries';

const relevantEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'checkout.session.completed',
]);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      return new Response('Webhook secret not found.', { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`🔔  Webhook received: ${event.type}`);
    console.log('Stripe event data:', JSON.stringify(event, null, 2));
  } catch (err: any) {
    console.error(`❌ Error message: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    console.log(`Ignoring event type: ${event.type}`);
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as Stripe.Subscription;
        const userId = stripeSubscription.metadata?.userId;
        if (!userId) {
          throw new Error('UserId not found in subscription metadata.');
        }
        const productId = stripeSubscription.items.data[0].price
          .product as string;
        // Если продукт соответствует тарифу pro, то план "pro", иначе "free"
        let plan: 'free' | 'pro' =
          productId === process.env.STRIPE_PRODUCT_PRO ? 'pro' : 'free';
        // Если подписка отменена (cancel_at_period_end установлен) – задаём статус "canceled"
        let status: 'active' | 'past_due' | 'canceled' | 'incomplete' =
          stripeSubscription.status as any;
        let currentPeriodEnd: Date | undefined = undefined;
        if (stripeSubscription.cancel_at_period_end) {
          status = 'canceled';
          const now = Math.floor(Date.now() / 1000);
          if (now < stripeSubscription.current_period_end) {
            currentPeriodEnd = new Date(
              stripeSubscription.current_period_end * 1000,
            );
          } else {
            // Если период истёк – переключаем план на free
            plan = 'free';
          }
        } else if (stripeSubscription.status === 'canceled') {
          plan = 'free';
          status = 'canceled';
        }
        await updateUserSubscription(
          userId,
          stripeSubscription.id,
          plan,
          status,
          stripeSubscription.customer as string,
          'stripe',
          currentPeriodEnd,
        );
        console.log(
          `Updated subscription for user ${userId} with subscriptionId ${stripeSubscription.id}`,
        );
        break;
      }
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        if (
          checkoutSession.mode === 'subscription' &&
          checkoutSession.subscription
        ) {
          const stripeSubscription = await stripe.subscriptions.retrieve(
            checkoutSession.subscription as string,
          );
          const userId = stripeSubscription.metadata?.userId;
          if (!userId) {
            throw new Error('UserId not found in subscription metadata.');
          }
          const productId = stripeSubscription.items.data[0].price
            .product as string;
          let plan: 'free' | 'pro' =
            productId === process.env.STRIPE_PRODUCT_PRO ? 'pro' : 'free';
          let status: 'active' | 'past_due' | 'canceled' | 'incomplete' =
            stripeSubscription.status as any;
          let currentPeriodEnd: Date | undefined = undefined;
          if (stripeSubscription.cancel_at_period_end) {
            status = 'canceled';
            const now = Math.floor(Date.now() / 1000);
            if (now < stripeSubscription.current_period_end) {
              currentPeriodEnd = new Date(
                stripeSubscription.current_period_end * 1000,
              );
            } else {
              plan = 'free';
            }
          } else if (stripeSubscription.status === 'canceled') {
            plan = 'free';
            status = 'canceled';
          }
          await updateUserSubscription(
            userId,
            stripeSubscription.id,
            plan,
            status,
            stripeSubscription.customer as string,
            'stripe',
            currentPeriodEnd,
          );
          console.log(
            `Checkout session completed. Updated subscription for user ${userId} with subscriptionId ${stripeSubscription.id}`,
          );
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error(error);
    return new Response('Webhook handler failed. Check logs.', { status: 200 });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
