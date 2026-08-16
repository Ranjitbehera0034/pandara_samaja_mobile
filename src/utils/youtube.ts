const YOUTUBE_URL_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYouTubeId(text: string): string | null {
  if (!text) return null;
  const match = text.match(YOUTUBE_URL_RE);
  return match ? match[1] : null;
}
