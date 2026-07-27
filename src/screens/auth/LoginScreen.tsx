// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Image, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { AuthStackParams } from '../../navigation/AuthStack';
import { APP_NAME, APP_TAGLINE } from '../../config/constants';

type Nav = StackNavigationProp<AuthStackParams, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [membershipNo, setMembershipNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValid = membershipNo.trim().length > 0 && mobile.replace(/\D/g, '').length === 10;

  const handleMobileChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    setMobile(clean);
    if (clean.length === 10) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (clean.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSendOtp = async () => {
    if (!membershipNo.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('auth', 'membershipRequiredError'));
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('auth', 'mobileRequiredError'));
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Calls credential lookup + WebView Firebase verification or dev bypass
      const result = await requestOtp(membershipNo.trim(), mobile);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Otp', {
        membershipNo: membershipNo.trim(),
        mobile: mobile.replace(/\D/g, ''),
        useFirebase: result.useFirebase,
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('auth', 'sendOtpError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetMembershipNo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://wa.me/918249339238?text=Hello%20Pandara%20Samaja%20Support%2C%20I%20do%20not%20have%20my%20Membership%20Number.%20Please%20help%20me%20find%20it.%20My%20name%20is%3A%20';
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common', 'errorTitle'), t('auth', 'whatsappNotInstalled'));
    });
  };

  const handleUpdateMobile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://wa.me/918249339238?text=Hello%20Pandara%20Samaja%20Support%2C%20I%20need%20to%20update%20my%2520registered%2520mobile%2520number.%20My%20Membership%20No%20is%3A%20' + encodeURIComponent(membershipNo);
    Linking.openURL(url).catch(() => {
      Alert.alert(t('common', 'errorTitle'), t('auth', 'whatsappNotInstalled'));
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center mb-10">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-4 border shadow-2xl overflow-hidden"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
          </View>
          <Text className="font-bold text-2xl text-center" style={{ color: colors.text }}>{APP_NAME}</Text>
          <Text className="text-xs tracking-widest mt-1" style={{ color: colors.textMuted }}>{APP_TAGLINE}</Text>
        </View>

        {/* Card */}
        <View className="rounded-2xl p-6 border shadow-xl" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
          <Text className="font-semibold text-lg mb-6" style={{ color: colors.text, fontFamily: fontBold }}>
            {t('auth', 'memberLoginTitle')}
          </Text>

          {/* Membership No */}
          <Text className="text-sm mb-2" style={{ color: colors.textMuted, fontFamily: fontRegular }}>
            {t('auth', 'membershipNumberLabel')}
          </Text>
          <TextInput
            className="border rounded-xl px-4 py-3 mb-4 text-base"
            style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily: fontRegular }}
            placeholder={t('auth', 'membershipPlaceholder')}
            placeholderTextColor={colors.textFaint}
            value={membershipNo}
            onChangeText={(text) => {
              setMembershipNo(text);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isLoading}
          />

          {/* Mobile */}
          <Text className="text-sm mb-2" style={{ color: colors.textMuted, fontFamily: fontRegular }}>
            {t('auth', 'mobileNumberLabel')}
          </Text>
          <View
            className="flex-row items-center border rounded-xl px-4 py-3 mb-6"
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
          >
            <Text className="mr-2 font-medium" style={{ color: colors.textMuted }}>+91</Text>
            <TextInput
              className="flex-1 text-base"
              style={{ color: colors.text, fontFamily: fontRegular }}
              placeholder={t('auth', 'mobilePlaceholder')}
              placeholderTextColor={colors.textFaint}
              value={mobile}
              onChangeText={handleMobileChange}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isLoading}
            />
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: !isValid || isLoading ? colors.border : colors.primary,
              opacity: !isValid || isLoading ? 0.6 : 1,
            }}
            onPress={handleSendOtp}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="font-bold text-base" style={{ color: 'white', fontFamily: fontBold }}>
                {t('auth', 'sendOtpButton')}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* WhatsApp Help & Support Card */}
        <View className="mt-6 rounded-2xl p-5 border" style={{ backgroundColor: colors.card + '40', borderColor: colors.border + '40' }}>
          <Text className="font-bold text-sm mb-3" style={{ color: colors.text, fontFamily: fontBold }}>
            {t('auth', 'helpSupportTitle')}
          </Text>

          {/* Find Membership No */}
          <TouchableOpacity
            onPress={handleGetMembershipNo}
            className="flex-row items-center justify-between py-3 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-xs font-semibold" style={{ color: colors.textMuted, fontFamily: fontRegular }}>
              {t('auth', 'noMembershipNo')}
            </Text>
            <Text className="text-xs font-bold" style={{ color: colors.primaryLight, fontFamily: fontBold }}>
              {t('auth', 'getOnWhatsapp')}
            </Text>
          </TouchableOpacity>

          {/* Update Mobile Number */}
          <TouchableOpacity
            onPress={handleUpdateMobile}
            className="flex-row items-center justify-between py-3"
          >
            <Text className="text-xs font-semibold" style={{ color: colors.textMuted, fontFamily: fontRegular }}>
              {t('auth', 'updateMobileNo')}
            </Text>
            <Text className="text-xs font-bold" style={{ color: colors.primaryLight, fontFamily: fontBold }}>
              {t('auth', 'updateOnWhatsapp')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text className="text-xs text-center mt-6" style={{ color: colors.textFaint, fontFamily: fontRegular }}>
          {t('auth', 'termsFooter')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
