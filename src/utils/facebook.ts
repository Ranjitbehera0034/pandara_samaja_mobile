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
