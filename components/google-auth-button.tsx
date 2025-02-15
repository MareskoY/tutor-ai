// components/google-auth-button.tsx
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogoGoogle } from '@/components/icons';

const NEXT_PUBLIC_HOSTNAME = process.env.NEXT_PUBLIC_HOSTNAME;

interface GoogleAuthButtonProps {
  title: string;
}

export default function GoogleAuthButton({
  title,
}: GoogleAuthButtonProps): JSX.Element {
  return (
    <Button
      className={'w-full mt-4'}
      onClick={() => signIn('google', { callbackUrl: NEXT_PUBLIC_HOSTNAME })}
    >
      <LogoGoogle />
      {title}
    </Button>
  );
}
