// src/api/notifications.ts
import client from './client';

export interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  actor_name: string;
  actor_avatar: string | null;
  type: string;
  post_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

// GET /api/portal/notifications
export const fetchNotifications = async (params: { limit?: number; offset?: number } = {}) => {
  const res = await client.get('/portal/notifications', { params });
  return res.data as { success: boolean; notifications: NotificationRow[]; unreadCount: number };
};

// GET /api/portal/notifications/unread-count
export const fetchUnreadCount = async () => {
  const res = await client.get('/portal/notifications/unread-count');
  return res.data as { success: boolean; count: number };
};

// PUT /api/portal/notifications/:id/read
export const markRead = async (id: string) => {
  const res = await client.put(`/portal/notifications/${id}/read`);
  return res.data as { success: boolean };
};

// PUT /api/portal/notifications/read-all
export const markAllRead = async () => {
  const res = await client.put('/portal/notifications/read-all');
  return res.data as { success: boolean };
};

// DELETE /api/portal/notifications/:id
export const deleteNotification = async (id: string) => {
  const res = await client.delete(`/portal/notifications/${id}`);
  return res.data as { success: boolean };
};
