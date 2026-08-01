// src/components/feed/CreatePost.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, Modal, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  Image as ImageIcon, Video, MapPin, Send, X, BarChart
} from 'lucide-react-native';
import { MediaItem, Poll } from '../../types';
import { containsBannedContent } from '../../utils/feedUtils';
import { compressImage } from '../../utils/imageCompression';
import { useAuth } from '../../context/AuthContext';
import PollCreator from './PollCreator';
import Avatar from '../common/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface Props {
  onPostCreate: (content: string, media?: MediaItem[], files?: any[], poll?: Poll, location?: string) => void;
}

export default function CreatePost({ onPostCreate }: Props) {
  const { member, user } = useAuth();
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const [content, setContent] = useState('');
  const [previews, setPreviews] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<Poll | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [posting, setPosting] = useState(false);

  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const displayName = user?.name || member?.name || 'Me';

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

  const handlePost = async () => {
    if (posting) return;
    if (!content.trim() && previews.length === 0 && !poll) {
      Alert.alert(t('feedComponents', 'genericErrorTitle'), t('feedComponents', 'postValidationErrorMessage'));
      return;
    }

    if (containsBannedContent(content)) {
      Alert.alert(t('feedComponents', 'inappropriateContentTitle'), t('feedComponents', 'inappropriateContentMessage'));
      return;
    }

    setPosting(true);
    try {
      // Photos come straight from the camera/library uncompressed (often
      // several MB at full resolution) — downscale before upload so the
      // feed loads quickly for everyone. Video isn't compressed here.
      const uploadUris = await Promise.all(
        previews.map((p) => (p.type === 'image' ? compressImage(p.uri) : Promise.resolve(p.uri)))
      );

      // Convert previews to files if needed (for multipart upload)
      const files = previews.map((p, i) => {
        const uploadUri = uploadUris[i];
        const uriParts = uploadUri.split('/');
        const fileName = uriParts[uriParts.length - 1];
        const fileType = p.type === 'video' ? 'video/mp4' : 'image/jpeg';
        return {
          uri: uploadUri,
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
    } finally {
      setPosting(false);
    }
  };

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {/* Trigger Box */}
      <View
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border + '80',
          borderRadius: radius.lg,
          borderWidth: 1,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Avatar name={displayName} photoUrl={user?.profile_photo_url} size={40} />
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          style={{
            backgroundColor: colors.bg + '80',
            borderColor: colors.border,
            flex: 1,
            borderWidth: 1,
            borderRadius: radius.full,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm + 2,
          }}
        >
          <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{t('feedComponents', 'shareSomethingPlaceholder')}</Text>
        </TouchableOpacity>
      </View>

      {/* Editor Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ backgroundColor: '#00000080', flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.card,
              flex: 1,
              marginTop: 64,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderTopWidth: 1,
              padding: spacing.lg,
              flexDirection: 'column',
              justifyContent: 'space-between',
              ...shadow.raised,
            }}
          >
            {/* Header */}
            <View style={{ borderColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingBottom: spacing.md, marginBottom: spacing.md }}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={{ color: colors.textMuted, fontFamily, ...typography.body }}>{t('feedComponents', 'cancelButtonLabel')}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>{t('feedComponents', 'createPostTitle')}</Text>
              <TouchableOpacity
                onPress={handlePost}
                disabled={posting}
                style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: radius.full, opacity: posting ? 0.6 : 1 }}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontFamily, color: '#fff', ...typography.bodyEmphasis }}>{t('feedComponents', 'postButtonLabel')}</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
              {/* Profile Card */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }}>
                <Avatar name={displayName} photoUrl={user?.profile_photo_url} size={40} />
                <View>
                  <Text style={{ color: colors.text, fontFamily, ...typography.label }}>{displayName}</Text>
                  {location ? (
                    <Text style={{ color: colors.primaryLight, fontFamily, ...typography.caption }}>📍 {location}</Text>
                  ) : (
                    <Text style={{ color: colors.textFaint, fontFamily, ...typography.caption }}>{t('feedComponents', 'postingToMemberPortal')}</Text>
                  )}
                </View>
              </View>

              {/* Text Input */}
              <TextInput
                style={{ color: colors.text, fontFamily, minHeight: 120, marginBottom: spacing.lg, ...typography.body }}
                placeholder={t('feedComponents', 'whatsOnYourMindPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              {/* Location Input Row */}
              {showLocationInput && (
                <View
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.card,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.xs,
                    marginBottom: spacing.lg,
                  }}
                >
                  <MapPin size={16} color={colors.primaryLight} />
                  <TextInput
                    style={{ color: colors.text, fontFamily, flex: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, ...typography.body }}
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
                <View
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.card,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                    position: 'relative',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPoll(undefined)}
                    style={{ backgroundColor: colors.card, position: 'absolute', top: spacing.sm, right: spacing.sm, padding: spacing.xs, borderRadius: radius.full, zIndex: 10 }}
                  >
                    <X size={16} color={colors.error} />
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontFamily, marginBottom: spacing.sm, ...typography.bodyEmphasis }}>📊 {poll.question}</Text>
                  {poll.options.map((opt, i) => (
                    <View key={i} style={{ backgroundColor: colors.card, borderColor: colors.bg, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.xs }}>
                      <Text style={{ color: colors.textMuted, fontFamily, ...typography.caption }}>{opt.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Media Previews */}
              {previews.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                  {previews.map((p, idx) => (
                    <View key={idx} style={{ borderColor: colors.card, backgroundColor: colors.bg, width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden', position: 'relative', borderWidth: 1 }}>
                      <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => removePreview(idx)}
                        style={{ backgroundColor: '#00000099', position: 'absolute', top: spacing.xs, right: spacing.xs, padding: spacing.xs, borderRadius: radius.full }}
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                      {p.type === 'video' && (
                        <View style={{ backgroundColor: '#0000004d', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', ...typography.caption }}>▶</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions bar */}
            <View style={{ borderColor: colors.card, borderTopWidth: 1, paddingTop: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {/* Images */}
                <TouchableOpacity onPress={pickImage} style={{ backgroundColor: colors.card, padding: spacing.sm, borderRadius: radius.md }}>
                  <ImageIcon size={20} color={colors.primaryLight} />
                </TouchableOpacity>

                {/* Videos */}
                <TouchableOpacity onPress={pickVideo} style={{ backgroundColor: colors.card, padding: spacing.sm, borderRadius: radius.md }}>
                  <Video size={20} color={colors.female} />
                </TouchableOpacity>

                {/* Poll */}
                <TouchableOpacity onPress={() => setShowPollCreator(true)} style={{ backgroundColor: colors.card, padding: spacing.sm, borderRadius: radius.md }}>
                  <BarChart size={20} color={colors.amber} />
                </TouchableOpacity>

                {/* Location */}
                <TouchableOpacity onPress={() => setShowLocationInput(true)} style={{ backgroundColor: colors.card, padding: spacing.sm, borderRadius: radius.md }}>
                  <MapPin size={20} color={colors.success} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handlePost}
                disabled={posting}
                style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', opacity: posting ? 0.6 : 1 }}
              >
                {posting ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="white" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nested Poll Creator Modal */}
      <Modal visible={showPollCreator} animationType="fade" transparent>
        <View style={{ backgroundColor: '#000000cc', flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <View style={{ width: '100%' }}>
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
