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
  const { adminLogin } = useAdminAuth();
  const insets = useSafeAreaInsets();
  const { colors, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValid = username.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
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
      await adminLogin(username.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // RootNavigator swaps to AdminStack automatically once isAdminAuthenticated flips true
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), err.message || t('admin', 'loginError'));
    } finally {
      setIsLoading(false);
    }
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
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
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
            {t('admin', 'loginTitle')}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs, fontFamily: fontRegular, ...typography.caption }}>
            {t('admin', 'loginSubtitle')}
          </Text>
        </View>

        <View style={{ borderRadius: radius.lg, padding: spacing.xl, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, ...shadow.raised }}>
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
            onPress={handleLogin}
            disabled={!isValid}
            loading={isLoading}
            haptics={false}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
