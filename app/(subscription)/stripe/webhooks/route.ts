// app/(subscription)/stripe/webhooks/route.ts

import Stripe from 'stripe';
import { stripe } from '@/lib/stripe/config';
import {updateUserSubscription} from "@/lib/db/queries";

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
        // Логируем полное событие для отладки
        console.log("Stripe event data:", JSON.stringify(event, null, 2));
    } catch (err: any) {
        console.error(`❌ Error message: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Если событие не входит в список обрабатываемых, просто игнорируем его
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
                // Определяем тариф: если product совпадает с тарифом pro, то plan = 'pro'
                const productId = stripeSubscription.items.data[0].price.product as string;
                let plan: 'free' | 'pro' = 'free';
                if (productId === process.env.STRIPE_PRODUCT_PRO) {
                    plan = 'pro';
                }
                // Обновляем запись подписки, передавая customerId и provider = 'stripe'
                await updateUserSubscription(
                    userId,
                    stripeSubscription.id,
                    plan,
                    stripeSubscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete',
                    stripeSubscription.customer as string,
                    'stripe'
                );
                console.log(`Updated subscription for user ${userId} with subscriptionId ${stripeSubscription.id}`);
                break;
            }
            case 'checkout.session.completed': {
                const checkoutSession = event.data.object as Stripe.Checkout.Session;
                if (checkoutSession.mode === 'subscription' && checkoutSession.subscription) {
                    // Получаем полный объект подписки по ID, полученному в сессии
                    const stripeSubscription = await stripe.subscriptions.retrieve(
                        checkoutSession.subscription as string
                    );
                    const userId = stripeSubscription.metadata?.userId;
                    if (!userId) {
                        throw new Error('UserId not found in subscription metadata.');
                    }
                    const productId = stripeSubscription.items.data[0].price.product as string;
                    let plan: 'free' | 'pro' = 'free';
                    if (productId === process.env.STRIPE_PRODUCT_PRO) {
                        plan = 'pro';
                    }
                    await updateUserSubscription(
                        userId,
                        stripeSubscription.id,
                        plan,
                        stripeSubscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete',
                        stripeSubscription.customer as string,
                        'stripe'
                    );
                    console.log(`Checkout session completed. Updated subscription for user ${userId} with subscriptionId ${stripeSubscription.id}`);
                }
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(error);
        // Даже если произошла ошибка, возвращаем 200, чтобы Stripe не делал повторных попыток
        return new Response('Webhook handler failed. Check logs.', { status: 200 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
}
