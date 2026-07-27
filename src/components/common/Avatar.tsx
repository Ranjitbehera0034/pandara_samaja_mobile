// src/components/common/Avatar.tsx
// Replicates the avatar logic from App.tsx (profile photo + initial fallback)
import React from 'react';
import { View, Text, Image } from 'react-native';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';

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
  const { colors } = useTheme();
  const isFemale = ['female', 'f'].includes((gender || '').toLowerCase());
  const cleanUrl = cleanPhoto(photoUrl);
  const initial = getInitial(name);
  const accentColor = isFemale ? colors.female : colors.male;

  return (
    <View
      style={{ width: size, height: size, borderColor: accentColor }}
      className="rounded-full overflow-hidden border-2 relative"
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
          style={{ width: size, height: size, backgroundColor: accentColor }}
          className="items-center justify-center"
        >
          <Text className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
            {initial}
          </Text>
        </View>
      )}
      {showOnlineDot && (
        <View
          style={{ backgroundColor: colors.success, borderColor: colors.card }}
          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border"
        />
      )}
    </View>
  );
}
