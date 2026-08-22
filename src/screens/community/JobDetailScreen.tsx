// src/screens/community/JobDetailScreen.tsx
// Full posting detail. "Apply" always hands off outside the app via
// application_info (a link or instructions) — there's no in-app
// application tracking. contact_phone is the submitter's own
// accountability number, shown separately so applicants know who posted
// it. Members can report a suspicious listing, which auto-hides it
// pending admin review.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, MapPin, Clock, ExternalLink, Phone, Flag } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as jobsApi from '../../api/jobs';
import { JobPosting } from '../../api/jobs';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function JobDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await jobsApi.fetchJobById(id);
      if (data.success) setJob(data.job);
    } catch (e) {
      console.error('[JOB_DETAIL] Fetch failed:', e);
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'detailLoadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { load(); }, [load]);

  const looksLikeUrl = (s: string) => /^https?:\/\//i.test(s.trim());

  const openApplicationInfo = () => {
    if (!job) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (looksLikeUrl(job.application_info)) {
      Linking.openURL(job.application_info.trim()).catch(() => {
        Alert.alert(t('common', 'errorTitle'), t('jobs', 'openLinkError'));
      });
    } else {
      Alert.alert(t('jobs', 'howToApplyTitle'), job.application_info);
    }
  };

  const callContact = () => {
    if (!job?.contact_phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`tel:${job.contact_phone}`).catch(() => {});
  };

  const doReport = async () => {
    setReporting(true);
    try {
      const data = await jobsApi.reportJob(id);
      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('jobs', 'reportedTitle'), t('jobs', 'reportedMessage'));
        navigation.goBack();
      }
    } catch (e) {
      console.error('[JOB_DETAIL] Report failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), t('jobs', 'reportError'));
    } finally {
      setReporting(false);
    }
  };

  const handleReport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('jobs', 'confirmReportTitle'),
      t('jobs', 'confirmReportMessage'),
      [
        { text: t('common', 'cancel'), style: 'cancel' },
        { text: t('jobs', 'reportButton'), style: 'destructive', onPress: doReport },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, flex: 1, ...typography.heading }}>{t('jobs', 'detailTitle')}</Text>
        {!!job && (
          <TouchableOpacity onPress={handleReport} disabled={reporting} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
            {reporting ? <ActivityIndicator size="small" color={C.error} /> : <Flag size={18} color={C.error} />}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !job ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Text style={{ color: C.textMuted, textAlign: 'center', ...typography.body }}>{t('jobs', 'notFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          <Text style={{
            alignSelf: 'flex-start',
            color: job.category === 'govt' ? C.primary : C.textMuted,
            backgroundColor: (job.category === 'govt' ? C.primary : C.textMuted) + '15',
            borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4,
            ...typography.caption, fontWeight: '700',
          }}>
            {job.category === 'govt' ? t('jobs', 'categoryGovt') : t('jobs', 'categoryPrivate')}
          </Text>

          <Text style={{ color: C.text, fontFamily: fontBold, marginTop: spacing.md, ...typography.display }}>{job.title}</Text>
          <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.bodyEmphasis }}>{job.organization}</Text>

          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
            {!!job.location && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} color={C.textFaint} />
                <Text style={{ color: C.textFaint, ...typography.caption }}>{job.location}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color={C.textFaint} />
              <Text style={{ color: C.textFaint, ...typography.caption }}>{new Date(job.created_at).toLocaleDateString()}</Text>
            </View>
          </View>

          <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xl, ...typography.body, lineHeight: 22 }}>
            {job.description}
          </Text>

          <View style={{ backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, ...shadow.card }}>
            <Text style={{ color: C.textMuted, ...typography.label }}>{t('jobs', 'howToApplyLabel')}</Text>
            <Text style={{ color: C.text, fontFamily: fontRegular, marginTop: spacing.xs, ...typography.body }}>{job.application_info}</Text>

            {!!job.contact_phone && (
              <TouchableOpacity onPress={callContact} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md }}>
                <Phone size={14} color={C.primary} />
                <Text style={{ color: C.primary, ...typography.caption, fontWeight: '700' }}>{job.contact_phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={openApplicationInfo}
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
              backgroundColor: C.primary, borderRadius: radius.md, paddingVertical: spacing.md, marginTop: spacing.lg,
            }}
          >
            <ExternalLink size={16} color="#fff" />
            <Text style={{ color: '#fff', ...typography.bodyEmphasis, fontWeight: '700' }}>{t('jobs', 'applyButton')}</Text>
          </TouchableOpacity>

          <Text style={{ color: C.textFaint, textAlign: 'center', marginTop: spacing.md, ...typography.caption }}>
            {t('jobs', 'disclaimerText')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
