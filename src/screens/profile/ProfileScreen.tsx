// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Edit2, Check, X, Camera, ChevronDown, ChevronUp, Users, Heart, Image as ImageIcon, Calendar, ShieldAlert, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import * as membersApi from '../../api/members';

const { width: W } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member, user, updateProfilePhoto } = useAuth();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState(member?.address || '');
  const [village, setVillage] = useState(member?.village || '');
  const [panchayat, setPanchayat] = useState(member?.panchayat || '');
  const [familyCollapsed, setFamilyCollapsed] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleEditToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEditing) {
      // Revert changes
      setAddress(member?.address || '');
      setVillage(member?.village || '');
      setPanchayat(member?.panchayat || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEditing(false);
    // Locally simulate save
    Alert.alert(t('profile', 'profileSavedTitle'), t('profile', 'profileSavedMessage'));
  };

  const uploadPickedPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    setUploadingPhoto(true);
    try {
      const uriParts = asset.uri.split('/');
      const name = uriParts[uriParts.length - 1] || `photo-${Date.now()}.jpg`;
      const ext = name.split('.').pop()?.toLowerCase();
      const type = ext === 'png' ? 'image/png' : 'image/jpeg';

      const data = await membersApi.updateMyProfilePhoto({ uri: asset.uri, name, type });
      if (data.success) {
        await updateProfilePhoto(data.profile_photo_url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (e) {
      console.error('[PROFILE_PHOTO] Upload failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('profile', 'uploadError'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common', 'errorTitle'), t('profile', 'cameraPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPickedPhoto(result.assets[0]);
    }
  };

  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('common', 'errorTitle'), t('profile', 'galleryPermissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPickedPhoto(result.assets[0]);
    }
  };

  const handleAvatarPress = () => {
    if (uploadingPhoto) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('profile', 'profilePhotoTitle'),
      t('profile', 'profilePhotoMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('profile', 'takePhoto'), onPress: handleTakePhoto },
        { text: t('profile', 'uploadNewPhoto'), onPress: handlePickFromGallery },
      ]
    );
  };

  const familyMembers = member?.family_members || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{ borderColor: C.border, backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        className="border-b flex-row items-center justify-between"
      >
        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.heading }}>
          {t('profile', 'title')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Settings');
          }}
          style={{
            backgroundColor: C.card, borderColor: C.border + '80',
            paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.full,
          }}
          className="border"
        >
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.caption, fontWeight: '600' }}>
            {t('profile', 'settingsButton')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl + spacing.xl }}
      >
        {/* Profile Card Header */}
        <View
          style={{ backgroundColor: C.card, borderColor: C.border, margin: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card }}
          className="border items-center relative"
        >

          {/* Cover gradient proxy */}
          <View
            style={{ backgroundColor: C.primary + '33', borderColor: C.primaryLight + '1a', borderRadius: radius.md, marginBottom: spacing.xl }}
            className="w-full h-24 border items-center justify-center"
          >
            <Text style={{ color: C.primaryLight + '99', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.caption, fontWeight: '700' }} className="tracking-wider uppercase">
              {t('profile', 'memberBadge')}
            </Text>
          </View>

          {/* Avatar Upload — a square, camera-overlay hero photo (not the shared
              circular <Avatar>): Avatar has no edit-overlay affordance and is
              always a circle, so it can't express this bordered, editable,
              square profile-photo tile. Left bespoke; tokens applied below. */}
          <TouchableOpacity
            onPress={handleAvatarPress}
            style={{ borderColor: C.card, backgroundColor: C.bg, borderRadius: radius.lg, marginTop: -64, ...shadow.raised }}
            className="w-24 h-24 border-4 overflow-hidden items-center justify-center relative"
          >
            {user?.profile_photo_url ? (
              <Image source={{ uri: cleanPhoto(user.profile_photo_url) || '' }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : (
              <View style={{ backgroundColor: C.primary }} className="w-full h-full items-center justify-center">
                <Text className="text-white font-bold text-4xl">{getInitial(user?.name || member?.name)}</Text>
              </View>
            )}
            <View className="absolute inset-0 bg-black/40 items-center justify-center opacity-80">
              <Camera size={16} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, marginTop: spacing.md, ...typography.heading }}>
            {user?.name || member?.name}
          </Text>

          <View style={{ gap: spacing.sm, marginTop: spacing.xs }} className="flex-row items-center">
            {user?.relation === 'Head' || !user?.relation ? (
              <View style={{ backgroundColor: C.amber + '1a', borderColor: C.amber + '33', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full }} className="border">
                <Text style={{ color: C.amber, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.caption, fontWeight: '700' }}>
                  {t('profile', 'headOfFamily')}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: C.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full }}>
                <Text style={{ color: C.textMuted, ...typography.caption }} className="capitalize">{user?.relation}</Text>
              </View>
            )}
            <Text style={{ color: C.textFaint, ...typography.bodyEmphasis }}>#{member?.membership_no}</Text>
          </View>

          <Text style={{ color: C.textMuted, marginTop: spacing.xs, ...typography.caption }}>
            {t('profile', 'mobilePrefix')} +91{user?.mobile || member?.mobile}
          </Text>
        </View>

        {/* 2x2 Family Hub Quick Links Grid */}
        <View style={{ marginHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text
            style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.sm + 2, marginLeft: spacing.xs, ...typography.caption, fontWeight: '700' }}
            className="uppercase tracking-wider"
          >
            {t('profile', 'familyHubHeader')}
          </Text>
          <View style={{ gap: spacing.sm }} className="flex-row flex-wrap">
            {[
              { label: t('profile', 'familyTreeLabel'), icon: <Users size={20} color={C.primaryLight} />, screen: 'FamilyTree', desc: t('profile', 'familyTreeDesc') },
              { label: t('profile', 'matrimonyLabel'), icon: <Heart size={20} color={C.female} />, screen: 'Matrimony', desc: t('profile', 'matrimonyDesc') },
              { label: t('profile', 'familyAlbumsLabel'), icon: <ImageIcon size={20} color={C.accent} />, screen: 'FamilyAlbums', desc: t('profile', 'familyAlbumsDesc') },
              { label: t('profile', 'familyEventsLabel'), icon: <Calendar size={20} color={C.success} />, screen: 'FamilyEvents', desc: t('profile', 'familyEventsDesc') },
              { label: t('profile', 'leadersLabel'), icon: <Award size={20} color={C.warning} />, screen: 'Leaders', desc: t('profile', 'leadersDesc') },
            ].map(hub => (
              <TouchableOpacity
                key={hub.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // These screens live in the Feed tab's nested stack, not
                  // ProfileStack — navigate explicitly to the tab + nested
                  // screen instead of relying on implicit cross-stack
                  // bubbling, which is unreliable for some screens.
                  navigation.navigate('Feed', { screen: hub.screen });
                }}
                style={{ width: (W - 40) / 2, backgroundColor: C.card, borderColor: C.border + '99', borderRadius: radius.lg, padding: spacing.lg, ...shadow.card }}
                className="border flex-col justify-between"
              >
                <View style={{ backgroundColor: C.bg + '99', borderRadius: radius.md, marginBottom: spacing.md }} className="w-9 h-9 items-center justify-center">
                  {hub.icon}
                </View>
                <View>
                  <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis, fontWeight: '700' }}>{hub.label}</Text>
                  <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginTop: spacing.xs, ...typography.caption }}>{hub.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inline Address Details Edit */}
        <View style={{ backgroundColor: C.card, borderColor: C.border, marginHorizontal: spacing.lg, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }} className="border">
          <View style={{ marginBottom: spacing.lg }} className="flex-row justify-between items-center">
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.title }}>
              {t('profile', 'addressInfoHeader')}
            </Text>
            {isEditing ? (
              <View style={{ gap: spacing.sm }} className="flex-row">
                <TouchableOpacity onPress={handleEditToggle} style={{ padding: spacing.xs }}>
                  <X size={16} color={C.error} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={{ padding: spacing.xs }}>
                  <Check size={16} color={C.success} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleEditToggle} style={{ padding: spacing.xs }}>
                <Edit2 size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Village */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.xs, ...typography.caption }}>
            {t('profile', 'villageLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, ...typography.body }}
              className="border"
              value={village}
              onChangeText={setVillage}
              placeholder={t('profile', 'villagePlaceholder')}
              placeholderTextColor={C.textFaint}
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
              {member?.village || t('profile', 'notSpecified')}
            </Text>
          )}

          {/* Panchayat */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.xs, ...typography.caption }}>
            {t('profile', 'panchayatLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md, ...typography.body }}
              className="border"
              value={panchayat}
              onChangeText={setPanchayat}
              placeholder={t('profile', 'panchayatPlaceholder')}
              placeholderTextColor={C.textFaint}
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
              {member?.panchayat || t('profile', 'notSpecified')}
            </Text>
          )}

          {/* Full Address */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, marginBottom: spacing.xs, ...typography.caption }}>
            {t('profile', 'fullAddressLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, minHeight: 64, ...typography.body }}
              className="border"
              value={address}
              onChangeText={setAddress}
              placeholder={t('profile', 'addressPlaceholder')}
              placeholderTextColor={C.textFaint}
              multiline
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.bodyEmphasis }}>
              {member?.address || t('profile', 'notSpecified')}
            </Text>
          )}
        </View>

        {/* Collapsible Family Members List Section */}
        <View style={{ backgroundColor: C.card, borderColor: C.border, marginHorizontal: spacing.lg, borderRadius: radius.lg, ...shadow.card }} className="border overflow-hidden">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFamilyCollapsed(!familyCollapsed);
            }}
            style={{ backgroundColor: C.bg + '66', borderColor: C.border, padding: spacing.lg }}
            className="flex-row items-center justify-between border-b"
          >
            <View style={{ gap: spacing.sm }} className="flex-row items-center">
              <Users size={16} color={C.primaryLight} />
              <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.bodyEmphasis, fontWeight: '700' }}>
                {t('profile', 'familyMembersHeader')} ({familyMembers.length})
              </Text>
            </View>
            {familyCollapsed ? <ChevronDown size={16} color={C.textMuted} /> : <ChevronUp size={16} color={C.textMuted} />}
          </TouchableOpacity>

          {!familyCollapsed && (
            <View className="p-1">
              {familyMembers.length === 0 ? (
                <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, textAlign: 'center', paddingVertical: spacing.xl, ...typography.caption }}>
                  {t('profile', 'noFamilyMembers')}
                </Text>
              ) : (
                familyMembers.map((fam, idx) => (
                  <View
                    key={idx}
                    style={{ borderColor: C.border + '4d', gap: spacing.md, padding: spacing.md }}
                    className="flex-row items-center border-b last:border-0"
                  >
                    <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primaryLight + '33', borderRadius: radius.full }} className="w-10 h-10 border items-center justify-center">
                      <Text style={{ color: C.primaryLight }} className="font-bold text-base">{getInitial(fam.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.bodyEmphasis }}>{fam.name}</Text>
                      <Text style={{ color: C.textMuted, marginTop: spacing.xs, ...typography.caption }} className="capitalize">
                        {fam.relation} · {fam.age} {t('profile', 'yrsAbbrev')}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
