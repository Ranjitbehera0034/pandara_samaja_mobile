// src/screens/admin/AdminAnnouncementsScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Plus, Trash2, Edit2, X as XIcon, ImagePlus, Video as VideoIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { Announcement } from '../../api/admin';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type PickedFile = { uri: string; name: string; type: string };

const pickedFileFromAsset = (asset: ImagePicker.ImagePickerAsset, kind: 'image' | 'video'): PickedFile => {
  const uriParts = asset.uri.split('/');
  const fallbackExt = kind === 'image' ? 'jpg' : 'mp4';
  const name = uriParts[uriParts.length - 1] || `${kind}-${Date.now()}.${fallbackExt}`;
  const ext = name.split('.').pop()?.toLowerCase() || fallbackExt;
  const type = kind === 'image'
    ? (ext === 'png' ? 'image/png' : 'image/jpeg')
    : 'video/mp4';
  return { uri: asset.uri, name, type };
};

export default function AdminAnnouncementsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<PickedFile | null>(null);
  const [video, setVideo] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const data = await adminApi.fetchAdminAnnouncements();
      if (data.success) setAnnouncements(data.posts);
    } catch (e) {
      console.error('[ADMIN_ANNOUNCEMENTS] Fetch failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setImage(null);
    setVideo(null);
  };

  const openCreate = () => {
    resetForm();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const openEdit = (item: Announcement) => {
    setEditing(item);
    setTitle(item.title);
    setContent(item.content || '');
    setImage(null);
    setVideo(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowForm(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'galleryPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(pickedFileFromAsset(result.assets[0], 'image'));
    }
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'galleryPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setVideo(pickedFileFromAsset(result.assets[0], 'video'));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'announcementTitleRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload = { title: title.trim(), content: content.trim() || undefined, image, video };
      const data = editing
        ? await adminApi.updateAnnouncement(editing.id, payload)
        : await adminApi.createAnnouncement(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowForm(false);
        resetForm();
        load();
      } else {
        throw new Error(data.message || t('admin', 'announcementSaveError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_ANNOUNCEMENTS] Save failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'announcementSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doRemove = async (id: string | number) => {
    setRemovingId(id);
    try {
      const data = await adminApi.deleteAnnouncement(id);
      if (data.success) {
        setAnnouncements(prev => prev.filter(a => a.id !== id));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || t('admin', 'announcementDeleteError'));
      }
    } catch (e: any) {
      console.error('[ADMIN_ANNOUNCEMENTS] Remove failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'announcementDeleteError'));
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemove = (item: Announcement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteAnnouncementTitle'),
      t('admin', 'confirmDeleteAnnouncementMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: () => doRemove(item.id) },
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: Announcement }) => (
    <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card }}>
      {!!item.image_url && (
        <Image source={{ uri: item.image_url }} style={{ width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.md, backgroundColor: C.bg }} resizeMode="cover" />
      )}
      <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }} numberOfLines={1}>{item.title}</Text>
      {!!item.content && (
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.body }} numberOfLines={2}>{item.content}</Text>
      )}
      <Text style={{ color: C.textFaint, marginTop: spacing.sm, ...typography.caption }}>{new Date(item.created_at).toLocaleDateString()}</Text>

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
        <TouchableOpacity
          onPress={() => openEdit(item)}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          <Edit2 size={14} color={C.text} />
          <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }}>{t('admin', 'editButton')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          disabled={removingId === item.id}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: C.error + '15', borderRadius: radius.md, paddingVertical: spacing.sm }}
        >
          {removingId === item.id ? <ActivityIndicator size="small" color={C.error} /> : <Trash2 size={14} color={C.error} />}
          <Text style={{ color: C.error, ...typography.caption, fontWeight: '700' }}>{t('common', 'delete')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [C, spacing, radius, typography, shadow, fontBold, fontRegular, t, removingId]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('admin', 'announcementsTitle')}</Text>
        <TouchableOpacity
          onPress={openCreate}
          style={{ width: 36, height: 36, borderRadius: radius.full, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Plus size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : loadError ? (
        <EmptyState emoji="⚠️" title={t('common', 'error')} subtitle={t('admin', 'announcementsLoadError')} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState emoji="📢" title={t('admin', 'announcementsEmptyTitle')} subtitle={t('admin', 'announcementsEmptySubtitle')} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} colors={[C.primary]} progressBackgroundColor={C.card} />
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View style={{ backgroundColor: C.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.title }}>
                {editing ? t('admin', 'editAnnouncementTitle') : t('admin', 'newAnnouncementTitle')}
              </Text>
              <TouchableOpacity onPress={() => { setShowForm(false); resetForm(); }}>
                <XIcon size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'announcementTitleLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, ...typography.body }}
                placeholder={t('admin', 'announcementTitlePlaceholder')}
                placeholderTextColor={C.textFaint}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('admin', 'announcementContentLabel')}</Text>
              <TextInput
                style={{ borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, fontFamily: fontRegular, minHeight: 100, textAlignVertical: 'top', ...typography.body }}
                placeholder={t('admin', 'announcementContentPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={content}
                onChangeText={setContent}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, backgroundColor: C.card }}
                >
                  <ImagePlus size={16} color={C.text} />
                  <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }} numberOfLines={1}>
                    {image ? t('admin', 'imageSelectedLabel') : (editing?.image_url ? t('admin', 'replaceImageLabel') : t('admin', 'addImageLabel'))}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickVideo}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: C.border, borderRadius: radius.md, paddingVertical: spacing.md, backgroundColor: C.card }}
                >
                  <VideoIcon size={16} color={C.text} />
                  <Text style={{ color: C.text, ...typography.caption, fontWeight: '700' }} numberOfLines={1}>
                    {video ? t('admin', 'videoSelectedLabel') : (editing?.video_url ? t('admin', 'replaceVideoLabel') : t('admin', 'addVideoLabel'))}
                  </Text>
                </TouchableOpacity>
              </View>

              {image && (
                <Image source={{ uri: image.uri }} style={{ width: '100%', height: 140, borderRadius: radius.md, marginBottom: spacing.lg }} resizeMode="cover" />
              )}

              <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
