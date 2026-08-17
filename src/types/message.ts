export interface MessageReadReceipt {
  userId: string;
  userName: string;
  readAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  content: string;
  conversationId?: string;
  groupId?: string;
  messageType: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  durationSeconds?: number;
  isDeleted: boolean;
  editedAt?: string;
  createdAt: string;
  isFromArchive: boolean;
  readReceipts: MessageReadReceipt[];
}
