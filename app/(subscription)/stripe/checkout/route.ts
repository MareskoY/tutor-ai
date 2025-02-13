// app/(subscription)/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import { auth } from '@/app/(auth)/auth';

export async function POST(req: Request) {
    try {
        // Получаем сессию пользователя через NextAuth (или ваш собственный метод)
        const session = await auth();
        if (!session || !session.user || !session.user.id || !session.user.email) {
            return new Response('Unauthorized', { status: 401 });
        }
        const userId = session.user.id;
        const email = session.user.email;

        const { plan } = await req.json();
        if (plan !== 'pro') {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        // Ищем или создаем клиента в Stripe по email
        let customer: string;
        try {
            const customers = await stripe.customers.list({ email, limit: 1 });
            if (customers.data.length > 0) {
                customer = customers.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({ email });
                customer = newCustomer.id;
            }
        } catch (err) {
            console.error('Ошибка при получении/создании клиента:', err);
            throw new Error('Невозможно создать или получить клиента.');
        }

        // Используем цену тарифа pro из переменных окружения
        const priceId = process.env.STRIPE_PRICE_PRO as string;
        const sessionCheckout = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.NEXT_PUBLIC_HOSTNAME}/dashboard?tab=payments&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_HOSTNAME}/dashboard`,
            // Передаём метаданные в подписку через subscription_data
            subscription_data: {
                metadata: {
                    userId: userId,
                },
            },
        });

        return NextResponse.json({ sessionUrl: sessionCheckout.url });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
