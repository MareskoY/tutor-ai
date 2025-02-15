// // pages/api/cron/update-subscriptions.ts
// import type { NextApiRequest, NextApiResponse } from 'next';
// import { db } from '@/lib/db';
// import { subscription } from '@/lib/db/schema';
// import { lt, and, isNotNull } from 'drizzle-orm';
// import { updateUserSubscription } from '@/lib/db/queries';
//
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     try {
//         const now = new Date();
//         // Выбираем подписки с plan 'pro', статус 'canceled', и currentPeriodEnd меньше текущего времени
//         const subs = await db.select().from(subscription).where(
//             and(
//                 subscription.plan.eq('pro'),
//                 subscription.status.eq('canceled'),
//                 isNotNull(subscription.currentPeriodEnd),
//                 subscription.currentPeriodEnd.lt(now)
//             )
//         );
//         for (const sub of subs) {
//             await updateUserSubscription(
//                 sub.userId,
//                 sub.subscriptionId,
//                 'free',
//                 'canceled',
//                 sub.customerId,
//                 sub.provider,
//                 null
//             );
//         }
//         res.status(200).json({ updated: subs.length });
//     } catch (error: any) {
//         console.error('Cron update error:', error);
//         res.status(500).json({ error: error.message });
//     }
// }
