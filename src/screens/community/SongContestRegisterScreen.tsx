// src/screens/community/SongContestRegisterScreen.tsx
// Register for the song competition — solo or as a group — and upload a
// performance video. One submission per person; a group entry additionally
// needs a village (server-enforced: one group per village per contest).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Video as VideoIcon, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as songContestApi from '../../api/songContest';
import { compressVideo } from '../../utils/videoCompression';
import { deleteTempFile } from '../../utils/tempFiles';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function SongContestRegisterScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { contestId } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [entryType, setEntryType] = useState<'individual' | 'group'>('individual');
  const [entryName, setEntryName] = useState('');
  const [village, setVillage] = useState('');
  const [participantNames, setParticipantNames] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inputStyle = {
    borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    marginBottom: spacing.lg, backgroundColor: C.card, borderColor: C.border, color: C.text,
    fontFamily: fontRegular, ...typography.body,
  } as const;

  const pickVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!entryName.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('songContest', 'entryNameRequiredError'));
      return;
    }
    if (entryType === 'group' && !village.trim()) {
      Alert.alert(t('common', 'errorTitle'), t('songContest', 'villageRequiredError'));
      return;
    }
    if (!videoUri) {
      Alert.alert(t('common', 'errorTitle'), t('songContest', 'videoRequiredError'));
      return;
    }

    setSubmitting(true);
    let compressedUri: string | null = null;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      compressedUri = await compressVideo(videoUri);

      const formData = new FormData();
      formData.append('entryType', entryType);
      formData.append('entryName', entryName.trim());
      if (village.trim()) formData.append('village', village.trim());
      if (entryType === 'group' && participantNames.trim()) {
        formData.append('participantNames', participantNames.trim());
      }
      const uriParts = compressedUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      // @ts-ignore — RN's FormData file shape, matches CreatePost.tsx's pattern
      formData.append('video', { uri: compressedUri, name: fileName, type: 'video/mp4' });

      const data = await songContestApi.submitEntry(contestId, formData);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('songContest', 'submitSuccessTitle'), t('songContest', 'submitSuccessMessage'), [
          { text: t('common', 'ok'), onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(data.message || t('songContest', 'submitErrorGeneric'));
      }
    } catch (e: any) {
      console.error('[SONG_CONTEST_REGISTER] Submit failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e?.response?.data?.message || e.message || t('songContest', 'submitErrorGeneric'));
    } finally {
      if (compressedUri && compressedUri !== videoUri) deleteTempFile(compressedUri);
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
            <ArrowLeft size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('songContest', 'registerTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('songContest', 'entryTypeLabel')}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
            {(['individual', 'group'] as const).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEntryType(type); }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md,
                  borderWidth: 1, borderColor: entryType === type ? C.primary : C.border,
                  backgroundColor: entryType === type ? C.primary + '15' : C.card,
                }}
              >
                <Text style={{ color: entryType === type ? C.primary : C.textMuted, ...typography.body, fontWeight: '700' }}>
                  {type === 'individual' ? t('songContest', 'entryTypeIndividual') : t('songContest', 'entryTypeGroup')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('songContest', 'entryNameLabel')}</Text>
          <TextInput
            style={inputStyle}
            placeholder={entryType === 'group' ? t('songContest', 'entryNameGroupPlaceholder') : t('songContest', 'entryNameIndividualPlaceholder')}
            placeholderTextColor={C.textFaint}
            value={entryName}
            onChangeText={setEntryName}
          />

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>
            {t('songContest', entryType === 'group' ? 'villageLabel' : 'villageLabelOptional')}
          </Text>
          <TextInput
            style={inputStyle}
            placeholder={t('songContest', 'villagePlaceholder')}
            placeholderTextColor={C.textFaint}
            value={village}
            onChangeText={setVillage}
          />

          {entryType === 'group' && (
            <>
              <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('songContest', 'participantNamesLabel')}</Text>
              <TextInput
                style={{ ...inputStyle, minHeight: 90, textAlignVertical: 'top' }}
                placeholder={t('songContest', 'participantNamesPlaceholder')}
                placeholderTextColor={C.textFaint}
                value={participantNames}
                onChangeText={setParticipantNames}
                multiline
              />
            </>
          )}

          <Text style={{ color: C.textMuted, marginBottom: spacing.sm, ...typography.label }}>{t('songContest', 'pickVideoLabel')}</Text>
          <TouchableOpacity
            onPress={pickVideo}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              borderWidth: 1, borderColor: videoUri ? C.success : C.border, borderStyle: 'dashed',
              borderRadius: radius.md, paddingVertical: spacing.lg, marginBottom: spacing.xl,
              backgroundColor: videoUri ? C.success + '10' : C.card,
            }}
          >
            {videoUri ? <CheckCircle2 size={18} color={C.success} /> : <VideoIcon size={18} color={C.textMuted} />}
            <Text style={{ color: videoUri ? C.success : C.textMuted, ...typography.bodyEmphasis, fontWeight: '700' }}>
              {videoUri ? t('songContest', 'changeVideoButton') : t('songContest', 'pickVideoButton')}
            </Text>
          </TouchableOpacity>

          {submitting && (
            <Text style={{ color: C.textFaint, textAlign: 'center', marginBottom: spacing.md, ...typography.caption }}>
              {t('songContest', 'uploadingMessage')}
            </Text>
          )}

          <Button variant="primary" label={t('songContest', 'submitEntryButton')} onPress={handleSubmit} loading={submitting} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
