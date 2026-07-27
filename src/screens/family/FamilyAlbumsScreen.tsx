// src/screens/family/FamilyAlbumsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, Alert, RefreshControl, ActivityIndicator, Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Plus, X, Trash2, ImagePlus, Images } from 'lucide-react-native';
import * as familyApi from '../../api/family';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import SkeletonBox from '../../components/common/SkeletonBox';
import EmptyState from '../../components/common/EmptyState';

const { width: W } = Dimensions.get('window');

interface AlbumPhoto {
  id: string | number;
  url: string;
  caption?: string | null;
  uploadedAt?: string;
}

interface Album {
  id: string | number;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  photo_count: number | string;
  photos: AlbumPhoto[];
  created_at?: string;
}

function AlbumsSkeleton({ colors, spacing, radius, cardWidth }: any) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={{ width: cardWidth }}>
          <SkeletonBox width={cardWidth} height={cardWidth} borderRadius={radius.lg} />
          <SkeletonBox width="80%" height={14} style={{ marginTop: spacing.sm }} />
          <SkeletonBox width="40%" height={11} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

export default function FamilyAlbumsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontFamily = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontFamilyBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const cardWidth = (W - spacing.lg * 2 - spacing.md) / 2;

  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCover, setNewCover] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [creating, setCreating] = useState(false);

  // Detail modal state
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [addingPhotos, setAddingPhotos] = useState(false);

  const loadAlbums = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await familyApi.fetchAlbums();
      if (data.success) setAlbums(data.albums || []);
    } catch (e) {
      console.error('[FAMILY_ALBUMS] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('familyAlbums', 'loadError'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    loadAlbums(true);
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewCover(null);
  };

  const handlePickCover = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uriParts = asset.uri.split('/');
      setNewCover({ uri: asset.uri, name: uriParts[uriParts.length - 1], type: 'image/jpeg' });
    }
  };

  const handleCreateAlbum = async () => {
    if (!newTitle.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('familyAlbums', 'titleRequiredError'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('title', newTitle.trim());
      if (newDescription.trim()) formData.append('description', newDescription.trim());
      if (newCover) {
        // @ts-ignore — React Native FormData file shape
        formData.append('cover', newCover);
      }
      const data = await familyApi.createAlbum(formData);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setAlbums(prev => [data.album, ...prev]);
        setShowCreateModal(false);
        resetCreateForm();
      }
    } catch (e) {
      console.error('[FAMILY_ALBUMS] Create failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('familyAlbums', 'createError'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlbum = (album: Album) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('familyAlbums', 'deleteAlbumConfirmTitle'),
      t('familyAlbums', 'deleteAlbumConfirmMessage'),
      [
        { text: t('familyAlbums', 'cancelButton'), style: 'cancel' },
        {
          text: t('common', 'delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await familyApi.deleteAlbum(album.id);
              if (data.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setAlbums(prev => prev.filter(a => a.id !== album.id));
                if (activeAlbum?.id === album.id) setActiveAlbum(null);
              }
            } catch (e) {
              console.error('[FAMILY_ALBUMS] Delete failed:', e);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(t('common', 'errorTitle'), t('familyAlbums', 'deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleAddPhotos = async () => {
    if (!activeAlbum) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddingPhotos(true);
    try {
      const formData = new FormData();
      result.assets.forEach((asset) => {
        const uriParts = asset.uri.split('/');
        const file = { uri: asset.uri, name: uriParts[uriParts.length - 1], type: 'image/jpeg' };
        // @ts-ignore — React Native FormData file shape
        formData.append('photos', file);
      });
      const data = await familyApi.addAlbumPhotos(activeAlbum.id, formData);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const newPhotos: AlbumPhoto[] = data.photos || [];
        setActiveAlbum(prev => prev ? { ...prev, photos: [...prev.photos, ...newPhotos] } : prev);
        setAlbums(prev => prev.map(a => a.id === activeAlbum.id
          ? { ...a, photos: [...a.photos, ...newPhotos], photo_count: (Number(a.photo_count) || 0) + newPhotos.length }
          : a));
      }
    } catch (e) {
      console.error('[FAMILY_ALBUMS] Add photos failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('familyAlbums', 'addPhotosError'));
    } finally {
      setAddingPhotos(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{ borderBottomColor: C.border, backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        className="border-b flex-row items-center justify-between"
      >
        <View style={{ gap: spacing.md }} className="flex-row items-center">
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
            style={{ backgroundColor: C.card + '80', padding: spacing.xs, borderRadius: radius.full }}
          >
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.heading }}>
            {t('familyAlbums', 'title')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCreateModal(true); }}
          style={{ backgroundColor: C.primary + '10', borderColor: C.primaryLight + '20', padding: spacing.sm, borderRadius: radius.full }}
          className="border"
        >
          <Plus size={16} color={C.primaryLight} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
        }
      >
        <Text style={{ color: C.textMuted, marginBottom: spacing.lg, fontFamily, ...typography.caption }}>
          {t('familyAlbums', 'subtitle')}
        </Text>

        {loading && !refreshing ? (
          <AlbumsSkeleton colors={C} spacing={spacing} radius={radius} cardWidth={cardWidth} />
        ) : albums.length === 0 ? (
          <EmptyState
            emoji="🖼️"
            title={t('familyAlbums', 'emptyTitle')}
            subtitle={t('familyAlbums', 'emptySubtitle')}
            action={{ label: t('familyAlbums', 'createAlbum'), onPress: () => setShowCreateModal(true) }}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {albums.map((album) => {
              const count = Number(album.photo_count) || album.photos?.length || 0;
              return (
                <TouchableOpacity
                  key={album.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveAlbum(album); }}
                  style={{ width: cardWidth }}
                >
                  <View style={{ width: cardWidth, height: cardWidth, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, position: 'relative' }}>
                    {album.cover_url ? (
                      <Image source={{ uri: album.cover_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Images size={32} color={C.textFaint} />
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: spacing.xs, right: spacing.xs, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: radius.sm, paddingHorizontal: spacing.xs, paddingVertical: 2 }}>
                      <Text style={{ color: 'white', ...typography.caption, fontSize: 10 }}>{count}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteAlbum(album)}
                      style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: 'rgba(0,0,0,0.6)', padding: spacing.xs, borderRadius: radius.full }}
                    >
                      <Trash2 size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                  <Text numberOfLines={1} style={{ color: C.text, marginTop: spacing.sm, fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                    {album.title}
                  </Text>
                  <Text style={{ color: C.textFaint, marginTop: 2, ...typography.caption }}>
                    {count} {count === 1 ? t('familyAlbums', 'photoCountSingular') : t('familyAlbums', 'photosCountSuffix')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Album Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={{ backgroundColor: '#00000080', flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '85%', ...shadow.raised }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontFamilyBold, ...typography.title }}>
                {t('familyAlbums', 'newAlbumTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetCreateForm(); }}>
                <X size={20} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyAlbums', 'albumTitleLabel')}
              </Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder={t('familyAlbums', 'albumTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, fontFamily, ...typography.body }}
                className="border"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyAlbums', 'albumDescriptionLabel')}
              </Text>
              <TextInput
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder={t('familyAlbums', 'albumDescriptionPlaceholder')}
                placeholderTextColor={C.textFaint}
                multiline
                style={{ backgroundColor: C.card, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.lg, minHeight: 72, fontFamily, ...typography.body }}
                className="border"
                textAlignVertical="top"
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.xs, fontFamily, ...typography.caption }}>
                {t('familyAlbums', 'coverPhotoLabel')}
              </Text>
              <TouchableOpacity
                onPress={handlePickCover}
                style={{ backgroundColor: C.card, borderColor: C.border, borderRadius: radius.md, marginBottom: spacing.xl, overflow: 'hidden' }}
                className="border"
              >
                {newCover ? (
                  <Image source={{ uri: newCover.uri }} style={{ width: '100%', height: 140 }} contentFit="cover" />
                ) : (
                  <View style={{ height: 100, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}>
                    <ImagePlus size={24} color={C.textFaint} />
                    <Text style={{ color: C.textFaint, fontFamily, ...typography.caption }}>
                      {t('familyAlbums', 'chooseCoverPhoto')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateAlbum}
                disabled={creating}
                style={{ backgroundColor: creating ? C.border : C.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.xl }}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: 'white', fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                    {t('familyAlbums', 'createButton')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Album Detail Modal */}
      <Modal visible={!!activeAlbum} animationType="slide" transparent>
        <View style={{ backgroundColor: '#00000080', flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, maxHeight: '90%', ...shadow.raised }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text numberOfLines={1} style={{ color: C.text, flex: 1, marginRight: spacing.md, fontFamily: fontFamilyBold, ...typography.title }}>
                {activeAlbum?.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {activeAlbum && (
                  <TouchableOpacity onPress={() => handleDeleteAlbum(activeAlbum)} style={{ padding: spacing.xs }}>
                    <Trash2 size={18} color={C.error} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setActiveAlbum(null)} style={{ padding: spacing.xs }}>
                  <X size={20} color={C.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {activeAlbum?.description ? (
              <Text style={{ color: C.textMuted, marginBottom: spacing.lg, fontFamily, ...typography.body }}>
                {activeAlbum.description}
              </Text>
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
              {activeAlbum && activeAlbum.photos.length === 0 ? (
                <EmptyState emoji="📷" title={t('familyAlbums', 'noPhotosInAlbum')} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {activeAlbum?.photos.map((photo) => {
                    const photoWidth = (W - spacing.lg * 2 - spacing.sm * 2) / 3;
                    return (
                      <View key={photo.id} style={{ width: photoWidth, height: photoWidth, borderRadius: radius.md, overflow: 'hidden', backgroundColor: C.card }}>
                        <Image source={{ uri: photo.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={handleAddPhotos}
              disabled={addingPhotos}
              style={{ backgroundColor: addingPhotos ? C.border : C.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}
            >
              {addingPhotos ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <ImagePlus size={18} color="white" />
                  <Text style={{ color: 'white', fontFamily: fontFamilyBold, ...typography.bodyEmphasis }}>
                    {t('familyAlbums', 'addPhotos')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
