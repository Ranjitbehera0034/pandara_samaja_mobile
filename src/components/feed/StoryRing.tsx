// src/components/feed/StoryRing.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Story } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useAuth } from '../../context/AuthContext';

interface Props {
  stories: Story[];
  onAddStory: (mediaUri: string, mediaType: 'image' | 'video') => void;
  onViewStory: (authorId: string) => void;
}

export default function StoryRing({ stories, onAddStory, onViewStory }: Props) {
  const { member, user } = useAuth();
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

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {/* Add Story Circle */}
        <View className="items-center mr-4">
          <TouchableOpacity
            onPress={handlePickStory}
            className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 items-center justify-center relative overflow-hidden"
          >
            {photo ? (
              <Image source={{ uri: photo }} className="w-full h-full opacity-60" resizeMode="cover" />
            ) : (
              <Text className="text-slate-500 font-bold text-xs">{getInitial(displayName)}</Text>
            )}
            <View className="absolute bg-blue-600 p-1 rounded-full">
              <Plus size={12} color="white" />
            </View>
          </TouchableOpacity>
          <Text className="text-slate-400 text-[10px] mt-1 text-center font-medium">Add Story</Text>
        </View>

        {/* Story Circles */}
        {Object.entries(groupedStories).map(([authorId, authorStories]) => {
          const firstStory = authorStories[0];
          const hasUnviewed = authorStories.some(s => !s.viewed);
          const authorPhoto = cleanPhoto(firstStory.authorAvatar);

          return (
            <TouchableOpacity
              key={authorId}
              onPress={() => onViewStory(authorId)}
              className="items-center mr-4"
            >
              <View
                className={`w-14 h-14 rounded-full items-center justify-center p-[2.5px] border-2 ${
                  hasUnviewed ? 'border-blue-600' : 'border-slate-700'
                }`}
              >
                <View className="w-full h-full rounded-full bg-slate-900 overflow-hidden items-center justify-center">
                  {authorPhoto ? (
                    <Image source={{ uri: authorPhoto }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-white font-bold text-xs">
                      {getInitial(firstStory.authorName)}
                    </Text>
                  )}
                </View>
              </View>
              <Text
                className="text-slate-300 text-[10px] mt-1 text-center font-medium"
                numberOfLines={1}
                style={{ width: 64 }}
              >
                {firstStory.authorName.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
