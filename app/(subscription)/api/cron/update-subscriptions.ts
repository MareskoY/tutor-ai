import type { NextApiRequest, NextApiResponse } from 'next';
import { updateUserSubscription } from '@/lib/db/queries';
import { getCanceledProSubscriptionsPastCurrentPeriod } from '@/lib/db/queries';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const now = new Date();
        // Получаем подписки, удовлетворяющие критериям
        const subs = await getCanceledProSubscriptionsPastCurrentPeriod(now);
        for (const sub of subs) {
            await updateUserSubscription(
                sub.userId,
                'free',
                'free',
                'canceled',
                sub.customerId,
                sub.provider,
                undefined
            );
        }
        res.status(200).json({ updated: subs.length });
    } catch (error: any) {
        console.error('Cron update error:', error);
        res.status(500).json({ error: error.message });
    }
}
