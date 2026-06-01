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
import { C } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

  // Local state for settings toggles
  const [darkMode, setDarkMode] = useState(true);
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

  const handleLogoutPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      lang === 'od' ? 'ଲଗ୍ ଆଉଟ୍ ନିଶ୍ଚିତ କରନ୍ତୁ' : 'Confirm Logout',
      lang === 'od' 
        ? 'ଆପଣ ନିଶ୍ଚିତ ଭାବରେ ଲଗ୍ ଆଉଟ୍ କରିବାକୁ ଚାହୁଁଛନ୍ତି କି?' 
        : 'Are you sure you want to log out of your account?',
      [
        { text: lang === 'od' ? 'ବାତିଲ' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'od' ? 'ଲଗ୍ ଆଉଟ୍' : 'Logout',
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
      lang === 'od' ? 'ସହାୟତା' : 'WhatsApp Support',
      lang === 'od'
        ? 'ସହାୟତା ସେବା ଶୀଘ୍ର ଉପଲବ୍ଧ ହେବ।'
        : 'Connecting to WhatsApp Support... (+91 99999 99999)'
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
            {lang === 'od' ? '← ପଛକୁ' : '← Back'}
          </Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
          {lang === 'od' ? 'ସେଟିଂ' : 'Settings'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        stickyHeaderIndices={[0, 2, 4, 6]}
      >
        {/* SECTION 1: PREFERENCES */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {lang === 'od' ? 'ପସନ୍ଦ' : 'Preferences'}
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
                  {lang === 'od' ? 'ପୁସ୍ ବିଜ୍ଞପ୍ତି' : 'Push Notifications'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  {lang === 'od' ? 'ନୂଆ ପୋଷ୍ଟ ଓ ବାର୍ତ୍ତା ପାଇଁ ବିଜ୍ଞପ୍ତି' : 'Alerts for posts, likes & replies'}
                </Text>
              </View>
            </View>
            <Switch
              value={pushNotif}
              onValueChange={(val) => handleToggle(setPushNotif, val)}
              trackColor={{ false: '#475569', true: C.primary }}
              thumbColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
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
                  {lang === 'od' ? 'ଅନୁଷ୍ଠାନ ମନେପକାନ୍ତୁ' : 'Event Reminders'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  {lang === 'od' ? 'ଆଗାମୀ ସଭା ଓ ସାମାଜିକ ଅନୁଷ୍ଠାନ' : 'Notifications for upcoming events'}
                </Text>
              </View>
            </View>
            <Switch
              value={eventReminders}
              onValueChange={(val) => handleToggle(setEventReminders, val)}
              trackColor={{ false: '#475569', true: C.primary }}
              thumbColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
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
                  {lang === 'od' ? 'ଇମେଲ ଅପଡେଟ' : 'Email Updates'}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>
                  {lang === 'od' ? 'ମାସିକ ସମାଚାର ପତ୍ରିକା' : 'Monthly newsletters & summaries'}
                </Text>
              </View>
            </View>
            <Switch
              value={emailUpdates}
              onValueChange={(val) => handleToggle(setEmailUpdates, val)}
              trackColor={{ false: '#475569', true: C.primary }}
              thumbColor={Platform.OS === 'android' ? '#f8fafc' : undefined}
            />
          </View>
        </View>

        {/* SECTION 2: LANGUAGE */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {lang === 'od' ? 'ଭାଷା' : 'Language'}
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
            {lang === 'od' ? 'ସହାୟତା' : 'Help & Support'}
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
                {lang === 'od' ? 'ହ୍ଵାଟସ୍‌ଆପ୍ ସହାୟତା' : 'WhatsApp Support'}
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
                {lang === 'od' ? 'ଗୋପନୀୟତା ନୀତି' : 'Privacy Policy'}
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
                {lang === 'od' ? 'ସେବା ସର୍ତ୍ତାବଳୀ' : 'Terms of Service'}
              </Text>
            </View>
            <ChevronRight size={18} color={C.textFaint} />
          </View>
        </View>

        {/* SECTION 4: ACCOUNT */}
        <View style={{ backgroundColor: C.bg, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {lang === 'od' ? 'ଖାତା' : 'Account'}
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
              {lang === 'od' ? 'ଲଗ୍ ଆଉଟ୍ କରନ୍ତୁ' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version Info Footer */}
        <View style={{ alignItems: 'center', marginTop: 32, paddingHorizontal: 24 }}>
          <Text style={{ color: C.textFaint, fontSize: 12, textAlign: 'center' }}>
            Version 1.0.0 (Build 12)
          </Text>
          <Text style={{ color: C.textFaint, fontSize: 11, textAlign: 'center', marginTop: 4, fontFamily: lang === 'od' ? 'NotoSansOriya' : undefined }}>
            {lang === 'od' ? 'ନିଖିଳ ଓଡ଼ିଶା ପଣ୍ଡାର ସମାଜ' : 'Nikhila Odisha Pandara Samaja'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
