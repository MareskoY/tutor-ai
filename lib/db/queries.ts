// lib/db/queries.ts
import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message as messageTable,
  vote,
  callTranscription,
  type CallTranscription,
  subscription,
} from './schema';
import type { BlockKind } from '@/components/block';
import type { ChatType } from '@/lib/ai/chat-type';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function createOAuthUser(email: string) {
  try {
    return await db.insert(user).values({ email });
  } catch (error) {
    console.error('Failed to create OAuth user in database', error);
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  type,
}: {
  id: string;
  userId: string;
  title: string;
  type: ChatType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      type,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(messageTable).where(eq(messageTable.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(messageTable).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(messageTable)
      .where(eq(messageTable.chatId, id))
      .orderBy(asc(messageTable.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: BlockKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(messageTable).where(eq(messageTable.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    return await db
      .delete(messageTable)
      .where(
        and(
          eq(messageTable.chatId, chatId),
          gte(messageTable.createdAt, timestamp),
        ),
      );
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function saveMessage({ message }: { message: Message }) {
  try {
    return await db.insert(messageTable).values(message);
  } catch (error) {
    console.error('Failed to save message in database', error);
    throw error;
  }
}

// Функция для обновления одного сообщения (например, обновляем длительность звонка)
export async function updateMessage({
  id,
  content,
}: {
  id: string;
  content: any;
}) {
  try {
    return await db
      .update(messageTable)
      .set({ content })
      .where(eq(messageTable.id, id));
  } catch (error) {
    console.error('Failed to update message in database', error);
    throw error;
  }
}

export async function saveCallTranscriptions({
  transcriptions,
}: {
  transcriptions: Array<CallTranscription>;
}) {
  try {
    return await db.insert(callTranscription).values(transcriptions);
  } catch (error) {
    console.error('Failed to save call transcriptions in database', error);
    throw error;
  }
}

export async function getCallTranscriptionsByCallId(callMessageId: string) {
  try {
    return await db
      .select()
      .from(callTranscription)
      .where(eq(callTranscription.callMessageId, callMessageId))
      .orderBy(asc(callTranscription.createdAt));
  } catch (error) {
    console.error('Failed to get call transcriptions from database', error);
    throw error;
  }
}

export async function createUserSubscription(
  userId: string,
  provider = 'free',
  customerId = 'free',
) {
  await db.insert(subscription).values({
    userId,
    provider,
    customerId,
    plan: 'free',
    status: 'active',
  });
}

export async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  plan: 'free' | 'pro',
  status: 'active' | 'past_due' | 'canceled' | 'incomplete',
  customerId?: string,
  provider = 'unknown',
  currentPeriodEnd?: Date,
) {
  await db
    .update(subscription)
    .set({
      subscriptionId,
      plan,
      status,
      provider,
      ...(customerId ? { customerId } : {}),
      ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscription.userId, userId));
}

export async function getUserSubscription(userId: string) {
  return await db
    .select()
    .from(subscription)
    .where(eq(subscription.userId, userId));
}
