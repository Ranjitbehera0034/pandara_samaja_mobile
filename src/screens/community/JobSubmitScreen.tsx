// src/screens/community/JobSubmitScreen.tsx
// Member submission form for the job board — goes into the pending review
// queue, never visible until an admin approves it (see AdminJobSubmissionsScreen).
// contactPhone is required: the submitter's own accountability number, not
// the application contact — lets admin call to verify before approving and
// tells applicants who actually posted the listing.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as jobsApi from '../../api/jobs';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function JobSubmitScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [category, setCategory] = useState<'govt' | 'private'>('private');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [applicationInfo, setApplicationInfo] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  } as const;

  const handleSubmit = async () => {
    if (!title.trim() || !organization.trim() || !description.trim() || !applicationInfo.trim() || !contactPhone.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'submitRequiredError'));
      return;
    }
    setSaving(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await jobsApi.submitJob({
        title: title.trim(),
        organization: organization.trim(),
        category,
        description: description.trim(),
        location: location.trim() || undefined,
        applicationInfo: applicationInfo.trim(),
        contactPhone: contactPhone.trim(),
      });
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('jobs', 'submittedTitle'), t('jobs', 'submittedMessage'), [
          { text: t('common', 'ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(t('jobs', 'submitError'));
      }
    } catch (e: any) {
      console.error('[JOB_SUBMIT] Submit failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.message || t('jobs', 'submitError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('jobs', 'submitTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: C.textMuted, marginBottom: spacing.lg, ...typography.caption }}>{t('jobs', 'submitHelperText')}</Text>

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'jobTitleLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('jobs', 'jobTitlePlaceholder')} placeholderTextColor={C.textFaint} value={title} onChangeText={setTitle} />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'organizationLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('jobs', 'organizationPlaceholder')} placeholderTextColor={C.textFaint} value={organization} onChangeText={setOrganization} />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'categoryLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {(['private', 'govt'] as const).map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(c); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: category === c ? C.primary : C.border,
                  backgroundColor: category === c ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: category === c ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                  {c === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'descriptionLabel')}</Text>
          <TextInput
            style={{ ...inputStyle, minHeight: 100, textAlignVertical: 'top' }}
            placeholder={t('jobs', 'descriptionPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'locationLabel')}</Text>
          <TextInput style={inputStyle} placeholder={t('jobs', 'locationPlaceholder')} placeholderTextColor={C.textFaint} value={location} onChangeText={setLocation} />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'applicationInfoLabel')}</Text>
          <TextInput
            style={{ ...inputStyle, minHeight: 70, textAlignVertical: 'top' }}
            placeholder={t('jobs', 'applicationInfoPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={applicationInfo}
            onChangeText={setApplicationInfo}
            multiline
          />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('jobs', 'contactPhoneLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={t('jobs', 'contactPhonePlaceholder')}
            placeholderTextColor={C.textFaint}
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
          <Text style={{ color: C.textFaint, marginTop: -spacing.sm, marginBottom: spacing.lg, ...typography.caption }}>
            {t('jobs', 'contactPhoneHelperText')}
          </Text>

          <Button variant="primary" label={t('jobs', 'submitButton')} onPress={handleSubmit} loading={saving} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
