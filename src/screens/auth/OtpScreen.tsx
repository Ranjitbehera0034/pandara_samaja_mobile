// src/screens/auth/OtpScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../../components/common/Button';

export default function OtpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { verifyOtp, verifyFirebaseOtp } = useAuth();
  const { colors, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const { membershipNo, mobile, useFirebase } = route.params as any;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer === 0) return;
    const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleOtpChange = (text: string, index: number) => {
    const cleanedText = text.replace(/\D/g, '');

    // Handle paste
    if (cleanedText.length === 6) {
      const digits = cleanedText.split('').slice(0, 6);
      setOtp(digits);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      inputs.current[5]?.focus();
      handleVerifyWithDigits(digits);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleanedText.slice(-1); // only last char
    setOtp(newOtp);

    // Auto-advance
    if (cleanedText && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto-trigger verify when all filled
    if (newOtp.every(d => d !== '') && cleanedText) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleVerifyWithDigits(newOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!otp[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyWithDigits = async (digitsArray: string[]) => {
    const otpString = digitsArray.join('');
    if (otpString.length !== 6) return;

    setIsLoading(true);
    try {
      if (useFirebase) {
        await verifyFirebaseOtp(membershipNo, mobile, otpString);
      } else {
        await verifyOtp(membershipNo, mobile, otpString);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('auth', 'invalidOtpError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = () => {
    handleVerifyWithDigits(otp);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          className="self-start"
          style={{ marginBottom: spacing.xxl, paddingVertical: spacing.sm }}
          disabled={isLoading}
        >
          <Text style={{ color: colors.primaryLight, fontFamily: fontBold, ...typography.label }}>
            {t('common', 'back')}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: colors.text, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.heading }}>
          {t('auth', 'enterOtpTitle')}
        </Text>
        <Text style={{ color: colors.textMuted, marginBottom: spacing.xxl, fontFamily: fontRegular, ...typography.body }}>
          {t('auth', 'otpSentTo')} +91{mobile}
        </Text>

        {/* 6-digit OTP boxes */}
        <View className="flex-row justify-center" style={{ gap: spacing.sm + 2, marginBottom: spacing.xxl }}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={{
                minHeight: 56,
                minWidth: 44,
                width: 48,
                height: 56,
                borderWidth: 1,
                borderRadius: radius.md,
                textAlign: 'center',
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: digit ? colors.primary : colors.border,
                ...typography.heading,
              }}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={6} // Allow paste lengths
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        {/* Verify Button */}
        <View style={{ marginBottom: spacing.xl }}>
          <Button
            variant="primary"
            label={t('auth', 'verifyButton')}
            onPress={handleVerify}
            disabled={otp.some(d => d === '')}
            loading={isLoading}
            haptics={false}
          />
        </View>

        {/* Resend */}
        <TouchableOpacity
          disabled={resendTimer > 0 || isLoading}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            navigation.goBack();
          }}
          style={{ paddingVertical: spacing.sm }}
        >
          <Text
            style={{ textAlign: 'center', color: resendTimer > 0 ? colors.textFaint : colors.primaryLight, fontFamily: fontBold, ...typography.bodyEmphasis }}
          >
            {resendTimer > 0 ? `${t('auth', 'resendOtpIn')} ${resendTimer}s` : t('auth', 'resendOtp')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
