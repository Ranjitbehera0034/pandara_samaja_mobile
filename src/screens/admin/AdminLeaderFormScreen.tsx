// src/screens/admin/AdminLeaderFormScreen.tsx
// Single screen used for both admin-create and admin-edit of a community
// leader (route param `id` present = edit, absent = create). Mirrors
// AdminMatrimonyFormScreen.tsx's Save/Delete pattern; image picking mirrors
// ProfileScreen.tsx's handleTakePhoto/handlePickFromGallery.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Trash2, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import { Leader, LeaderInput } from '../../api/admin';
import { AdminStackParams } from '../../navigation/AdminStack';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

type FormRoute = RouteProp<AdminStackParams, 'AdminLeaderForm'>;

// Same level vocabulary as the member-facing src/screens/community/LeadersScreen.tsx
// and src/api/leaders.ts's LeaderLevel type.
const LEVELS = ['State', 'District', 'Taluka', 'Panchayat'] as const;

type PickedFile = { uri: string; name: string; type: string };

const pickedFileFromAsset = (asset: ImagePicker.ImagePickerAsset): PickedFile => {
  const uriParts = asset.uri.split('/');
  const name = uriParts[uriParts.length - 1] || `photo-${Date.now()}.jpg`;
  const ext = name.split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';
  return { uri: asset.uri, name, type };
};

interface FormState {
  name: string;
  name_or: string;
  role: string;
  role_or: string;
  level: typeof LEVELS[number];
  location: string;
  display_order: string;
}

const emptyForm: FormState = {
  name: '', name_or: '', role: '', role_or: '', level: 'State', location: '', display_order: '',
};

export default function AdminLeaderFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRoute>();
  const id = route.params?.id;
  const passedLeader = route.params?.leader;
  const isEdit = id !== undefined;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The shipped backend contract has no GET /admin/leaders/:id — only
  // list/create/update/delete — so the row is passed in via navigation
  // params from AdminLeadersScreen (which already has the full Leader
  // object from its list fetch) rather than re-fetched here.
  const applyLeader = useCallback((found: Leader) => {
    setForm({
      name: found.name || '',
      name_or: found.name_or || '',
      role: found.role || '',
      role_or: found.role_or || '',
      level: (LEVELS as readonly string[]).includes(found.level) ? (found.level as typeof LEVELS[number]) : 'State',
      location: found.location || '',
      display_order: found.display_order != null ? String(found.display_order) : '',
    });
    setExistingImageUrl(found.image_url || null);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    if (passedLeader) {
      applyLeader(passedLeader);
      setLoading(false);
      return;
    }
    // Fallback if the form was opened without the row (e.g. deep link):
    // fetch a large page and find by id, since there's no single-item GET.
    (async () => {
      try {
        const data = await adminApi.fetchAdminLeaders({ limit: 500 });
        const found = data.leaders?.find(l => String(l.id) === String(id));
        if (found) applyLeader(found);
      } catch (e) {
        console.error('[ADMIN_LEADER_FORM] Fetch failed:', e);
        Alert.alert(t('common', 'errorTitle'), t('admin', 'leadersLoadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, passedLeader, applyLeader, t]);

  const setField = (key: keyof FormState, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('profile', 'profilePhotoTitle'),
      t('profile', 'profilePhotoMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('profile', 'takePhoto'),
          onPress: async () => {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(t('common', 'errorTitle'), t('profile', 'cameraPermissionDenied'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1],
            });
            if (!result.canceled && result.assets[0]) setNewImage(pickedFileFromAsset(result.assets[0]));
          },
        },
        {
          text: t('profile', 'uploadNewPhoto'),
          onPress: async () => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
              Alert.alert(t('common', 'errorTitle'), t('profile', 'galleryPermissionDenied'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1],
            });
            if (!result.canceled && result.assets[0]) setNewImage(pickedFileFromAsset(result.assets[0]));
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'leaderNameRequiredError'));
      return;
    }
    if (!form.role.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'leaderRoleRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const payload: LeaderInput = {
        name: form.name.trim(),
        name_or: form.name_or.trim() || undefined,
        role: form.role.trim(),
        role_or: form.role_or.trim() || undefined,
        level: form.level,
        location: form.location.trim() || undefined,
        display_order: form.display_order.trim() || undefined,
        image: newImage,
      };
      const data = isEdit
        ? await adminApi.updateLeader(id!, payload)
        : await adminApi.createLeader(payload);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'leaderSaveError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'leaderSaveError'));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      const data = await adminApi.deleteLeader(id!);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.goBack();
      } else {
        throw new Error(data.message || t('admin', 'leaderDeleteError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('admin', 'leaderDeleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('admin', 'confirmDeleteLeaderTitle'),
      t('admin', 'confirmDeleteLeaderMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('common', 'delete'), style: 'destructive', onPress: doDelete },
      ]
    );
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  const displayImageUri = newImage?.uri || existingImageUrl || null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>
          {isEdit ? t('admin', 'leaderEditTitle') : t('admin', 'leaderCreateTitle')}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
          {/* Photo picker */}
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <TouchableOpacity
              onPress={handlePickImage}
              style={{ width: 96, height: 96, borderRadius: radius.full, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
            >
              {displayImageUri ? (
                <Image source={{ uri: displayImageUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <Camera size={28} color={C.textMuted} />
              )}
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 4, alignItems: 'center' }}>
                <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={labelStyle}>{t('admin', 'leaderNameLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('admin', 'leaderNameLabel')} placeholderTextColor={C.textFaint} value={form.name} onChangeText={(v) => setField('name', v)} />

          <Text style={labelStyle}>{t('admin', 'leaderNameOrLabel')}</Text>
          <TextInput style={[inputStyle, { fontFamily: 'NotoSansOriya' }]} placeholder={t('admin', 'leaderNameOrLabel')} placeholderTextColor={C.textFaint} value={form.name_or} onChangeText={(v) => setField('name_or', v)} />

          <Text style={labelStyle}>{t('admin', 'leaderRoleLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('admin', 'leaderRoleLabel')} placeholderTextColor={C.textFaint} value={form.role} onChangeText={(v) => setField('role', v)} />

          <Text style={labelStyle}>{t('admin', 'leaderRoleOrLabel')}</Text>
          <TextInput style={[inputStyle, { fontFamily: 'NotoSansOriya' }]} placeholder={t('admin', 'leaderRoleOrLabel')} placeholderTextColor={C.textFaint} value={form.role_or} onChangeText={(v) => setField('role_or', v)} />

          <Text style={labelStyle}>{t('admin', 'leaderLevelLabel')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
            {LEVELS.map(level => (
              <TouchableOpacity
                key={level}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setField('level', level); }}
                style={{
                  paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: form.level === level ? C.primary : C.border,
                  backgroundColor: form.level === level ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: form.level === level ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>{t('admin', 'leaderLocationLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('admin', 'leaderLocationPlaceholder')} placeholderTextColor={C.textFaint} value={form.location} onChangeText={(v) => setField('location', v)} />

          <Text style={labelStyle}>{t('admin', 'leaderDisplayOrderLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={t('admin', 'leaderDisplayOrderPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={form.display_order}
            onChangeText={(v) => setField('display_order', v)}
            keyboardType="numeric"
          />

          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
            {isEdit && (
              <Button
                variant="secondary"
                label={t('common', 'delete')}
                icon={<Trash2 size={16} color={C.error} />}
                onPress={handleDelete}
                loading={deleting}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
