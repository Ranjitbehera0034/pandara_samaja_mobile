// src/api/feed.ts
import client from './client';

// ── Fetch feed posts (member portal posts) ──
export const fetchFeedPosts = async () => {
  const res = await client.get('/portal/posts');
  return res.data;
};

// ── Fetch admin announcements ──
export const fetchAnnouncements = async () => {
  const res = await client.get('/posts');
  return res.data;
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
