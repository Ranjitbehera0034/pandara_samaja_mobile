// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  Alert, Image, Linking
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
import Button from '../../components/common/Button';

type Nav = StackNavigationProp<AuthStackParams, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { requestOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadow } = useTheme();
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
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View className="items-center" style={{ marginBottom: spacing.xxl }}>
          <View
            className="items-center justify-center overflow-hidden"
            style={{
              width: 96, height: 96, borderRadius: radius.xl,
              marginBottom: spacing.lg, borderWidth: 1,
              backgroundColor: colors.card, borderColor: colors.border,
              ...shadow.raised,
            }}
          >
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
            />
          </View>
          <Text style={{ color: colors.text, textAlign: 'center', fontFamily: fontBold, ...typography.display }}>{APP_NAME}</Text>
          <Text className="tracking-widest" style={{ color: colors.textMuted, marginTop: spacing.xs, ...typography.caption }}>{APP_TAGLINE}</Text>
        </View>

        {/* Card */}
        <View style={{ borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, ...shadow.raised }}>
          <Text style={{ color: colors.text, fontFamily: fontBold, marginBottom: spacing.xl, ...typography.title }}>
            {t('auth', 'memberLoginTitle')}
          </Text>

          {/* Membership No */}
          <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.label }}>
            {t('auth', 'membershipNumberLabel')}
          </Text>
          <TextInput
            style={{
              borderWidth: 1, borderRadius: radius.md,
              paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
              backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily: fontRegular,
              ...typography.body,
            }}
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
          <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.label }}>
            {t('auth', 'mobileNumberLabel')}
          </Text>
          <View
            className="flex-row items-center"
            style={{
              borderWidth: 1, borderRadius: radius.md,
              paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xl,
              backgroundColor: colors.bg, borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, marginRight: spacing.sm, ...typography.body, fontWeight: '500' }}>+91</Text>
            <TextInput
              style={{ flex: 1, color: colors.text, fontFamily: fontRegular, ...typography.body }}
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
          <Button
            variant="primary"
            label={t('auth', 'sendOtpButton')}
            onPress={handleSendOtp}
            disabled={!isValid}
            loading={isLoading}
            haptics={false}
          />
        </View>

        {/* WhatsApp Help & Support Card */}
        <View style={{ marginTop: spacing.xl, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, backgroundColor: colors.card + '40', borderColor: colors.border + '40' }}>
          <Text style={{ color: colors.text, fontFamily: fontBold, marginBottom: spacing.md, ...typography.bodyEmphasis }}>
            {t('auth', 'helpSupportTitle')}
          </Text>

          {/* Find Membership No */}
          <TouchableOpacity
            onPress={handleGetMembershipNo}
            className="flex-row items-center justify-between border-b"
            style={{ paddingVertical: spacing.md, borderBottomColor: colors.border }}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fontRegular, ...typography.caption }}>
              {t('auth', 'noMembershipNo')}
            </Text>
            <Text style={{ color: colors.primaryLight, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
              {t('auth', 'getOnWhatsapp')}
            </Text>
          </TouchableOpacity>

          {/* Update Mobile Number */}
          <TouchableOpacity
            onPress={handleUpdateMobile}
            className="flex-row items-center justify-between"
            style={{ paddingVertical: spacing.md }}
          >
            <Text style={{ color: colors.textMuted, fontFamily: fontRegular, ...typography.caption }}>
              {t('auth', 'updateMobileNo')}
            </Text>
            <Text style={{ color: colors.primaryLight, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
              {t('auth', 'updateOnWhatsapp')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl, fontFamily: fontRegular, ...typography.caption }}>
          {t('auth', 'termsFooter')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
