// src/api/feed.ts
import client from './client';

// ── Fetch feed posts (member portal posts) ──
// Backend has always supported page/limit (default page=1, limit=20,
// capped at 50) — the mobile app just never passed them or fetched a
// second page, so the feed was silently stuck at whatever page 1 returned
// with no way to scroll further back.
export const fetchFeedPosts = async (page = 1, limit = 20) => {
  const res = await client.get('/portal/posts', { params: { page, limit } });
  return res.data;
};

// ── Fetch admin announcements ──
export const fetchAnnouncements = async () => {
  const res = await client.get('/posts');
  return res.data;
};

export interface FacebookLinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export type FacebookContent =
  | { type: 'video'; embedHtml: string; image: string | null }
  | { type: 'link'; preview: FacebookLinkPreview };

// ── Resolve a shared Facebook link: a playable video embed when it
// resolves to a real /reel/ or /videos/ URL, otherwise a WhatsApp-style
// Open Graph link preview (title/description/image). ──
export const fetchFacebookContent = async (url: string) => {
  const res = await client.get('/portal/link-preview', { params: { url } });
  return res.data as { success: boolean; message?: string; content: FacebookContent | null };
};

export interface YouTubeChannelPreview {
  title: string | null;
  image: string | null;
}

// ── Channel name + avatar for a shared YouTube channel link (no single
// video to embed) ──
export const fetchYouTubeChannelPreview = async (url: string) => {
  const res = await client.get('/portal/youtube-channel-preview', { params: { url } });
  return res.data as { success: boolean; message?: string; preview: YouTubeChannelPreview | null };
};

// ── Like / Unlike a post ──
export const likePost = async (postId: string) => {
  const res = await client.post(`/portal/posts/${postId}/like`);
  return res.data;
};

// ── Create a post (multipart form) ──
export const createPost = async (formData: FormData) => {
  const res = await client.post('/portal/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── Delete a post ──
export const deletePost = async (postId: string) => {
  const res = await client.delete(`/portal/posts/${postId}`);
  return res.data;
};

// ── Edit a post ──
export const editPost = async (postId: string, text: string) => {
  const res = await client.put(`/portal/posts/${postId}`, { text });
  return res.data;
};

// ── Report a post ──
export const reportPost = async (postId: string, reason: string) => {
  const res = await client.post(`/portal/posts/${postId}/report`, { reason });
  return res.data;
};

// ── Share a post ──
export const sharePost = async (postId: string) => {
  const res = await client.post(`/portal/posts/${postId}/share`);
  return res.data;
};

// ── Record video view ──
export const recordView = async (postId: string, data: { durationSeconds: number; segments: number[] }) => {
  const res = await client.post(`/portal/posts/${postId}/view`, data);
  return res.data;
};

// ── Fetch comments for a post ──
export const fetchComments = async (postId: string, page = 1, limit = 5) => {
  const res = await client.get(`/portal/posts/${postId}/comments?page=${page}&limit=${limit}`);
  return res.data;
};

// ── Add a comment ──
export const addComment = async (postId: string, text: string, parentId?: string) => {
  const res = await client.post(`/portal/posts/${postId}/comments`, { text, parentId });
  return res.data;
};

// ── Like a comment ──
export const likeComment = async (commentId: string) => {
  const res = await client.post(`/portal/comments/${commentId}/like`);
  return res.data;
};

// ── Fetch stories ──
export const fetchStories = async () => {
  const res = await client.get('/portal/stories');
  return res.data;
};

// ── Create a story (multipart form) ──
export const createStory = async (formData: FormData) => {
  const res = await client.post('/portal/stories', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ── Delete your own story ──
export const deleteStory = async (storyId: string) => {
  const res = await client.delete(`/portal/stories/${storyId}`);
  return res.data as { success: boolean; message?: string };
};

// ── Record that you viewed a story (no-ops server-side if it's your own) ──
export const recordStoryView = async (storyId: string) => {
  const res = await client.post(`/portal/stories/${storyId}/view`);
  return res.data as { success: boolean };
};

export interface StoryViewer {
  membershipNo: string;
  name: string;
  photo: string | null;
  viewedAt: string;
}

// ── Who has viewed your story (author-only) ──
export const fetchStoryViewers = async (storyId: string) => {
  const res = await client.get(`/portal/stories/${storyId}/views`);
  return res.data as { success: boolean; message?: string; count: number; viewers: StoryViewer[] };
};

// ── Like / unlike a story ──
export const likeStory = async (storyId: string) => {
  const res = await client.post(`/portal/stories/${storyId}/like`);
  return res.data as { success: boolean; message?: string; liked: boolean; likes_count: number };
};

export interface StoryComment {
  id: string;
  memberId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: string;
}

// ── Fetch comments for a story ──
export const fetchStoryComments = async (storyId: string) => {
  const res = await client.get(`/portal/stories/${storyId}/comments`);
  return res.data as { success: boolean; message?: string; comments: StoryComment[] };
};

// ── Add a comment to a story ──
export const addStoryComment = async (storyId: string, text: string) => {
  const res = await client.post(`/portal/stories/${storyId}/comments`, { text });
  return res.data as { success: boolean; message?: string; comment: StoryComment };
};

// ── Report a story (auto-hides it pending admin review) ──
export const reportStory = async (storyId: string, reason: string) => {
  const res = await client.post(`/portal/stories/${storyId}/report`, { reason });
  return res.data as { success: boolean; message?: string };
};
