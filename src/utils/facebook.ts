// src/utils/facebook.ts
// Matches facebook.com and its fb.watch short-link domain. Deliberately
// simple (grabs the URL up to the next whitespace) — same philosophy as
// utils/youtube.ts's extractor, not a full URL parser.
const FACEBOOK_URL_RE = /https?:\/\/(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/\S+/i;

export function extractFacebookUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(FACEBOOK_URL_RE);
  return match ? match[0] : null;
}

// A path segment (or query param) that marks the URL as pointing at one
// specific piece of content — a post, video, photo, reel, or share link —
// as opposed to a bare page/profile URL. Confirmed live: Meta's oEmbed
// post/video endpoints only work against content URLs; given a bare page
// URL, oembed_post errors immediately (code 100) while oembed_video
// "succeeds" with an empty fb-video div pointed at the page (no actual
// video), which then silently limps through the WebView for the full 6s
// detection window before falling back — misleading and slow for
// something we already know can't be embedded as a single post.
const FACEBOOK_CONTENT_PATH_RE = /\/(posts|videos|photos|reel|reels|watch|share|permalink\.php|story\.php)\b/i;

export function isFacebookPageUrl(url: string): boolean {
  if (/fb\.watch\//i.test(url)) return false; // always a video short-link
  if (/[?&](story_fbid|v)=/i.test(url)) return false; // content identified via query param
  if (FACEBOOK_CONTENT_PATH_RE.test(url)) return false;
  return true;
}
