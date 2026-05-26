// src/utils/feedUtils.ts

// Port censorText from PostCard.tsx
const BANNED_WORDS = ['nude', 'naked', 'xxx', 'porn', 'sex', 'nsfw', 'adult content', 'explicit', 'obscene', 'vulgar'];
const PROFANITY_WORDS = ['damn', 'hell', 'crap', 'stupid', 'idiot'];

export const censorText = (text: string): string => {
  let result = text;
  BANNED_WORDS.forEach(word => {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), '***');
  });
  PROFANITY_WORDS.forEach(word => {
    result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), (m) => m[0] + '*'.repeat(m.length - 1));
  });
  return result;
};

export const containsBannedContent = (text: string): boolean => {
  return BANNED_WORDS.some(w => text.toLowerCase().includes(w));
};

// Port timeAgoShort from PostCard.tsx
export const timeAgoShort = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(timestamp).toLocaleDateString();
};

// Detect if URL is a video
export const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg|qt)(\?|$)/i.test(url.toLowerCase());
};

// Map post API response to Post type
export const mapPost = (p: any) => ({
  id: p.id.toString(),
  authorId: p.author_id,
  authorName: p.author_name,
  authorAvatar: p.author_photo,
  location: p.location,
  content: p.text_content || '',
  images: p.images || [],
  media: (p.media || []).map((m: any) => ({ url: m.url, type: m.type || 'image' })),
  likes: Number(p.likes_count) || 0,
  reactions: { like: Number(p.likes_count) || 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  commentsCount: Number(p.comments_count) || 0,
  timestamp: p.created_at,
  isLiked: p.liked_by_me || false,
  isBookmarked: false,
  shareCount: Number(p.share_count) || 0,
  views_count: Number(p.views_count) || 0,
  poll: p.poll ? {
    question: p.poll.question,
    options: (p.poll.options || []).map((o: any) => ({ id: o.id.toString(), text: o.text, votes: Number(o.votes) || 0 })),
    totalVotes: Number(p.poll.total_votes) || 0,
    myVote: p.poll.my_vote?.toString() || undefined,
    endsAt: p.poll.ends_at,
  } : undefined,
});

// Map announcement API response to Post type
export const mapAnnouncement = (p: any) => ({
  id: `annc_${p.id}`,
  authorId: 'admin',
  authorName: 'Pandara Samaja Admin',
  authorAvatar: 'https://cdn-icons-png.flaticon.com/512/9133/9133036.png',
  location: undefined,
  content: `📢 OFFICIAL ANNOUNCEMENT: ${p.title}\n\n${p.content}`,
  images: [p.image_url, p.video_url].filter(Boolean) as string[],
  media: [
    ...(p.image_url ? [{ url: p.image_url, type: 'image' as const }] : []),
    ...(p.video_url ? [{ url: p.video_url, type: 'video' as const }] : []),
  ],
  likes: 0,
  reactions: { like: 0, love: 0, haha: 0, wow: 0, sad: 0, angry: 0 },
  comments: [],
  commentsCount: 0,
  timestamp: p.created_at,
  isLiked: false,
  isBookmarked: false,
  shareCount: 0,
});

// Map comment API response
export const mapComment = (c: any) => ({
  id: c.id.toString(),
  authorId: c.member_id,
  authorName: c.author_name,
  authorAvatar: c.author_photo,
  content: c.text,
  timestamp: c.created_at,
  parentId: c.parent_id?.toString() || undefined,
  replies: [],
  likes: Number(c.likes_count) || 0,
  isLiked: false,
});

// Reaction config — matches web exactly
export const REACTIONS = [
  { type: 'like' as const, emoji: '👍', label: 'Like', color: '#3b82f6' },
  { type: 'love' as const, emoji: '❤️', label: 'Love', color: '#f43f5e' },
  { type: 'haha' as const, emoji: '😂', label: 'Haha', color: '#f59e0b' },
  { type: 'wow' as const, emoji: '😮', label: 'Wow', color: '#f59e0b' },
  { type: 'sad' as const, emoji: '😢', label: 'Sad', color: '#f59e0b' },
  { type: 'angry' as const, emoji: '😡', label: 'Angry', color: '#f97316' },
];
