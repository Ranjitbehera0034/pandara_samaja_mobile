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

interface Props {
  onPostCreate: (content: string, media?: MediaItem[], files?: any[], poll?: Poll, location?: string) => void;
}

export default function CreatePost({ onPostCreate }: Props) {
  const { member, user } = useAuth();
  const [content, setContent] = useState('');
  const [previews, setPreviews] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [poll, setPoll] = useState<Poll | undefined>(undefined);
  const [location, setLocation] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showModal, setShowModal] = useState(false);

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
      Alert.alert('Error', 'Please enter some text or add media/poll.');
      return;
    }

    if (containsBannedContent(content)) {
      Alert.alert('Inappropriate Content', 'Your post contains banned words.');
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
      <View className="bg-slate-800 rounded-2xl border border-slate-700/50 p-4 flex-row items-center gap-3">
        <View className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 overflow-hidden items-center justify-center">
          {photo ? (
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <Text className="text-white font-bold text-sm">{getInitial(displayName)}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-full px-4 py-2.5"
        >
          <Text className="text-slate-400 text-sm">Share something with the community...</Text>
        </TouchableOpacity>
      </View>

      {/* Editor Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View className="flex-1 bg-slate-950/80">
          <View className="flex-1 bg-slate-900 mt-16 rounded-t-3xl border-t border-slate-800 p-4 flex-col justify-between">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text className="text-slate-400 text-sm">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-white font-bold text-base">Create Post</Text>
              <TouchableOpacity
                onPress={handlePost}
                className="bg-blue-600 px-4 py-1.5 rounded-full"
              >
                <Text className="text-white font-semibold text-xs">Post</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
              {/* Profile Card */}
              <View className="flex-row items-center gap-3 mb-4">
                <View className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden items-center justify-center border border-slate-700">
                  {photo ? (
                    <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                  ) : (
                    <Text className="text-white font-bold text-sm">{getInitial(displayName)}</Text>
                  )}
                </View>
                <View>
                  <Text className="text-white font-semibold text-sm">{displayName}</Text>
                  {location ? (
                    <Text className="text-blue-400 text-xs font-medium">📍 {location}</Text>
                  ) : (
                    <Text className="text-slate-500 text-xs">Posting to Member Portal</Text>
                  )}
                </View>
              </View>

              {/* Text Input */}
              <TextInput
                className="text-white text-base min-h-[120px] mb-4"
                placeholder="What's on your mind? (Use #tags or @mentions)"
                placeholderTextColor="#64748b"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
              />

              {/* Location Input Row */}
              {showLocationInput && (
                <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 mb-4">
                  <MapPin size={16} color="#3b82f6" />
                  <TextInput
                    className="flex-1 text-white text-sm px-2 py-2"
                    placeholder="Enter location tag..."
                    placeholderTextColor="#64748b"
                    value={location}
                    onChangeText={setLocation}
                  />
                  <TouchableOpacity onPress={() => { setLocation(''); setShowLocationInput(false); }}>
                    <X size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Poll Display in Editor */}
              {poll && (
                <View className="bg-slate-950 border border-slate-800 rounded-xl p-3 mb-4 relative">
                  <TouchableOpacity
                    onPress={() => setPoll(undefined)}
                    className="absolute top-2 right-2 bg-slate-800 p-1 rounded-full z-10"
                  >
                    <X size={14} color="#f87171" />
                  </TouchableOpacity>
                  <Text className="text-white font-semibold text-sm mb-2">📊 {poll.question}</Text>
                  {poll.options.map((opt, i) => (
                    <View key={i} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 mb-1.5">
                      <Text className="text-slate-400 text-xs">{opt.text}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Media Previews */}
              {previews.length > 0 && (
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {previews.map((p, idx) => (
                    <View key={idx} className="w-20 h-20 rounded-xl overflow-hidden relative border border-slate-800 bg-slate-950">
                      <Image source={{ uri: p.uri }} className="w-full h-full" resizeMode="cover" />
                      <TouchableOpacity
                        onPress={() => removePreview(idx)}
                        className="absolute top-1 right-1 bg-black/60 p-1 rounded-full"
                      >
                        <X size={12} color="white" />
                      </TouchableOpacity>
                      {p.type === 'video' && (
                        <View className="absolute inset-0 items-center justify-center bg-black/30">
                          <Text className="text-white text-xs font-bold">▶</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions bar */}
            <View className="border-t border-slate-800 pt-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {/* Images */}
                <TouchableOpacity onPress={pickImage} className="p-2 bg-slate-800 rounded-xl">
                  <ImageIcon size={20} color="#3b82f6" />
                </TouchableOpacity>

                {/* Videos */}
                <TouchableOpacity onPress={pickVideo} className="p-2 bg-slate-800 rounded-xl">
                  <Video size={20} color="#ec4899" />
                </TouchableOpacity>

                {/* Poll */}
                <TouchableOpacity onPress={() => setShowPollCreator(true)} className="p-2 bg-slate-800 rounded-xl">
                  <BarChart size={20} color="#eab308" />
                </TouchableOpacity>

                {/* Location */}
                <TouchableOpacity onPress={() => setShowLocationInput(true)} className="p-2 bg-slate-800 rounded-xl">
                  <MapPin size={20} color="#22c55e" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handlePost}
                className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center"
              >
                <Send size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Nested Poll Creator Modal */}
      <Modal visible={showPollCreator} animationType="fade" transparent>
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
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
