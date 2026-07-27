// src/components/feed/CreatePost.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, Modal, ScrollView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Image as ImageIcon, Video, MapPin, Send, X, BarChart
} from 'lucide-react-native';
import { MediaItem, Poll } from '../../types';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { containsBannedContent } from '../../utils/feedUtils';
import { useAuth } from '../../context/AuthContext';
import PollCreator from './PollCreator';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onPostCreate: (content: string, media?: MediaItem[], files?: any[], poll?: Poll, location?: string) => void;
}

export default function CreatePost({ onPostCreate }: Props) {
  const { member, user } = useAuth();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const [content, setContent] = useState('');
  const [previews, setPreviews] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<Poll | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const displayName = user?.name || member?.name || 'Me';
  const photo = cleanPhoto(user?.profile_photo_url);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newPreviews = result.assets.map(a => ({ uri: a.uri, type: 'image' as const }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newPreviews = result.assets.map(a => ({ uri: a.uri, type: 'video' as const }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePreview = (index: number) => {
    setPreviews(previews.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    if (!content.trim() && previews.length === 0 && !poll) {
      Alert.alert(t('feedComponents', 'genericErrorTitle'), t('feedComponents', 'postValidationErrorMessage'));
      return;
    }

    if (containsBannedContent(content)) {
      Alert.alert(t('feedComponents', 'inappropriateContentTitle'), t('feedComponents', 'inappropriateContentMessage'));
      return;
    }

    // Convert previews to files if needed (for multipart upload)
    const files = previews.map((p) => {
      const uriParts = p.uri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const fileType = p.type === 'video' ? 'video/mp4' : 'image/jpeg';
      return {
        uri: p.uri,
        name: fileName,
        type: fileType,
      };
    });

    const mediaItems: MediaItem[] = previews.map(p => ({
      url: p.uri,
      type: p.type,
    }));

    onPostCreate(content, mediaItems, files, poll, location || undefined);

    // Reset form
    setContent('');
    setPreviews([]);
    setPoll(undefined);
    setLocation('');
    setShowLocationInput(false);
    setShowModal(false);
  };

  return (
    <View className="mb-4">
      {/* Trigger Box */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border + '80' }} className="rounded-2xl border p-4 flex-row items-center gap-3">
        <View style={{ backgroundColor: colors.primary }} className="w-10 h-10 rounded-full overflow-hidden items-center justify-center">
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-white font-bold text-sm">{getInitial(displayName)}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{ backgroundColor: colors.bg + '80', borderColor: colors.border }}
          className="flex-1 border rounded-full px-4 py-2.5"
        >
          <Text style={{ color: colors.textMuted, fontFamily }} className="text-sm">{t('feedComponents', 'shareSomethingPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Editor Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ backgroundColor: '#00000080' }} className="flex-1">
          <View style={{ backgroundColor: colors.bg, borderColor: colors.card }} className="flex-1 mt-16 rounded-t-3xl border-t p-4 flex-col justify-between">
            {/* Header */}
            <View style={{ borderColor: colors.card }} className="flex-row items-center justify-between border-b pb-3 mb-3">
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.textMuted, fontFamily }} className="text-sm">{t('feedComponents', 'cancelButtonLabel')}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-base">{t('feedComponents', 'createPostTitle')}</Text>
              <TouchableOpacity
                onPress={handlePost}
                style={{ backgroundColor: colors.primary }}
                className="px-4 py-1.5 rounded-full"
              >
                <Text style={{ fontFamily }} className="text-white font-semibold text-xs">{t('feedComponents', 'postButtonLabel')}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              {/* Profile Card */}
              <View className="flex-row items-center gap-3 mb-4">
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-10 h-10 rounded-full overflow-hidden items-center justify-center border">
                  {photo ? (
                    <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-white font-bold text-sm">{getInitial(displayName)}</Text>
                  )}
                </View>
                <View>
                  <Text style={{ color: colors.text, fontFamily }} className="font-semibold text-sm">{displayName}</Text>
                  {location ? (
                    <Text style={{ color: colors.primaryLight, fontFamily }} className="text-xs font-medium">📍 {location}</Text>
                  ) : (
                    <Text style={{ color: colors.textFaint, fontFamily }} className="text-xs">{t('feedComponents', 'postingToMemberPortal')}</Text>
                  )}
                </View>
              </View>

              {/* Text Input */}
              <TextInput
                style={{ color: colors.text, fontFamily }}
                className="text-base min-h-[120px] mb-4"
                placeholder={t('feedComponents', 'whatsOnYourMindPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              {/* Location Input Row */}
              {showLocationInput && (
                <View style={{ backgroundColor: colors.bg, borderColor: colors.card }} className="flex-row items-center border rounded-xl px-3 py-1 mb-4">
                  <MapPin size={16} color={colors.primaryLight} />
                  <TextInput
                    style={{ color: colors.text, fontFamily }}
                    className="flex-1 text-sm px-2 py-2"
                    placeholder={t('feedComponents', 'enterLocationPlaceholder')}
                    placeholderTextColor={colors.textFaint}
                    value={location}
                    onChangeText={setLocation}
                  />
                  <TouchableOpacity onPress={() => { setLocation(''); setShowLocationInput(false); }}>
                    <X size={16} color={colors.textFaint} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Poll Display in Editor */}
              {poll && (
                <View style={{ backgroundColor: colors.bg, borderColor: colors.card }} className="border rounded-xl p-3 mb-4 relative">
                  <TouchableOpacity
                    onPress={() => setPoll(undefined)}
                    style={{ backgroundColor: colors.card }}
                    className="absolute top-2 right-2 p-1 rounded-full z-10"
                  >
                    <X size={14} color={colors.error} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontFamily }} className="font-semibold text-sm mb-2">📊 {poll.question}</Text>
                  {poll.options.map((opt, i) => (
                    <View key={i} style={{ backgroundColor: colors.card, borderColor: colors.bg }} className="border rounded-lg px-3 py-2 mb-1.5">
                      <Text style={{ color: colors.textMuted, fontFamily }} className="text-xs">{opt.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Media Previews */}
              {previews.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {previews.map((p, idx) => (
                    <View key={idx} style={{ borderColor: colors.card, backgroundColor: colors.bg }} className="w-20 h-20 rounded-xl overflow-hidden relative border">
                      <Image source={{ uri: p.uri }} className="w-full h-full" resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => removePreview(idx)}
                        style={{ backgroundColor: '#00000099' }}
                        className="absolute top-1 right-1 p-1 rounded-full"
                      >
                        <X size={12} color="white" />
                      </TouchableOpacity>
                      {p.type === 'video' && (
                        <View style={{ backgroundColor: '#0000004d' }} className="absolute inset-0 items-center justify-center">
                          <Text className="text-white text-xs font-bold">▶</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions bar */}
            <View style={{ borderColor: colors.card }} className="border-t pt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {/* Images */}
                <TouchableOpacity onPress={pickImage} style={{ backgroundColor: colors.card }} className="p-2 rounded-xl">
                  <ImageIcon size={20} color={colors.primaryLight} />
                </TouchableOpacity>

                {/* Videos */}
                <TouchableOpacity onPress={pickVideo} style={{ backgroundColor: colors.card }} className="p-2 rounded-xl">
                  <Video size={20} color={colors.female} />
                </TouchableOpacity>

                {/* Poll */}
                <TouchableOpacity onPress={() => setShowPollCreator(true)} style={{ backgroundColor: colors.card }} className="p-2 rounded-xl">
                  <BarChart size={20} color={colors.amber} />
                </TouchableOpacity>

                {/* Location */}
                <TouchableOpacity onPress={() => setShowLocationInput(true)} style={{ backgroundColor: colors.card }} className="p-2 rounded-xl">
                  <MapPin size={20} color={colors.success} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handlePost}
                style={{ backgroundColor: colors.primary }}
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Send size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nested Poll Creator Modal */}
      <Modal visible={showPollCreator} animationType="fade" transparent>
        <View style={{ backgroundColor: '#000000cc' }} className="flex-1 items-center justify-center p-4">
          <View className="w-full">
            <PollCreator
              onSave={(newPoll) => { setPoll(newPoll); setShowPollCreator(false); }}
              onCancel={() => setShowPollCreator(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
