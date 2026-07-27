// src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Alert, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Edit2, Check, X, Camera, ChevronDown, ChevronUp, Users, Heart, Image as ImageIcon, Calendar, ShieldAlert } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { cleanPhoto, getInitial } from '../../utils/googleDriveUrl';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

const { width: W } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { member, user } = useAuth();
  const { colors: C } = useTheme();
  const { lang, t } = useLanguage();

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [address, setAddress] = useState(member?.address || '');
  const [village, setVillage] = useState(member?.village || '');
  const [panchayat, setPanchayat] = useState(member?.panchayat || '');
  const [familyCollapsed, setFamilyCollapsed] = useState(false);

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

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('profile', 'profilePhotoTitle'),
      t('profile', 'profilePhotoMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('profile', 'removePhoto'),
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Alert.alert(t('profile', 'removedTitle'), t('profile', 'removedMessage'));
          }
        },
        {
          text: t('profile', 'uploadNewPhoto'),
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(t('profile', 'uploadTitle'), t('profile', 'uploadMessage'));
          }
        },
      ]
    );
  };

  const familyMembers = member?.family_members || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{ borderColor: C.border, backgroundColor: C.bg }} className="px-4 py-3 border-b flex-row items-center justify-between">
        <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xl tracking-wide">
          {t('profile', 'title')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Settings');
          }}
          style={{ backgroundColor: C.card, borderColor: C.border + '80' }}
          className="py-1 px-3 rounded-full border"
        >
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-semibold">
            {t('profile', 'settingsButton')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* Profile Card Header */}
        <View style={{ backgroundColor: C.card, borderColor: C.border }} className="m-4 border rounded-2xl p-5 shadow-xl items-center relative">

          {/* Cover gradient proxy */}
          <View style={{ backgroundColor: C.primary + '33', borderColor: C.primaryLight + '1a' }} className="w-full h-24 border rounded-xl mb-6 items-center justify-center">
            <Text style={{ color: C.primaryLight + '99', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xs tracking-wider uppercase">
              {t('profile', 'memberBadge')}
            </Text>
          </View>

          {/* Avatar Upload */}
          <TouchableOpacity
            onPress={handleAvatarPress}
            style={{ borderColor: C.card, backgroundColor: C.bg }}
            className="w-24 h-24 rounded-2xl border-4 -mt-16 overflow-hidden items-center justify-center shadow-md relative"
          >
            {user?.profile_photo_url ? (
              <Image source={{ uri: cleanPhoto(user.profile_photo_url) || '' }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
            ) : (
              <View style={{ backgroundColor: C.primary }} className="w-full h-full items-center justify-center">
                <Text className="text-white font-bold text-4xl">{getInitial(user?.name || member?.name)}</Text>
              </View>
            )}
            <View className="absolute inset-0 bg-black/40 items-center justify-center opacity-80">
              <Camera size={18} color="white" />
            </View>
          </TouchableOpacity>

          <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-xl mt-3">
            {user?.name || member?.name}
          </Text>

          <View className="flex-row items-center gap-2 mt-1">
            {user?.relation === 'Head' || !user?.relation ? (
              <View style={{ backgroundColor: C.amber + '1a', borderColor: C.amber + '33' }} className="border px-2 py-0.5 rounded-full">
                <Text style={{ color: C.amber, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-bold">
                  {t('profile', 'headOfFamily')}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: C.border }} className="px-2 py-0.5 rounded-full">
                <Text style={{ color: C.textMuted }} className="text-xs font-medium capitalize">{user?.relation}</Text>
              </View>
            )}
            <Text style={{ color: C.textFaint }} className="text-sm font-semibold">#{member?.membership_no}</Text>
          </View>

          <Text style={{ color: C.textMuted }} className="text-xs mt-1">
            {t('profile', 'mobilePrefix')} +91{user?.mobile || member?.mobile}
          </Text>
        </View>

        {/* 2x2 Family Hub Quick Links Grid */}
        <View className="mx-4 mb-4">
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs font-bold uppercase tracking-wider mb-2.5 ml-1">
            {t('profile', 'familyHubHeader')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: t('profile', 'familyTreeLabel'), icon: <Users size={20} color={C.primaryLight} />, screen: 'FamilyTree', desc: t('profile', 'familyTreeDesc') },
              { label: t('profile', 'matrimonyLabel'), icon: <Heart size={20} color={C.female} />, screen: 'Matrimony', desc: t('profile', 'matrimonyDesc') },
              { label: t('profile', 'familyAlbumsLabel'), icon: <ImageIcon size={20} color={C.accent} />, screen: 'FamilyAlbums', desc: t('profile', 'familyAlbumsDesc') },
              { label: t('profile', 'familyEventsLabel'), icon: <Calendar size={20} color={C.success} />, screen: 'FamilyEvents', desc: t('profile', 'familyEventsDesc') },
            ].map(hub => (
              <TouchableOpacity
                key={hub.label}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(hub.screen);
                }}
                style={{ width: (W - 40) / 2, backgroundColor: C.card, borderColor: C.border + '99' }}
                className="border p-4 rounded-2xl shadow-sm flex-col justify-between"
              >
                <View style={{ backgroundColor: C.bg + '99' }} className="w-9 h-9 rounded-xl items-center justify-center mb-3">
                  {hub.icon}
                </View>
                <View>
                  <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-sm">{hub.label}</Text>
                  <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-[10px] mt-0.5">{hub.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Inline Address Details Edit */}
        <View style={{ backgroundColor: C.card, borderColor: C.border }} className="mx-4 border rounded-2xl p-5 mb-4 shadow-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-base">
              {t('profile', 'addressInfoHeader')}
            </Text>
            {isEditing ? (
              <View className="flex-row gap-2">
                <TouchableOpacity onPress={handleEditToggle} className="p-1">
                  <X size={18} color={C.error} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} className="p-1">
                  <Check size={18} color={C.success} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={handleEditToggle} className="p-1">
                <Edit2 size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Village */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs mb-1">
            {t('profile', 'villageLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
              className="border rounded-xl px-3 py-2 text-sm mb-3"
              value={village}
              onChangeText={setVillage}
              placeholder={t('profile', 'villagePlaceholder')}
              placeholderTextColor={C.textFaint}
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm mb-3 font-semibold">
              {member?.village || t('profile', 'notSpecified')}
            </Text>
          )}

          {/* Panchayat */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs mb-1">
            {t('profile', 'panchayatLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
              className="border rounded-xl px-3 py-2 text-sm mb-3"
              value={panchayat}
              onChangeText={setPanchayat}
              placeholder={t('profile', 'panchayatPlaceholder')}
              placeholderTextColor={C.textFaint}
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm mb-3 font-semibold">
              {member?.panchayat || t('profile', 'notSpecified')}
            </Text>
          )}

          {/* Full Address */}
          <Text style={{ color: C.textMuted, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs mb-1">
            {t('profile', 'fullAddressLabel')}
          </Text>
          {isEditing ? (
            <TextInput
              style={{ backgroundColor: C.bg, borderColor: C.border, color: C.text }}
              className="border rounded-xl px-3 py-2.5 text-sm min-h-16"
              value={address}
              onChangeText={setAddress}
              placeholder={t('profile', 'addressPlaceholder')}
              placeholderTextColor={C.textFaint}
              multiline
            />
          ) : (
            <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-sm leading-5 font-semibold">
              {member?.address || t('profile', 'notSpecified')}
            </Text>
          )}
        </View>

        {/* Collapsible Family Members List Section */}
        <View style={{ backgroundColor: C.card, borderColor: C.border }} className="mx-4 border rounded-2xl overflow-hidden shadow-md">
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFamilyCollapsed(!familyCollapsed);
            }}
            style={{ backgroundColor: C.bg + '66', borderColor: C.border }}
            className="flex-row items-center justify-between p-4 border-b"
          >
            <View className="flex-row items-center gap-2">
              <Users size={16} color={C.primaryLight} />
              <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }} className="font-bold text-sm">
                {t('profile', 'familyMembersHeader')} ({familyMembers.length})
              </Text>
            </View>
            {familyCollapsed ? <ChevronDown size={16} color={C.textMuted} /> : <ChevronUp size={16} color={C.textMuted} />}
          </TouchableOpacity>

          {!familyCollapsed && (
            <View className="p-1">
              {familyMembers.length === 0 ? (
                <Text style={{ color: C.textFaint, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="text-xs text-center py-6">
                  {t('profile', 'noFamilyMembers')}
                </Text>
              ) : (
                familyMembers.map((fam, idx) => (
                  <View
                    key={idx}
                    style={{ borderColor: C.border + '4d' }}
                    className="flex-row items-center gap-3 p-3 border-b last:border-0"
                  >
                    <View style={{ backgroundColor: C.primary + '1a', borderColor: C.primaryLight + '33' }} className="w-10 h-10 rounded-full border items-center justify-center">
                      <Text style={{ color: C.primaryLight }} className="font-bold text-base">{getInitial(fam.name)}</Text>
                    </View>
                    <View className="flex-1">
                      <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }} className="font-semibold text-sm">{fam.name}</Text>
                      <Text style={{ color: C.textMuted }} className="text-xs capitalize mt-0.5">
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
