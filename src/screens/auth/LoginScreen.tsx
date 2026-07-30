// src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform,
  Alert, Image, Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Users } from 'lucide-react-native';
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

  const handleJoinWhatsappGroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = 'https://chat.whatsapp.com/BiBlBOpYMKi2qCSzkM4aPJ';
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

        {/* Join the community WhatsApp group — the single consolidated
            entry point for support, membership-no lookup, mobile updates,
            and new-member registration questions (all handled inside the
            group instead of separate 1:1 WhatsApp deep links). */}
        <TouchableOpacity
          onPress={handleJoinWhatsappGroup}
          className="flex-row items-center"
          style={{
            marginTop: spacing.xl,
            gap: spacing.md,
            borderRadius: radius.lg,
            padding: spacing.lg,
            borderWidth: 1,
            backgroundColor: colors.success + '15',
            borderColor: colors.success + '40',
            ...shadow.card,
          }}
        >
          <View
            className="items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.success + '25' }}
          >
            <Users size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontFamily: fontBold, ...typography.bodyEmphasis }}>
              {t('auth', 'joinGroupTitle')}
            </Text>
            <Text style={{ color: colors.success, fontFamily: fontBold, marginTop: 2, ...typography.caption, fontWeight: '700' }}>
              {t('auth', 'joinGroupSubtitle')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={{ color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl, fontFamily: fontRegular, ...typography.caption }}>
          {t('auth', 'termsFooter')}
        </Text>

        {/* Staff-only entry point — low visual weight, not a primary member action */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('AdminLogin');
          }}
          style={{ marginTop: spacing.lg, alignItems: 'center', paddingVertical: spacing.sm }}
        >
          <Text style={{ color: colors.textFaint, fontFamily: fontRegular, ...typography.caption }}>
            {t('admin', 'entryLinkLabel')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
