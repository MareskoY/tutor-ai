// app/api/user/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserById, updateUser } from '@/lib/db/queries';

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const userRecord = await getUserById({ id: userId });
  return NextResponse.json({
    studentPreference: userRecord?.studentPreference,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await req.json();
  const { studentPreference } = body;
  await updateUser({ id: userId, studentPreference });
  return NextResponse.json({ success: true });
}
