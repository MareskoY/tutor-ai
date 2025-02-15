// app/(subscription)/api/subscription/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserSubscription } from '@/lib/db/queries';

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const subs = await getUserSubscription(userId);
  return NextResponse.json({ subscription: subs[0] });
}
