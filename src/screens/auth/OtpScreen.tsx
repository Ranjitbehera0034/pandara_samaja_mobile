// src/screens/auth/OtpScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function OtpScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { verifyOtp, verifyFirebaseOtp } = useAuth();
  const { colors } = useTheme();
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
          paddingHorizontal: 24,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          className="mb-8 self-start py-2"
          disabled={isLoading}
        >
          <Text className="text-base font-semibold" style={{ color: colors.primaryLight, fontFamily: fontBold }}>
            {t('common', 'back')}
          </Text>
        </TouchableOpacity>

        <Text className="font-bold text-2xl mb-2" style={{ color: colors.text, fontFamily: fontBold }}>
          {t('auth', 'enterOtpTitle')}
        </Text>
        <Text className="text-sm mb-8" style={{ color: colors.textMuted, fontFamily: fontRegular }}>
          {t('auth', 'otpSentTo')} +91{mobile}
        </Text>

        {/* 6-digit OTP boxes */}
        <View className="flex-row gap-2.5 mb-8 justify-center">
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              style={{
                minHeight: 56,
                minWidth: 44,
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: digit ? colors.primary : colors.border,
              }}
              className="w-12 h-14 border rounded-xl text-center text-xl font-bold"
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
        <TouchableOpacity
          className="rounded-xl py-4 items-center mb-6"
          style={{
            backgroundColor: isLoading || otp.some(d => d === '') ? colors.border : colors.primary,
            opacity: isLoading || otp.some(d => d === '') ? 0.6 : 1,
          }}
          onPress={handleVerify}
          disabled={isLoading || otp.some(d => d === '')}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-bold text-base" style={{ color: 'white', fontFamily: fontBold }}>
              {t('auth', 'verifyButton')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <TouchableOpacity
          disabled={resendTimer > 0 || isLoading}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            navigation.goBack();
          }}
          className="py-2"
        >
          <Text
            className="text-center text-sm font-semibold"
            style={{ color: resendTimer > 0 ? colors.textFaint : colors.primaryLight, fontFamily: fontBold }}
          >
            {resendTimer > 0 ? `${t('auth', 'resendOtpIn')} ${resendTimer}s` : t('auth', 'resendOtp')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
