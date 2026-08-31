const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(text: string): string | null {
  if (!text) return null;
  const match = text.match(YOUTUBE_URL_RE);
  return match ? match[1] : null;
}

// A youtube.com/@handle, /channel/UC..., /c/..., or /user/... link — a
// channel, not a single video. Same "grab the URL up to next whitespace"
// approach as utils/facebook.ts, since these can carry a trailing
// ?si=... share-tracking param that's not meaningful to strip out.
const YOUTUBE_CHANNEL_URL_RE = /https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:@[\w.-]+|channel\/[\w-]+|c\/[\w.-]+|user\/[\w.-]+)\S*/i;

export function extractYouTubeChannelUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(YOUTUBE_CHANNEL_URL_RE);
  return match ? match[0] : null;
}
