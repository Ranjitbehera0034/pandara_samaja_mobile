// src/utils/media.ts
//
// Posts store all media (images AND videos) in one `images text[]` column —
// there's no separate video flag in the DB. When we fall back to deriving a
// "media" array from raw image URLs (as opposed to a post that already
// carries a proper `media: [{url, type}]` array from the backend), we must
// infer the type from the URL's file extension instead of hardcoding
// `type: 'image'` for everything — otherwise real video URLs render through
// an <Image> component instead of <Video> (blank/broken playback).
//
// This works because Firebase signed URLs preserve the original file
// extension in the path portion before the `?` query string
// (e.g. `.../file.mp4?X-Goog-Signature=...`), and Google Drive/legacy URLs
// without a recognizable extension safely default to 'image' (today's
// behavior, no regression).

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|3gp|avi)(\?|$)/i;

export function inferMediaType(url: string): 'image' | 'video' {
  return VIDEO_EXTENSIONS.test(url) ? 'video' : 'image';
}

export function urlsToMedia(
  urls: (string | null | undefined)[] | null | undefined
): { url: string; type: 'image' | 'video' }[] {
  return (urls || [])
    .filter((u): u is string => !!u)
    .map(url => ({ url, type: inferMediaType(url) }));
}
