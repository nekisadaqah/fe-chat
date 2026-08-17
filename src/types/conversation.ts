import type { User } from './user';
import type { Message } from './message';

export interface Conversation {
  id: string;
  otherUser: User;
  lastMessage?: Message;
  createdAt: string;
  lastMessageAt?: string;
}
