// src/components/feed/StoryRing.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCameraPermission } from 'react-native-vision-camera';
import { Story } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import StoryCameraScreen from './StoryCameraScreen';
import ErrorBoundary from '../common/ErrorBoundary';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  stories: Story[];
  onAddStory: (mediaUri: string, mediaType: 'image' | 'video') => void;
  onViewStory: (authorId: string) => void;
}

export default function StoryRing({ stories, onAddStory, onViewStory }: Props) {
  const { member, user } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const { hasPermission, requestPermission } = useCameraPermission();
  const [showCamera, setShowCamera] = useState(false);
  const displayName = user?.name || member?.name || 'Me';
  const photo = cleanPhoto(user?.profile_photo_url);

  // Group stories by author
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.authorId]) {
      acc[story.authorId] = [];
    }
    acc[story.authorId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const handlePickStory = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      onAddStory(asset.uri, type);
    }
  };

  const handleOpenCamera = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(t('feed', 'storyCameraPermissionDeniedTitle'), t('feed', 'storyCameraPermissionDeniedMessage'));
        return;
      }
    }
    setShowCamera(true);
  };

  const handleAddStoryPress = () => {
    Alert.alert(
      t('feed', 'addStoryChooseTitle'),
      t('feed', 'addStoryChooseMessage'),
      [
        { text: t('feedComponents', 'cancelButtonLabel'), style: 'cancel' },
        { text: t('feed', 'addStoryCameraOption'), onPress: handleOpenCamera },
        { text: t('feed', 'addStoryGalleryOption'), onPress: handlePickStory },
      ]
    );
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.xs }}
      >
        {/* Add Story Circle */}
        <View style={{ alignItems: 'center', marginRight: spacing.lg }}>
          <TouchableOpacity
            onPress={handleAddStoryPress}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              width: 56,
              height: 56,
              borderRadius: radius.full,
              borderWidth: 2,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%', opacity: 0.6 }} resizeMode="cover" />
            ) : (
              <Text style={{ color: colors.textFaint, ...typography.caption }}>{getInitial(displayName)}</Text>
            )}
            <View style={{ backgroundColor: colors.primary, position: 'absolute', padding: spacing.xs, borderRadius: radius.full }}>
              <Plus size={16} color="white" />
            </View>
          </TouchableOpacity>
          <Text
            style={{ color: colors.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, width: 64, marginTop: spacing.xs, textAlign: 'center', ...typography.caption, fontSize: 10, lineHeight: 13 }}
          >
            {t('feedComponents', 'addStoryLabel')}
          </Text>
        </View>

        {/* Story Circles */}
        {Object.entries(groupedStories).map(([authorId, authorStories]) => {
          const firstStory = authorStories[0];
          const hasUnviewed = authorStories.some(s => !s.viewed);

          return (
            <TouchableOpacity
              key={authorId}
              onPress={() => onViewStory(authorId)}
              style={{ alignItems: 'center', marginRight: spacing.lg }}
            >
              <View
                style={{
                  borderColor: hasUnviewed ? colors.primary : colors.border,
                  width: 56,
                  height: 56,
                  borderRadius: radius.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2.5,
                  borderWidth: 2,
                }}
              >
                <Avatar name={firstStory.authorName} photoUrl={firstStory.authorAvatar} size={47} />
              </View>
              <Text
                style={{ color: colors.text, width: 64, marginTop: spacing.xs, textAlign: 'center', ...typography.caption, fontSize: 10, lineHeight: 13 }}
                numberOfLines={1}
              >
                {firstStory.authorName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {showCamera && (
        <ErrorBoundary
          fallback={() => null}
          onError={() => {
            setShowCamera(false);
            Alert.alert(t('feed', 'storyCameraPermissionDeniedTitle'), t('feed', 'storyCameraCrashedMessage'));
          }}
        >
          <StoryCameraScreen
            visible={showCamera}
            onClose={() => setShowCamera(false)}
            onCapture={onAddStory}
          />
        </ErrorBoundary>
      )}
    </View>
  );
}
