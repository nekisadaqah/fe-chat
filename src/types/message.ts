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
  isSending?: boolean;
  clientMessageId?: string;
  readReceipts: MessageReadReceipt[];
}

export function normalizeMessage(raw: any): Message {
  if (!raw) return raw;

  const senderId =
    raw.senderId ||
    raw.userId ||
    raw.UserId ||
    raw.user?.id ||
    raw.user?.Id ||
    '';

  const senderUsername =
    raw.senderUsername ||
    raw.user?.username ||
    raw.user?.email ||
    raw.senderEmail ||
    '';

  return {
    id: String(raw.id || raw.Id || ''),
    senderId: String(senderId),
    senderUsername: String(senderUsername),
    senderAvatarUrl: raw.senderAvatarUrl || raw.user?.avatarUrl,
    content: String(raw.content || raw.Content || ''),
    conversationId: raw.conversationId || raw.ConversationId,
    groupId: raw.groupId || raw.GroupId,
    messageType: raw.messageType || raw.MessageType || 'text',
    mediaUrl: raw.mediaUrl || raw.MediaUrl,
    fileName: raw.fileName || raw.FileName,
    fileSize: raw.fileSize || raw.FileSize,
    mimeType: raw.mimeType || raw.MimeType,
    durationSeconds: raw.durationSeconds || raw.DurationSeconds,
    isDeleted: Boolean(raw.isDeleted ?? raw.IsDeleted ?? false),
    editedAt: raw.editedAt || raw.EditedAt,
    createdAt: raw.createdAt || raw.CreatedAt || new Date().toISOString(),
    isFromArchive: Boolean(raw.isFromArchive ?? raw.IsFromArchive ?? false),
    isSending: Boolean(raw.isSending ?? false),
    clientMessageId: raw.clientMessageId || raw.ClientMessageId,
    readReceipts: raw.readReceipts || raw.ReadReceipts || []
  };
}
