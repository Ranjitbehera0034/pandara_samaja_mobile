// src/screens/admin/AdminSettingsScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as adminApi from '../../api/admin';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminSettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

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
