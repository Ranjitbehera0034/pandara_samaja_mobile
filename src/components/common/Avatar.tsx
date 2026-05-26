// src/components/common/Avatar.tsx
// Replicates the avatar logic from App.tsx (profile photo + initial fallback)
import React from 'react';
import { View, Text, Image } from 'react-native';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';

interface AvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  gender?: string | null;
  size?: number;
  showOnlineDot?: boolean;
}

export default function Avatar({
  name, photoUrl, gender, size = 40, showOnlineDot = false
}: AvatarProps) {
  const isFemale = ['female', 'f'].includes((gender || '').toLowerCase());
  const cleanUrl = cleanPhoto(photoUrl);
  const initial = getInitial(name);

  return (
    <View
      style={{ width: size, height: size }}
      className={`rounded-full overflow-hidden border-2 ${isFemale ? 'border-pink-500' : 'border-blue-500'} relative`}
    >
      {cleanUrl ? (
        <Image
          source={{ uri: cleanUrl }}
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
          onError={() => {}}
        />
      ) : (
        <View
          style={{ width: size, height: size }}
          className={`items-center justify-center ${isFemale ? 'bg-pink-500' : 'bg-blue-600'}`}
        >
          <Text className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
            {initial}
          </Text>
        </View>
      )}
      {showOnlineDot && (
        <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border border-slate-800" />
      )}
    </View>
  );
}
