// src/api/songContest.ts
// Member-facing Song Competition — register (solo or group), upload a
// video, like/comment on approved entries. See backend ARCHITECTURE.md's
// "Song Competition" section.
import client from './client';

export interface SongContest {
  id: string | number;
  title: string;
  description?: string | null;
  rules?: string | null;
  status: 'draft' | 'active' | 'closed';
  started_at?: string | null;
  closed_at?: string | null;
  created_at: string;
}

export interface SongContestEntry {
  id: string | number;
  contest_id: string | number;
  entry_type: 'individual' | 'group';
  entry_name: string;
  village?: string | null;
  participant_names?: string | null;
  registered_by_membership_no: string;
  registered_by_mobile: string;
  video_url: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  admin_remarks?: string | null;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
  created_at: string;
}

export interface SongContestComment {
  id: string | number;
  entry_id: string | number;
  membership_no: string;
  mobile: string;
  content: string;
  author_name?: string;
  created_at: string;
}

// GET /api/portal/song-contests
export const fetchContests = async () => {
  const res = await client.get('/portal/song-contests');
  return res.data as { success: boolean; contests: SongContest[] };
};

// GET /api/portal/song-contests/:id
export const fetchContestById = async (id: string | number) => {
  const res = await client.get(`/portal/song-contests/${id}`);
  return res.data as { success: boolean; contest: SongContest };
};

// GET /api/portal/song-contests/:id/my-entry
export const fetchMyEntry = async (contestId: string | number) => {
  const res = await client.get(`/portal/song-contests/${contestId}/my-entry`);
  return res.data as { success: boolean; entry: SongContestEntry | null };
};

// POST /api/portal/song-contests/:id/entries — multipart form data.
// A song video is much larger/slower to upload than a post/story clip, so
// this uses a longer timeout than the client's global 15s default.
export const submitEntry = async (contestId: string | number, formData: FormData) => {
  const res = await client.post(`/portal/song-contests/${contestId}/entries`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return res.data as { success: boolean; entry?: SongContestEntry; message?: string };
};

// GET /api/portal/song-contests/:id/entries
export const fetchEntries = async (contestId: string | number) => {
  const res = await client.get(`/portal/song-contests/${contestId}/entries`);
  return res.data as { success: boolean; entries: SongContestEntry[] };
};

export const likeEntry = async (entryId: string | number) => {
  const res = await client.post(`/portal/song-contests/entries/${entryId}/like`);
  return res.data as { success: boolean };
};

export const unlikeEntry = async (entryId: string | number) => {
  const res = await client.delete(`/portal/song-contests/entries/${entryId}/like`);
  return res.data as { success: boolean };
};

export const fetchComments = async (entryId: string | number) => {
  const res = await client.get(`/portal/song-contests/entries/${entryId}/comments`);
  return res.data as { success: boolean; comments: SongContestComment[] };
};

export const addComment = async (entryId: string | number, content: string) => {
  const res = await client.post(`/portal/song-contests/entries/${entryId}/comments`, { content });
  return res.data as { success: boolean; comment: SongContestComment };
};
