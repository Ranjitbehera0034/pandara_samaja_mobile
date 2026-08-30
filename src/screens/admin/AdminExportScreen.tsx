// src/screens/admin/AdminExportScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Award, Heart, Download, Wallet, FileArchive } from 'lucide-react-native';
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
  const [exporting, setExporting] = useState<ExportKind | 'expenses-csv' | 'expenses-zip' | null>(null);

  const [expenseMonths, setExpenseMonths] = useState<string[]>([]);
  const [selectedExpenseMonths, setSelectedExpenseMonths] = useState<string[]>([]);

  useEffect(() => {
    adminApi.fetchAdminMemberFilters()
      .then(res => { if (res.success) setOptions(res.filters); })
      .catch(e => console.error('[ADMIN_EXPORT] Failed to load filter options:', e));

    // Just need the distinct months list — a 1-row page is the cheapest way
    // to get it without a dedicated endpoint.
    adminApi.fetchAdminExpenses({ limit: 1 })
      .then(res => { if (res.success) setExpenseMonths(res.months || []); })
      .catch(e => console.error('[ADMIN_EXPORT] Failed to load expense months:', e));
  }, []);

  // 'YYYY-MM' -> 'Jul 2026'
  const formatMonthLabel = useCallback((month: string) => {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return month;
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }, []);

  const toggleExpenseMonth = (month: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedExpenseMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]);
  };

  const handleExportExpensesCsv = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting('expenses-csv');
    try {
      const csv = await adminApi.exportExpensesCsv(selectedExpenseMonths);
      const filename = 'expenses.csv';
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
      console.error('[ADMIN_EXPORT] Expenses CSV export failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common', 'errorTitle'), e.response?.data?.message || e.message || t('admin', 'exportError'));
    } finally {
      setExporting(null);
    }
  }, [selectedExpenseMonths, t]);

  const handleExportExpensesZip = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting('expenses-zip');
    try {
      const bytes = await adminApi.exportExpenseBillsZip(selectedExpenseMonths);
      const filename = 'expense-bills.zip';
      const file = new File(Paths.cache, filename);
      if (file.exists) file.delete();
      file.create();
      file.write(bytes);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/zip', dialogTitle: filename, UTI: 'public.zip-archive' });
      } else {
        Alert.alert(t('common', 'successTitle'), `${t('admin', 'exportSavedPrefix')} ${file.uri}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      console.error('[ADMIN_EXPORT] Expense bills ZIP export failed:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const status = e?.response?.status;
      const message = status === 404
        ? t('admin', 'exportBillsNoneFoundError')
        : (e.response?.data?.message || e.message || t('admin', 'exportError'));
      Alert.alert(t('common', 'errorTitle'), message);
    } finally {
      setExporting(null);
    }
  }, [selectedExpenseMonths, t]);

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

        <View style={{ height: spacing.xl, borderTopWidth: 1, borderTopColor: C.border, marginTop: spacing.md, marginBottom: spacing.lg }} />

        <Text style={{ color: C.text, fontFamily: fontBold, marginBottom: spacing.sm, ...typography.bodyEmphasis, fontWeight: '700' }}>
          {t('admin', 'exportExpensesSectionTitle')}
        </Text>
        <Text style={{ color: C.textFaint, marginBottom: spacing.lg, fontFamily: fontRegular, ...typography.caption }}>
          {t('admin', 'exportExpenseMonthsHint')}
        </Text>

        {expenseMonths.length > 0 && (
          <View style={{ marginBottom: spacing.lg }}>
            <Text style={{ color: C.textMuted, marginBottom: spacing.sm, fontFamily: fontBold, ...typography.label }}>
              {t('admin', 'exportExpenseMonthsLabel')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {expenseMonths.map(m => {
                const active = selectedExpenseMonths.includes(m);
                return (
                  <TouchableOpacity key={m} onPress={() => toggleExpenseMonth(m)} style={chipStyle(active)} className="border">
                    <Text style={chipTextStyle(active)}>{formatMonthLabel(m)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedExpenseMonths.length > 0 && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedExpenseMonths([]); }} style={{ marginTop: spacing.xs }}>
                <Text style={{ color: C.primary, fontFamily: fontBold, ...typography.caption, fontWeight: '700' }}>
                  {t('admin', 'exportClearMonthsLabel')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={handleExportExpensesCsv}
          disabled={exporting !== null}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card,
            borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg,
            marginBottom: spacing.md, opacity: exporting && exporting !== 'expenses-csv' ? 0.5 : 1, ...shadow.card,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} color={C.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis, fontWeight: '700' }}>{t('admin', 'exportExpensesTitle')}</Text>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{t('admin', 'exportExpensesDesc')}</Text>
          </View>
          {exporting === 'expenses-csv' ? <ActivityIndicator size="small" color={C.primary} /> : <Download size={18} color={C.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportExpensesZip}
          disabled={exporting !== null}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: C.card,
            borderColor: C.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg,
            marginBottom: spacing.md, opacity: exporting && exporting !== 'expenses-zip' ? 0.5 : 1, ...shadow.card,
          }}
        >
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <FileArchive size={20} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontFamily: fontBold, ...typography.bodyEmphasis, fontWeight: '700' }}>{t('admin', 'exportExpensesBillsTitle')}</Text>
            <Text style={{ color: C.textMuted, fontFamily: fontRegular, marginTop: 2, ...typography.caption }}>{t('admin', 'exportExpensesBillsDesc')}</Text>
          </View>
          {exporting === 'expenses-zip' ? <ActivityIndicator size="small" color={C.primary} /> : <Download size={18} color={C.primary} />}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
