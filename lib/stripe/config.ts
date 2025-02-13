// utils/stripe/config.ts
import Stripe from 'stripe';

export const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? '',
    {
        // Если хотите, укажите актуальную версию API (либо null для автоматического определения)
        appInfo: {
            name: 'Next.js Subscription Project',
            version: '1.0.0',
            url: 'https://your-app-domain.com',
        },
    }
);
