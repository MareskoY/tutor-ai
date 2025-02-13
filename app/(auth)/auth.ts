// app/(auth)/auth.ts
import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import {createOAuthUser, createUserSubscription, getUser} from '@/lib/db/queries';

import { authConfig } from './auth.config';
import GoogleProvider from "next-auth/providers/google";

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        if (!user.email) {
          console.error("User email is missing");
          return false;
        }
        const existingUsers = await getUser(user.email);
        if (existingUsers.length === 0) {
          await createOAuthUser(user.email);
          const [newUser] = await getUser(user.email);
          if (newUser) {
            await createUserSubscription(newUser.id, 'free', 'free');
          }
          if (newUser) {
            user.id = newUser.id;
          }
        } else {
          user.id = existingUsers[0].id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
