// src/api/chat.ts
import client from './client';

export interface ChatContact {
  contact_id: string;
  contact_name: string;
  contact_avatar: string | null;
  last_message: string;
  last_message_type: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

// GET /api/portal/chat/contacts — inbox: one row per contact
export const fetchContacts = async () => {
  const res = await client.get('/portal/chat/contacts');
  return res.data as { success: boolean; contacts: ChatContact[] };
};

// GET /api/portal/chat/conversation/:memberId — paginated history, marks read
export const fetchConversation = async (memberId: string, params: { limit?: number; offset?: number } = {}) => {
  const res = await client.get(`/portal/chat/conversation/${memberId}`, { params });
  return res.data as { success: boolean; messages: ChatMessageRow[] };
};

// GET /api/portal/chat/search?q= — find a member to start a new chat with
export const searchChatMembers = async (q: string) => {
  const res = await client.get('/portal/chat/search', { params: { q } });
  return res.data as { success: boolean; members: { membership_no: string; name: string; profile_photo_url: string | null }[] };
};

// PUT /api/portal/chat/read/:memberId — REST fallback for marking a thread read
export const markRead = async (memberId: string) => {
  const res = await client.put(`/portal/chat/read/${memberId}`);
  return res.data as { success: boolean };
};
