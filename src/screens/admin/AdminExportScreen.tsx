// src/screens/admin/AdminExportScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Award, Heart, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as adminApi from '../../api/admin';
import { AdminMemberFilterOptions, ExportKind } from '../../api/admin';
import { useTheme } from '../../theme/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminExportScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors: C, spacing, radius, typography, shadow } = useTheme();
  const { lang, t } = useLanguage();
  const fontRegular = lang === 'od' ? 'NotoSansOriya' : undefined;
  const fontBold = lang === 'od' ? 'NotoSansOriya-Bold' : undefined;

  const [options, setOptions] = useState<AdminMemberFilterOptions>({ districts: [], talukas: {}, panchayats: {}, villages: {} });
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [panchayat, setPanchayat] = useState('');
  const [village, setVillage] = useState('');
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  useEffect(() => {
    adminApi.fetchAdminMemberFilters()
      .then(res => { if (res.success) setOptions(res.filters); })
      .catch(e => console.error('[ADMIN_EXPORT] Failed to load filter options:', e));
  }, []);

  const talukas = district ? (options.talukas?.[district] || []) : [];
  const panchayats = taluka ? (options.panchayats?.[taluka] || []) : [];
  const villages = panchayat ? (options.villages?.[panchayat] || []) : [];

  const handleExport = useCallback(async (kind: ExportKind, filename: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(kind);
    try {
      const csv = await adminApi.exportData(kind, { district, taluka, panchayat, village });
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename, UTI: 'public.comma-separated-values-text' });
      } else {
        Alert.alert(t('common', 'successTitle'), `${t('admin', 'exportSavedPrefix')} ${file.uri}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error(`[ADMIN_EXPORT] ${kind} export failed:`, e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'exportError'));
    } finally {
      setExporting(null);
    }
  }, [district, taluka, panchayat, village, t]);

  const chipStyle = (active: boolean) => ({
    backgroundColor: active ? C.primary : C.card, borderColor: active ? C.primary : C.border,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    marginRight: spacing.sm, marginBottom: spacing.sm,
  });
  const chipTextStyle = (active: boolean) => ({
    color: active ? '#fff' : C.textMuted, fontFamily: fontBold, ...typography.caption, fontWeight: '700' as const,
  });

  const FilterRow = ({ label, options: opts, value, onSelect }: { label: string; options: string[]; value: string; onSelect: (v: string) => void }) => (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(''); }} style={chipStyle(!value)} className="border">
          <Text style={chipTextStyle(!value)}>{t('admin', 'exportAllLabel')}</Text>
        </TouchableOpacity>
        {opts.sort().map(o => (
          <TouchableOpacity key={o} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(o); }} style={chipStyle(value === o)} className="border">
            <Text style={chipTextStyle(value === o)}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const ExportCard = ({ kind, filename, icon, title, desc }: { kind: ExportKind; filename: string; icon: React.ReactNode; title: string; desc: string }) => (
    <TouchableOpacity
      onPress={() => handleExport(kind, filename)}
      disabled={exporting !== null}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card,
        borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg,
        marginBottom: spacing.md, opacity: exporting && exporting !== kind ? 0.5 : 1, ...shadow.card,
      }}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{desc}</Text>
      </View>
      {exporting === kind ? <ActivityIndicator size="small" color={C.primary} /> : <Download size={18} color={C.primary} />}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={{ padding: spacing.xs, borderRadius: radius.full, backgroundColor: C.card }}>
          <ArrowLeft size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontFamily: fontBold, ...typography.heading }}>{t('admin', 'exportTitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={{ color: C.textFaint, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
          {t('admin', 'exportFilterHint')}
        </Text>

        <FilterRow label={t('admin', 'exportDistrictLabel')} options={options.districts || []} value={district} onSelect={(v) => { setDistrict(v); setTaluka(''); setPanchayat(''); setVillage(''); }} />
        {district && talukas.length > 0 && (
          <FilterRow label={t('admin', 'exportTalukaLabel')} options={talukas} value={taluka} onSelect={(v) => { setTaluka(v); setPanchayat(''); setVillage(''); }} />
        )}
        {taluka && panchayats.length > 0 && (
          <FilterRow label={t('admin', 'exportPanchayatLabel')} options={panchayats} value={panchayat} onSelect={(v) => { setPanchayat(v); setVillage(''); }} />
        )}
        {panchayat && villages.length > 0 && (
          <FilterRow label={t('admin', 'exportVillageLabel')} options={villages} value={village} onSelect={setVillage} />
        )}

        <View style={{ height: spacing.md }} />

        <ExportCard
          kind="members"
          filename="members.csv"
          icon={<Users size={20} color={C.primary} />}
          title={t('admin', 'exportMembersTitle')}
          desc={t('admin', 'exportMembersDesc')}
        />
        <ExportCard
          kind="leaders"
          filename="leaders.csv"
          icon={<Award size={20} color={C.warning} />}
          title={t('admin', 'exportLeadersTitle')}
          desc={t('admin', 'exportLeadersDesc')}
        />
        <ExportCard
          kind="matrimony"
          filename="matrimony_candidates.csv"
          icon={<Heart size={20} color={C.female} />}
          title={t('admin', 'exportMatrimonyTitle')}
          desc={t('admin', 'exportMatrimonyDesc')}
        />
      </ScrollView>
    </View>
  );
}
