// src/api/chat.ts
import client from './client';

export interface ChatContact {
  contact_id: string;
  contact_mobile: string;
  contact_name: string;
  contact_relation: string;
  contact_avatar: string | null;
  last_message: string;
  last_message_type: string;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessageRow {
  id: string;
  sender_id: string;
  sender_mobile: string;
  receiver_id: string;
  receiver_mobile: string;
  content: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface ChatPerson {
  membership_no: string;
  mobile: string;
  name: string;
  relation: string;
  profile_photo_url: string | null;
  village: string | null;
}

// GET /api/portal/chat/contacts — inbox: one row per person contact
export const fetchContacts = async () => {
  const res = await client.get('/portal/chat/contacts');
  return res.data as { success: boolean; contacts: ChatContact[] };
};

// GET /api/portal/chat/unread-count — total unread across all contacts
export const fetchUnreadCount = async () => {
  const res = await client.get('/portal/chat/unread-count');
  return res.data as { success: boolean; count: number };
};

// GET /api/portal/chat/conversation/:memberId?mobile= — paginated history, marks read
export const fetchConversation = async (
  memberId: string,
  mobile: string,
  params: { limit?: number; offset?: number } = {}
) => {
  const res = await client.get(`/portal/chat/conversation/${memberId}`, { params: { ...params, mobile } });
  return res.data as { success: boolean; messages: ChatMessageRow[] };
};

// GET /api/portal/chat/search?q= — find any registered person (not just household heads)
export const searchChatMembers = async (q: string) => {
  const res = await client.get('/portal/chat/search', { params: { q } });
  return res.data as { success: boolean; members: ChatPerson[] };
};

// PUT /api/portal/chat/read/:memberId?mobile= — REST fallback for marking a thread read
export const markRead = async (memberId: string, mobile: string) => {
  const res = await client.put(`/portal/chat/read/${memberId}`, null, { params: { mobile } });
  return res.data as { success: boolean };
};

// POST /api/portal/chat/block — stop a specific person from messaging you
export const blockPerson = async (membershipNo: string, mobile: string) => {
  const res = await client.post('/portal/chat/block', { membershipNo, mobile });
  return res.data as { success: boolean };
};

export const unblockPerson = async (membershipNo: string, mobile: string) => {
  const res = await client.delete('/portal/chat/block', { params: { membershipNo, mobile } });
  return res.data as { success: boolean };
};

export const fetchBlocked = async () => {
  const res = await client.get('/portal/chat/blocked');
  return res.data as {
    success: boolean;
    blocked: { blocked_membership_no: string; blocked_mobile: string; created_at: string }[];
  };
};

// POST /api/portal/chat/report — flag a sender for admin review
export const reportPerson = async (membershipNo: string, mobile: string, reason?: string) => {
  const res = await client.post('/portal/chat/report', { membershipNo, mobile, reason });
  return res.data as { success: boolean };
};
