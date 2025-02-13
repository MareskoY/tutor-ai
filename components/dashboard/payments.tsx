// components/dashboard/payments.tsx
'use client';

import { Button } from "@/components/ui/button";
import PaymentCard from "@/components/dashboard/payment-card";
import { useState } from "react";

const subscriptions = [
    {
        title: 'Basic Plan',
        description: 'Описание базового плана',
        price: '$10/month',
    },
    {
        title: 'Pro Plan',
        description: 'Описание профессионального плана',
        price: '$20/month',
    },
    {
        title: 'Enterprise Plan',
        description: 'Описание корпоративного плана',
        price: '$50/month',
    },
];

export default function PaymentsComponent() {
    const [loading, setLoading] = useState(false);

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptions.map((sub) => (
                <PaymentCard key={sub.title} title={sub.title} description={sub.description}>
                    <div className="flex flex-col items-center">
                        <p className="text-lg font-bold">{sub.price}</p>
                        <Button
                            className="mt-4"
                            onClick={sub.title === 'Pro Plan' ? handleSubscribe : undefined}
                            disabled={sub.title !== 'Pro Plan' || loading}
                        >
                            {sub.title === 'Pro Plan' ? (loading ? 'Processing...' : 'Subscribe') : 'Unavailable'}
                        </Button>
                    </div>
                </PaymentCard>
            ))}
        </div>
    );
}
