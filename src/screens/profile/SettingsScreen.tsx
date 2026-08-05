// src/screens/profile/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, LogOut, Globe, Bell, Shield, Info, HelpCircle } from 'lucide-react-native';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../config/constants';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { mode, setMode, colors: C, spacing, radius, typography } = useTheme();

  // Local state for settings toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [eventReminders, setEventReminders] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

  const handleToggle = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
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

  const handleLogoutPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t('settings', 'confirmLogoutTitle'),
      t('settings', 'confirmLogoutMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        {
          text: t('settings', 'logoutButton'),
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await logout();
          },
        },
      ]
    );
  };

  const handleSupportPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://chat.whatsapp.com/BiBlBOpYMKi2qCSzkM4aPJ';
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common', 'errorTitle'), t('settings', 'whatsappNotInstalled'));
    });
  };

  const handleOpenLegalUrl = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common', 'errorTitle'), t('common', 'linkOpenError'));
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{ paddingVertical: spacing.xs }}
        >
          <Text style={{ color: C.primaryLight, ...typography.label }}>
            {t('common', 'back')}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, ...typography.title }}>
          {t('settings', 'title')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl + spacing.sm }}
        stickyHeaderIndices={[0, 2, 4, 6, 8]}
      >
        {/* SECTION 1: PREFERENCES */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', ...typography.caption, fontWeight: '700' }}>
            {t('settings', 'preferencesHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: spacing.lg }}>
          {/* Push Notifications Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Bell size={20} color={C.primaryLight} />
              <View>
                <Text style={{ color: C.text, ...typography.label }}>
                  {t('settings', 'pushNotifTitle')}
                </Text>
                <Text style={{ color: C.textMuted, ...typography.caption }}>
                  {t('settings', 'pushNotifDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={pushNotif}
              onValueChange={(val) => handleToggle(setPushNotif, val)}
              trackColor={{ false: C.borderLight, true: C.primary }}
              thumbColor={Platform.OS === 'android' ? C.card : undefined}
            />
          </View>

          {/* Event Reminders Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Shield size={20} color={C.accent} />
              <View>
                <Text style={{ color: C.text, ...typography.label }}>
                  {t('settings', 'eventRemindersTitle')}
                </Text>
                <Text style={{ color: C.textMuted, ...typography.caption }}>
                  {t('settings', 'eventRemindersDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={eventReminders}
              onValueChange={(val) => handleToggle(setEventReminders, val)}
              trackColor={{ false: C.borderLight, true: C.primary }}
              thumbColor={Platform.OS === 'android' ? C.card : undefined}
            />
          </View>

          {/* Email Updates */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: spacing.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Info size={20} color={C.success} />
              <View>
                <Text style={{ color: C.text, ...typography.label }}>
                  {t('settings', 'emailUpdatesTitle')}
                </Text>
                <Text style={{ color: C.textMuted, ...typography.caption }}>
                  {t('settings', 'emailUpdatesDesc')}
                </Text>
              </View>
            </View>
            <Switch
              value={emailUpdates}
              onValueChange={(val) => handleToggle(setEmailUpdates, val)}
              trackColor={{ false: C.borderLight, true: C.primary }}
              thumbColor={Platform.OS === 'android' ? C.card : undefined}
            />
          </View>
        </View>

        {/* SECTION 1.5: APPEARANCE */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', ...typography.caption, fontWeight: '700' }}>
            {t('settings', 'appearanceHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm + 2 }}>
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
                  backgroundColor: mode === opt.value ? C.primary + '15' : C.card,
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
        </View>

        {/* SECTION 2: LANGUAGE */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', ...typography.caption, fontWeight: '700' }}>
            {t('settings', 'languageHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            {/* English language chip */}
            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              style={{
                flex: 1,
                backgroundColor: lang === 'en' ? C.primary + '15' : C.card,
                borderWidth: 2,
                borderColor: lang === 'en' ? C.primary : C.border,
                borderRadius: radius.lg,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 24 }}>🇬🇧</Text>
              <Text style={{ color: C.text, ...typography.label, fontWeight: '700' }}>English</Text>
              {/* Intentionally hardcoded, not t(): each chip labels itself in its own language */}
              <Text style={{ color: C.textMuted, ...typography.caption }}>Active language</Text>
            </TouchableOpacity>

            {/* Odia language chip */}
            <TouchableOpacity
              onPress={() => handleLanguageChange('od')}
              style={{
                flex: 1,
                backgroundColor: lang === 'od' ? C.primary + '15' : C.card,
                borderWidth: 2,
                borderColor: lang === 'od' ? C.primary : C.border,
                borderRadius: radius.lg,
                paddingVertical: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 24 }}>🇮🇳</Text>
              <Text style={{ color: C.text, fontFamily: 'NotoSansOriya-Bold', ...typography.label, fontWeight: '700' }}>ଓଡ଼ିଆ</Text>
              <Text style={{ color: C.textMuted, fontFamily: 'NotoSansOriya', ...typography.caption }}>ସକ୍ରିୟ ଭାଷା</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 3: HELP & SUPPORT */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', ...typography.caption, fontWeight: '700' }}>
            {t('settings', 'helpSupportHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: spacing.lg }}>
          {/* WhatsApp Support link */}
          <TouchableOpacity
            onPress={handleSupportPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.md + 2,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <HelpCircle size={20} color={C.success} />
              <Text style={{ color: C.text, ...typography.label }}>
                {t('settings', 'whatsappSupport')}
              </Text>
            </View>
            <ChevronRight size={16} color={C.textFaint} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <TouchableOpacity
            onPress={() => handleOpenLegalUrl(PRIVACY_POLICY_URL)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.md + 2,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Globe size={20} color={C.textMuted} />
              <Text style={{ color: C.text, ...typography.label }}>
                {t('settings', 'privacyPolicy')}
              </Text>
            </View>
            <ChevronRight size={16} color={C.textFaint} />
          </TouchableOpacity>

          {/* Terms of Service */}
          <TouchableOpacity
            onPress={() => handleOpenLegalUrl(TERMS_OF_SERVICE_URL)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: spacing.md + 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Info size={20} color={C.textMuted} />
              <Text style={{ color: C.text, ...typography.label }}>
                {t('settings', 'termsOfService')}
              </Text>
            </View>
            <ChevronRight size={16} color={C.textFaint} />
          </TouchableOpacity>
        </View>

        {/* SECTION 4: ACCOUNT */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', ...typography.caption, fontWeight: '700' }}>
            {t('settings', 'accountHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: spacing.lg }}>
          {/* Logout Button — kept as a bespoke destructive-styled row (not the shared
              <Button> primitive): it needs the error/red identity to read as a
              destructive action, which Button's primary/secondary/pill variants
              can't express (they only offer primary-blue or transparent/bordered). */}
          <TouchableOpacity
            onPress={handleLogoutPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.md + 2,
              backgroundColor: C.error + '10',
              borderRadius: radius.md,
              marginVertical: spacing.md,
              borderWidth: 1,
              borderColor: C.error + '30',
              gap: spacing.sm,
            }}
          >
            <LogOut size={20} color={C.error} />
            <Text style={{ color: C.error, ...typography.label, fontWeight: '700' }}>
              {t('settings', 'logoutButton')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version Info Footer */}
        <View style={{ alignItems: 'center', marginTop: spacing.xxl, paddingHorizontal: spacing.xl }}>
          <Text style={{ color: C.textFaint, textAlign: 'center', ...typography.caption }}>
            Version 1.0.0 (Build 12)
          </Text>
          <Text style={{ color: C.textFaint, textAlign: 'center', marginTop: spacing.xs, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined, ...typography.caption }}>
            {t('settings', 'footerName')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
