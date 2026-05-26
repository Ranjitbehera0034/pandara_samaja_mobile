// src/utils/googleDriveUrl.ts

export const cleanPhoto = (url?: string | null): string | null => {
  if (!url) return null;
  // Transform Google Drive direct link to proxy URL
  if (url.includes('drive.google.com/uc?id=')) {
    return url.replace(
      'drive.google.com/uc?id=',
      'lh3.googleusercontent.com/d/'
    );
  }
  return url;
};

export const getInitial = (name?: string | null): string => {
  return name ? name.charAt(0).toUpperCase() : '?';
};
