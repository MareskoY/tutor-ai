'use client';
import { ChevronUp } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { ThumbUpIcon } from '@/components/icons';

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuButton asChild className="bg-background h-10">
        <Link href={`/dashboard?tab=overflow`}>
          <ThumbUpIcon />
          <span>Overflow</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuButton asChild className="bg-background h-10">
        <Link href={`/dashboard?tab=settings`}>
          <ThumbUpIcon />
          <span>Settings</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuButton asChild className="bg-background h-10">
        <Link href={`/dashboard?tab=payments`}>
          <ThumbUpIcon />
          <span>Payments</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
              <Image
                src={`https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? 'User Avatar'}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="truncate">{user?.email}</span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  signOut({
                    redirectTo: '/',
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
