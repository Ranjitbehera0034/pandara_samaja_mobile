// src/screens/admin/AdminLoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../../components/common/Button';

export default function AdminLoginScreen() {
  const navigation = useNavigation<any>();
  const { adminLogin, adminRequestOtp, adminVerifyOtp } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Carried from step 1 into step 2
  const [pendingToken, setPendingToken] = useState('');
  const [mobile, setMobile] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');

  const isPasswordStepValid = username.trim().length > 0 && password.length > 0;
  const isOtpStepValid = otp.trim().length > 0;

  const handlePasswordSubmit = async () => {
    if (!username.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'usernameRequiredError'));
      return;
    }
    if (!password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'passwordRequiredError'));
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await adminLogin(username.trim(), password);
      setPendingToken(result.pendingToken);
      setMobile(result.mobile);
      setMaskedMobile(result.maskedMobile);
      await adminRequestOtp(result.pendingToken, result.mobile);
      setStep('otp');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('admin', 'loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('admin', 'otpRequiredError'));
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await adminVerifyOtp(pendingToken, otp.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // RootNavigator swaps to AdminStack automatically once isAdminAuthenticated flips true
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('admin', 'loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await adminRequestOtp(pendingToken, mobile);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('admin', 'otpSendError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'otp') {
      setStep('password');
      setOtp('');
      return;
    }
    navigation.goBack();
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
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={handleBack}
          style={{ position: 'absolute', top: insets.top + spacing.md, left: spacing.lg, padding: spacing.xs, zIndex: 1 }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
          <View
            style={{
              width: 72, height: 72, borderRadius: radius.xl, marginBottom: spacing.lg,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              ...shadow.raised,
            }}
          >
            <ShieldCheck size={32} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontFamily: fontBold, ...typography.title }}>
            {step === 'password' ? t('admin', 'loginTitle') : t('admin', 'otpTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs, fontFamily: fontRegular, ...typography.caption, textAlign: 'center' }}>
            {step === 'password' ? t('admin', 'loginSubtitle') : `${t('admin', 'otpSentTo')} ${maskedMobile}`}
          </Text>
        </View>

        <View style={{ borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, ...shadow.raised }}>
          {step === 'password' ? (
            <>
              <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.label }}>
                {t('admin', 'usernameLabel')}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderRadius: radius.md,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
                  backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily: fontRegular,
                  ...typography.body,
                }}
                placeholder={t('admin', 'usernamePlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.label }}>
                {t('admin', 'passwordLabel')}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderRadius: radius.md,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xl,
                  backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily: fontRegular,
                  ...typography.body,
                }}
                placeholder={t('admin', 'passwordPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <Button
                variant="primary"
                label={t('admin', 'loginButton')}
                onPress={handlePasswordSubmit}
                disabled={!isPasswordStepValid}
                loading={isLoading}
                haptics={false}
              />
            </>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, marginBottom: spacing.sm, fontFamily: fontRegular, ...typography.label }}>
                {t('admin', 'otpTitle')}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderRadius: radius.md,
                  paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.lg,
                  backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontFamily: fontRegular,
                  letterSpacing: 4, textAlign: 'center',
                  ...typography.body,
                }}
                placeholder={t('admin', 'otpPlaceholder')}
                placeholderTextColor={colors.textFaint}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />

              <Button
                variant="primary"
                label={t('admin', 'verifyButton')}
                onPress={handleOtpSubmit}
                disabled={!isOtpStepValid}
                loading={isLoading}
                haptics={false}
              />

              <TouchableOpacity onPress={handleResendOtp} disabled={isLoading} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.primary, fontFamily: fontRegular, ...typography.caption }}>
                  {t('admin', 'resendOtp')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
