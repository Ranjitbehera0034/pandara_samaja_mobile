// src/screens/admin/AdminSettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock, UserCircle, Globe, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import Button from '../../components/common/Button';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow, mode, setMode } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { adminUser, refreshAdminUser } = useAdminAuth();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [profileEmail, setProfileEmail] = useState('');
  const [profileMembershipNo, setProfileMembershipNo] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleSaveProfile = async () => {
    const data: { email?: string; membershipNo?: string } = {};
    if (adminUser?.needsEmailPrompt) {
      if (!profileEmail.trim()) {
        Alert.alert(t('common', 'errorTitle'), t('admin', 'profileEmailRequiredError'));
        return;
      }
      data.email = profileEmail.trim();
    }
    if (adminUser?.needsMembershipPrompt) {
      if (!profileMembershipNo.trim()) {
        Alert.alert(t('common', 'errorTitle'), t('admin', 'profileMembershipRequiredError'));
        return;
      }
      data.membershipNo = profileMembershipNo.trim();
    }
    setSavingProfile(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const res = await adminApi.updateAdminProfile(data);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshAdminUser();
        setProfileEmail('');
        setProfileMembershipNo('');
        Alert.alert(t('common', 'successTitle'), t('admin', 'profileUpdatedSuccess'));
      } else {
        throw new Error(res.message || t('admin', 'profileUpdateError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'profileUpdateError'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSave = async () => {
    if (!currentPassword) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'currentPasswordRequiredError'));
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'newPasswordTooShortError'));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t('common', 'errorTitle'), t('admin', 'passwordsDontMatchError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await adminApi.changeAdminPassword(currentPassword, newPassword);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert(t('common', 'successTitle'), t('admin', 'passwordChangedSuccess'));
      } else {
        throw new Error(data.message || t('admin', 'passwordChangeError'));
      }
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'passwordChangeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = (selectedLang: 'en' | 'od') => {
    if (lang !== selectedLang) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLang(selectedLang);
    }
  };

  const handleThemeChange = (selectedMode: ThemeMode) => {
    if (mode !== selectedMode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMode(selectedMode);
    }
  };

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text, ...typography.body,
  };
  const labelStyle = { color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'settingsTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        {/* Account info card */}
        <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <UserCircle size={18} color={C.primary} />
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{t('admin', 'accountInfoHeader')}</Text>
          </View>

          <Text style={labelStyle}>{t('admin', 'usernameLabel')}</Text>
          <Text style={{ color: C.text, fontFamily: fontRegular, marginBottom: spacing.lg, ...typography.body }}>
            {adminUser?.username || '—'}
          </Text>

          <Text style={labelStyle}>{t('admin', 'roleFieldLabel')}</Text>
          <Text style={{ color: C.text, fontFamily: fontRegular, marginBottom: spacing.lg, ...typography.body }}>
            {adminUser?.role === 'superadmin' ? t('admin', 'roleSuperadmin') : t('admin', 'roleAdmin')}
          </Text>

          <Text style={labelStyle}>{t('admin', 'profileEmailLabel')}</Text>
          <Text style={{ color: adminUser?.email ? C.text : C.warning, fontFamily: fontRegular, marginBottom: spacing.lg, ...typography.body }}>
            {adminUser?.email || t('admin', 'profileNotSet')}
          </Text>

          <Text style={labelStyle}>{t('admin', 'profileMembershipLabel')}</Text>
          <Text style={{ color: adminUser?.membershipNo ? C.text : C.warning, fontFamily: fontRegular, ...typography.body }}>
            {adminUser?.membershipNo || t('admin', 'profileNotSet')}
          </Text>
        </View>

        {(adminUser?.needsEmailPrompt || adminUser?.needsMembershipPrompt) && (
          <View style={{ backgroundColor: C.warning + '10', borderColor: C.warning + '40', borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <AlertTriangle size={18} color={C.warning} />
              <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{t('admin', 'profileIncompleteTitle')}</Text>
            </View>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginBottom: spacing.lg, ...typography.caption }}>
              {t('admin', 'profileIncompleteDesc')}
            </Text>

            {adminUser?.needsEmailPrompt && (
              <>
                <Text style={labelStyle}>{t('admin', 'profileEmailLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={t('admin', 'profileEmailPlaceholder')}
                  placeholderTextColor={C.textFaint}
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            {adminUser?.needsMembershipPrompt && (
              <>
                <Text style={labelStyle}>{t('admin', 'profileMembershipLabel')}</Text>
                <TextInput
                  style={inputStyle}
                  placeholder={t('admin', 'profileMembershipPlaceholder')}
                  placeholderTextColor={C.textFaint}
                  value={profileMembershipNo}
                  onChangeText={setProfileMembershipNo}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </>
            )}

            <Button variant="primary" label={t('common', 'save')} onPress={handleSaveProfile} loading={savingProfile} />
          </View>
        )}

        {/* Appearance + Language card */}
        <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Globe size={18} color={C.primary} />
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{t('settings', 'appearanceHeader')}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm + 2, marginBottom: spacing.lg }}>
            {([
              { value: 'light' as ThemeMode, emoji: '☀️' },
              { value: 'dark' as ThemeMode, emoji: '🌙' },
              { value: 'system' as ThemeMode, emoji: '⚙️' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleThemeChange(opt.value)}
                style={{
                  flex: 1,
                  backgroundColor: mode === opt.value ? C.primary + '15' : C.bg,
                  borderWidth: 2,
                  borderColor: mode === opt.value ? C.primary : C.border,
                  borderRadius: radius.lg,
                  paddingVertical: spacing.md + 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs + 2,
                }}
              >
                <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                <Text style={{ color: C.text, fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined, ...typography.caption, fontWeight: '700' }}>
                  {t('settings', `theme${opt.value.charAt(0).toUpperCase()}${opt.value.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>{t('settings', 'languageHeader')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              style={{
                flex: 1,
                backgroundColor: lang === 'en' ? C.primary + '15' : C.bg,
                borderWidth: 2,
                borderColor: lang === 'en' ? C.primary : C.border,
                borderRadius: radius.lg,
                paddingVertical: spacing.md + 2,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Text style={{ fontSize: 20 }}>🇬🇧</Text>
              <Text style={{ color: C.text, ...typography.label, fontWeight: '700' }}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLanguageChange('od')}
              style={{
                flex: 1,
                backgroundColor: lang === 'od' ? C.primary + '15' : C.bg,
                borderWidth: 2,
                borderColor: lang === 'od' ? C.primary : C.border,
                borderRadius: radius.lg,
                paddingVertical: spacing.md + 2,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}
            >
              <Text style={{ fontSize: 20 }}>🇮🇳</Text>
              <Text style={{ color: C.text, fontFamily: 'NotoSansOriya-Bold', ...typography.label, fontWeight: '700' }}>ଓଡ଼ିଆ</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Lock size={18} color={C.primary} />
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>{t('admin', 'changePasswordHeader')}</Text>
          </View>

          <Text style={labelStyle}>{t('admin', 'currentPasswordLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={t('admin', 'currentPasswordPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={labelStyle}>{t('admin', 'newPasswordLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={t('admin', 'newPasswordPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={labelStyle}>{t('admin', 'confirmPasswordLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={t('admin', 'confirmPasswordPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Button variant="primary" label={t('common', 'save')} onPress={handleSave} loading={saving} />
        </View>
      </ScrollView>
    </View>
  );
}
