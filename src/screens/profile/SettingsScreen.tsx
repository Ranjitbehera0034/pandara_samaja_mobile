// src/screens/profile/SettingsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronRight, LogOut, Globe, Bell, Shield, Info, HelpCircle } from 'lucide-react-native';
import { useTheme, ThemeMode } from '../../theme/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { mode, setMode, colors: C } = useTheme();

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
    Alert.alert(
      t('settings', 'whatsappSupport'),
      t('settings', 'supportAlertMessage')
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: C.card,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={{ paddingVertical: 4 }}
        >
          <Text style={{ color: C.primaryLight, fontSize: 16, fontWeight: '600' }}>
            {t('common', 'back')}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
          {t('settings', 'title')}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        stickyHeaderIndices={[0, 2, 4, 6, 8]}
      >
        {/* SECTION 1: PREFERENCES */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {t('settings', 'preferencesHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 16 }}>
          {/* Push Notifications Toggle */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Bell size={20} color={C.primaryLight} />
              <View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                  {t('settings', 'pushNotifTitle')}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
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
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Shield size={20} color={C.accent} />
              <View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                  {t('settings', 'eventRemindersTitle')}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
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
            paddingVertical: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Info size={20} color={C.success} />
              <View>
                <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                  {t('settings', 'emailUpdatesTitle')}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
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
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {t('settings', 'appearanceHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
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
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', fontFamily: lang === 'od' ? 'NotoSansOriya-Bold' : undefined }}>
                  {t('settings', `theme${opt.value.charAt(0).toUpperCase()}${opt.value.slice(1)}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SECTION 2: LANGUAGE */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {t('settings', 'languageHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* English language chip */}
            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              style={{
                flex: 1,
                backgroundColor: lang === 'en' ? C.primary + '15' : C.card,
                borderWidth: 2,
                borderColor: lang === 'en' ? C.primary : C.border,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 24 }}>🇬🇧</Text>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }}>English</Text>
              {/* Intentionally hardcoded, not t(): each chip labels itself in its own language */}
              <Text style={{ color: C.textMuted, fontSize: 11 }}>Active language</Text>
            </TouchableOpacity>

            {/* Odia language chip */}
            <TouchableOpacity
              onPress={() => handleLanguageChange('od')}
              style={{
                flex: 1,
                backgroundColor: lang === 'od' ? C.primary + '15' : C.card,
                borderWidth: 2,
                borderColor: lang === 'od' ? C.primary : C.border,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 24 }}>🇮🇳</Text>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '700', fontFamily: 'NotoSansOriya-Bold' }}>ଓଡ଼ିଆ</Text>
              <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'NotoSansOriya' }}>ସକ୍ରିୟ ଭାଷା</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 3: HELP & SUPPORT */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {t('settings', 'helpSupportHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 16 }}>
          {/* WhatsApp Support link */}
          <TouchableOpacity
            onPress={handleSupportPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: C.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <HelpCircle size={20} color={C.success} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                {t('settings', 'whatsappSupport')}
              </Text>
            </View>
            <ChevronRight size={18} color={C.textFaint} />
          </TouchableOpacity>

          {/* Privacy Policy */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Globe size={20} color={C.textMuted} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                {t('settings', 'privacyPolicy')}
              </Text>
            </View>
            <ChevronRight size={18} color={C.textFaint} />
          </View>

          {/* Terms of Service */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 14,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Info size={20} color={C.textMuted} />
              <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>
                {t('settings', 'termsOfService')}
              </Text>
            </View>
            <ChevronRight size={18} color={C.textFaint} />
          </View>
        </View>

        {/* SECTION 4: ACCOUNT */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {t('settings', 'accountHeader')}
          </Text>
        </View>

        <View style={{ backgroundColor: C.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border, paddingHorizontal: 16 }}>
          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogoutPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              backgroundColor: C.error + '10',
              borderRadius: 12,
              marginVertical: 12,
              borderWidth: 1,
              borderColor: C.error + '30',
              gap: 8,
            }}
          >
            <LogOut size={20} color={C.error} />
            <Text style={{ color: C.error, fontSize: 16, fontWeight: '700' }}>
              {t('settings', 'logoutButton')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version Info Footer */}
        <View style={{ alignItems: 'center', marginTop: 32, paddingHorizontal: 24 }}>
          <Text style={{ color: C.textFaint, fontSize: 12, textAlign: 'center' }}>
            Version 1.0.0 (Build 12)
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 11, textAlign: 'center', marginTop: 4, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
            {t('settings', 'footerName')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
