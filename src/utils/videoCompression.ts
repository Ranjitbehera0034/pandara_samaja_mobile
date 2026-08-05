// src/utils/videoCompression.ts
// Videos picked straight from a phone camera can run 20-100+MB — a heavy
// upload for the poster and an even heavier download for every viewer on
// mobile data. Compress like WhatsApp does before upload.
import { Video } from 'react-native-compressor';

export async function compressVideo(uri: string): Promise<string> {
  try {
    const result = await Video.compress(uri, { compressionMethod: 'auto' });
    return result;
  } catch (e) {
    // Compression is an optimization, not a requirement — fall back to the
    // original file rather than blocking the upload if it fails for any reason.
    console.warn('[videoCompression] Failed to compress, using original:', e);
    return uri;
  }
}
