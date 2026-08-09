// src/utils/tempFiles.ts
// compressImage/compressVideo each write a new file to the app's cache
// directory rather than modifying the original in place. Nothing ever
// deleted these afterward, so every photo/video a member ever posted left
// a permanent duplicate copy on their device — the main reason installs
// were measured at 300MB+ despite a ~97MB app binary.
import { File } from 'expo-file-system';

export function deleteTempFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (e) {
    // Best-effort cleanup — a failed delete shouldn't affect the user.
    console.warn('[tempFiles] Failed to delete temp file:', e);
  }
}
