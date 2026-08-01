// src/api/live.ts
import client from './client';

export interface LiveStream {
  id: number;
  room_name: string;
  host_type: 'member' | 'admin' | 'superadmin';
  host_id: string;
  host_name: string | null;
  host_photo: string | null;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  peak_viewers: number;
}

export interface LiveTokenResponse {
  success: boolean;
  message?: string;
  room: LiveStream;
  token: string;
  wsUrl: string;
}

// ── Start a live stream (broadcaster) ──
export const startLiveStream = async (title?: string) => {
  const res = await client.post('/portal/live/start', { title });
  return res.data as LiveTokenResponse;
};

// ── End your own live stream ──
export const endLiveStream = async (roomName: string) => {
  const res = await client.post(`/portal/live/${roomName}/end`);
  return res.data as { success: boolean; message?: string };
};

// ── List currently-active live streams (feed discovery) ──
export const fetchActiveLiveStreams = async () => {
  const res = await client.get('/portal/live/active');
  return res.data as { success: boolean; streams: LiveStream[] };
};

// ── Get a viewer (subscribe-only) token for a live stream ──
export const fetchLiveViewerToken = async (roomName: string) => {
  const res = await client.get(`/portal/live/${roomName}/token`);
  return res.data as LiveTokenResponse;
};
