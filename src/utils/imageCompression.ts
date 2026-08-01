// src/utils/imageCompression.ts
// Photos picked straight from a phone camera are commonly 3-8MB and
// several thousand pixels wide — far more than a feed/story image needs to
// display well, and slow to upload/download on mobile data. Resize to a
// sane max dimension and re-encode at moderate JPEG quality before upload.
import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

export async function compressImage(uri: string): Promise<string> {
  try {
    const { width, height } = await getImageSize(uri);
    const longestSide = Math.max(width, height);

    let context = ImageManipulator.manipulate(uri);
    // Only downscale — never upscale an already-small image.
    if (longestSide > MAX_DIMENSION) {
      context = width >= height
        ? context.resize({ width: MAX_DIMENSION })
        : context.resize({ height: MAX_DIMENSION });
    }
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return result.uri;
  } catch (e) {
    // Compression is an optimization, not a requirement — fall back to the
    // original file rather than blocking the upload if it fails for any reason.
    console.warn('[imageCompression] Failed to compress, using original:', e);
    return uri;
  }
}
